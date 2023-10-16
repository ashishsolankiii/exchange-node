import mongoose from "mongoose";
import { getTrimmedUser } from "../../../lib/io-guards/auth.js";
import Bet, { BET_ORDER_STATUS, BET_RESULT_STATUS } from "../../../models/v1/Bet.js";
import { BET_CATEGORIES } from "../../../models/v1/BetCategory.js";
import Event from "../../../models/v1/Event.js";
import Market from "../../../models/v1/Market.js";
import MarketRunner from "../../../models/v1/MarketRunner.js";
import User, { USER_ROLE } from "../../../models/v1/User.js";
import { io } from "../../../socket/index.js";
import betPlService from "./betPlService.js";
import runningBetService from "./runningBetService.js";

// Updates userPl and balance of all parents upto SUPER_ADMIN
const updateParentPls = async (userId, userPl) => {
  const user = await User.findById(userId);

  if (!(user && user.role !== USER_ROLE.SYSTEM_OWNER)) {
    return;
  }

  const promises = [];

  let iterationCount = 0;
  const maxIterationCount = Object.keys(USER_ROLE).length - 1; // Don't include SYSTEM_OWNER

  let currentParent = await User.findById(user.parentId);

  while (iterationCount < maxIterationCount && currentParent && currentParent.role !== USER_ROLE.SYSTEM_OWNER) {
    currentParent.userPl += Number(userPl);
    currentParent.balance += Number(userPl);

    promises.push(currentParent.save());

    currentParent = await User.findById(currentParent.parentId);
    iterationCount++;
  }

  if (promises.length) {
    const users = await Promise.all(promises);

    users.forEach((user) => {
      const trimmedUser = getTrimmedUser(user);
      io.user.emit(`user:${user._id}`, trimmedUser);
    });
  }
};

const emitResultNotification = async ({ eventId }) => {
  const event = await Event.findById(eventId);

  const notification = {
    _id: event._id,
    name: event.name,
    matchDateTime: event.matchDate,
  };

  io.eventNotification.to("event:notification").emit("event:complete", notification);
};

// Check if all markets of an event are completed
const completeEvent = async ({ market }) => {
  const eventMarkets = await Market.aggregate([
    {
      $match: {
        eventId: new mongoose.Types.ObjectId(market.eventId),
      },
    },
    {
      $lookup: {
        from: "bet_categories",
        localField: "typeId",
        foreignField: "_id",
        as: "type",
        pipeline: [
          {
            $project: { name: 1 },
          },
        ],
      },
    },
    {
      $unwind: "$type",
    },
  ]);

  let hasOpenMarkets = false;
  for (const eventMarket of eventMarkets) {
    if (
      [BET_CATEGORIES.MATCH_ODDS, BET_CATEGORIES.BOOKMAKER].includes(eventMarket.type.name) &&
      !eventMarket.winnerRunnerId
    ) {
      hasOpenMarkets = true;
      break;
    }

    if ([BET_CATEGORIES.FANCY, BET_CATEGORIES.FANCY1].includes(eventMarket.type.name) && !eventMarket.winScore) {
      hasOpenMarkets = true;
      break;
    }
  }

  if (!hasOpenMarkets) {
    await Event.findByIdAndUpdate(market.eventId, { completed: true });
  }
};

const generateFancyResult = async (params) => {
  const { marketId, marketRunnerId, winScore } = params;

  const [marketRunner, market] = await Promise.all([MarketRunner.findById(marketRunnerId), Market.findById(marketId)]);

  if (!market) {
    throw new Error("Market not found!");
  }

  if (!marketRunner) {
    throw new Error("Market runner not found!");
  } else if (marketRunner.winScore) {
    throw new Error("Result already declared.");
  }

  const userBets = await Bet.aggregate([
    {
      $match: {
        marketId: new mongoose.Types.ObjectId(marketId),
        runnerId: new mongoose.Types.ObjectId(marketRunnerId),
        betOrderStatus: BET_ORDER_STATUS.PLACED,
        betResultStatus: BET_RESULT_STATUS.RUNNING,
      },
    },
    {
      $group: {
        _id: "$userId",
        bets: {
          $push: "$$ROOT",
        },
      },
    },
  ]);

  for (const userBet of userBets) {
    const userBetPromises = [];
    let userPl = 0;

    for (const bet of userBet.bets) {
      const { isBack, runnerScore, potentialWin, potentialLoss } = bet;

      const updatedBet = { ...bet };

      if (isBack) {
        updatedBet.betPl = runnerScore <= winScore ? potentialWin : potentialLoss;
      } else {
        updatedBet.betPl = runnerScore > winScore ? potentialWin : potentialLoss;
      }

      updatedBet.betResultStatus = updatedBet.betPl > 0 ? BET_RESULT_STATUS.WON : BET_RESULT_STATUS.LOST;

      userPl += updatedBet.betPl;
      userBetPromises.push(Bet.findByIdAndUpdate(bet._id, updatedBet));
    }

    // Get user and current used exposure
    const [user, currentPl] = await Promise.all([
      User.findById(userBet._id),
      betPlService.fetchRunningSingleRunnerOddPl({ userId: userBet._id, marketId }),
    ]);

    const exposureInUse = Math.abs(currentPl);

    user.exposure -= exposureInUse;
    user.userPl += userPl;
    user.balance += userPl;

    userBetPromises.push(user.save());
    userBetPromises.push(updateParentPls(user._id, userPl));

    const responses = await Promise.all(userBetPromises);

    // Emit user bet data
    const updatedUser = responses[responses.length - 2];
    const trimmedUser = getTrimmedUser(updatedUser);
    const userBetsAndPls = await runningBetService.fetchAllUserBetsAndPls({
      eventId: market.eventId,
      userId: userBet._id,
    });
    io.userBet.emit(`event:bet:${userBet._id}`, userBetsAndPls);
    io.user.emit(`user:${userBet._id}`, trimmedUser);
  }

  await MarketRunner.findByIdAndUpdate(marketRunnerId, { winScore });

  await Promise.all([completeEvent({ market }), emitResultNotification({ eventId: market.eventId })]);
};

const generateMatchOddsResult = async (reqBody) => {
  const { marketId, winRunnerId } = reqBody;

  const market = await Market.findById(marketId);

  if (!market) {
    throw new Error("Market not found!");
  } else if (market.winnerRunnerId) {
    throw new Error("Result already declared.");
  }

  const userBets = await Bet.aggregate([
    {
      $match: {
        marketId: new mongoose.Types.ObjectId(marketId),
        betOrderStatus: BET_ORDER_STATUS.PLACED,
        betResultStatus: BET_RESULT_STATUS.RUNNING,
      },
    },
    {
      $group: {
        _id: "$userId",
        bets: {
          $push: "$$ROOT",
        },
      },
    },
  ]);

  for (const userBet of userBets) {
    const userBetPromises = [];
    let userPl = 0;

    for (const bet of userBet.bets) {
      const isWinner = bet.runnerId.toString() === winRunnerId.toString();
      const updatedBet = {
        ...bet,
        betResultStatus: isWinner ? BET_RESULT_STATUS.WON : BET_RESULT_STATUS.LOST,
        betPl: isWinner ? bet.potentialWin : bet.potentialLoss,
      };
      userPl += updatedBet.betPl;
      userBetPromises.push(Bet.findByIdAndUpdate(bet._id, updatedBet));
    }

    // Get user and current used exposure
    const [user, currentPls] = await Promise.all([
      User.findById(userBet._id),
      betPlService.fetchRunningMultiRunnerOddPl({ userId: userBet._id, marketId }),
    ]);

    const exposureInUse = currentPls.length ? Math.abs(Math.min(...currentPls.map((runner) => runner?.pl || 0))) : 0;

    user.exposure -= exposureInUse;
    user.userPl += userPl;
    user.balance += userPl;

    userBetPromises.push(user.save());
    userBetPromises.push(updateParentPls(user._id, userPl));

    const responses = await Promise.all(userBetPromises);

    // Emit user bet data
    const updatedUser = responses[responses.length - 2];
    const trimmedUser = getTrimmedUser(updatedUser);
    const userBetsAndPls = await runningBetService.fetchAllUserBetsAndPls({
      eventId: market.eventId,
      userId: userBet._id,
    });
    console.log(userBetsAndPls);
    io.userBet.emit(`event:bet:${userBet._id}`, userBetsAndPls);
    io.user.emit(`user:${userBet._id}`, trimmedUser);
  }

  await Market.findByIdAndUpdate(marketId, { winnerRunnerId: winRunnerId });

  await Promise.all([completeEvent({ market }), emitResultNotification({ eventId: market.eventId })]);
};

const revertResult = async (reqBody) => {
  const { marketId } = reqBody;

  const market = await Market.findById(marketId).populate("typeId");
  const marketType = market.typeId.name;
  if (!market.winnerRunnerId) {
    throw new Error("Result not declared yet!");
  }

  const userBets = await Bet.aggregate([
    {
      $match: {
        marketId: new mongoose.Types.ObjectId(marketId),
        betResultStatus: { $ne: BET_RESULT_STATUS.RUNNING },
      },
    },
    {
      $group: {
        _id: "$userId",
        bets: {
          $push: "$$ROOT",
        },
      },
    },
  ]);

  for (const userBet of userBets) {
    if ([BET_CATEGORIES.MATCH_ODDS, BET_CATEGORIES.BOOKMAKER].includes(marketType)) {
      const user = await User.findById(userBet._id);
      let userPl = user.userPl;
      let userBalance = user.balance;

      // console.log(userPl);
      for (const bet of userBet.bets) {
        userPl = bet.betResultStatus === BET_RESULT_STATUS.WON ? userPl - bet.betPl : userPl + Math.abs(bet.betPl);
        userBalance =
          bet.betResultStatus === BET_RESULT_STATUS.WON ? userBalance - bet.betPl : userBalance + Math.abs(bet.betPl);

        // console.log(userPl);
        bet.betResultStatus = BET_RESULT_STATUS.RUNNING;
        bet.betPl = 0;
        await Bet.findByIdAndUpdate(bet._id, bet);

        const userBetsAndPls = await runningBetService.fetchAllUserBetsAndPls({
          eventId: bet.eventId,
          userId: userBet._id,
        });
        io.userBet.emit(`event:bet:${userBet._id}`, userBetsAndPls);
      }

      const plDiff = userPl - user.userPl;
      const runnerPls = await betPlService.fetchRunningMultiRunnerOddPl({ userId: userBet._id, marketId });
      const losingPotential = runnerPls.length ? Math.min(...runnerPls.map((runner) => runner?.pl || 0)) : 0;

      console.log("before", "exposure", user.exposure, "userPl", user.userPl, "balance", user.balance);

      user.exposure += Math.abs(losingPotential);
      user.userPl = userPl;
      user.balance = userBalance;

      console.log("after", "exposure", user.exposure, "userPl", user.userPl, "balance", user.balance);

      const parentUser = await User.findById(user.parentId);
      console.log(
        "before",
        "exposure",
        parentUser.exposure,
        "userPl",
        parentUser.userPl,
        "balance",
        parentUser.balance
      );
      parentUser.balance = parentUser.balance + plDiff;
      parentUser.userPl = parentUser.userPl + plDiff;
      console.log("after", "exposure", parentUser.exposure, "userPl", parentUser.userPl, "balance", parentUser.balance);
      console.log(plDiff);

      const updatedUser = await user.save();
      const userDetails = getTrimmedUser(updatedUser);
      io.user.emit(`user:${updatedUser._id}`, userDetails);

      const updatedParentUser = await parentUser.save();
      const parentUserDetails = getTrimmedUser(updatedParentUser);
      io.user.emit(`user:${parentUserDetails._id}`, parentUserDetails);

      market.winnerRunnerId = null;
      await market.save();
    }
  }

  return "reverted";
};

export default {
  generateMatchOddsResult,
  generateFancyResult,
  revertResult,
};
