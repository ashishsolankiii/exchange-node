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
async function updateParentPls(userId, userPl) {
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
}

// Emit event result notification to all users
async function emitResultNotification({ eventId }) {
  const event = await Event.findById(eventId);

  const notification = {
    _id: event._id,
    name: event.name,
    matchDateTime: event.matchDate,
  };

  io.eventNotification.to("event:notification").emit("event:complete", notification);
}

// Check if all markets of an event are completed
async function completeEvent({ market }) {
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
}

// Generate result for Fancy and Fancy1
async function generateFancyResult(params) {
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
        updatedBet.betPl = Number(winScore) >= runnerScore ? potentialWin : potentialLoss;
      } else {
        updatedBet.betPl = Number(winScore) < runnerScore ? potentialWin : potentialLoss;
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
}

// Generate result for Match Odds and Bookmaker
async function generateMatchOddsResult(reqBody) {
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
    io.userBet.emit(`event:bet:${userBet._id}`, userBetsAndPls);
    io.user.emit(`user:${userBet._id}`, trimmedUser);
  }

  await Market.findByIdAndUpdate(marketId, { winnerRunnerId: winRunnerId });

  await Promise.all([completeEvent({ market }), emitResultNotification({ eventId: market.eventId })]);
}

// Emit Users data, Bets and Pls
async function emitUserData({ userId, eventId }) {
  const user = await User.findById(userId);
  const trimmedUser = getTrimmedUser(user);

  const userBetsAndPls = await runningBetService.fetchAllUserBetsAndPls({ eventId, userId });

  io.userBet.emit(`event:bet:${userId}`, userBetsAndPls);
  io.user.emit(`user:${userId}`, trimmedUser);
}

// Revert result for Match Odds and Bookmaker
async function revertMatchOddsResult({ market, userBet }) {
  let userPl = 0;

  // Update all user bets
  await Promise.all(
    userBet.bets.map((bet) => {
      userPl = bet.betResultStatus === BET_RESULT_STATUS.WON ? userPl - bet.betPl : Math.abs(userPl + bet.betPl);
      bet.betResultStatus = BET_RESULT_STATUS.RUNNING;
      bet.betPl = 0;
      return Bet.findByIdAndUpdate(bet._id, bet);
    })
  );

  // Get user and current used running pls
  const [user, currentPls] = await Promise.all([
    User.findById(userBet._id),
    betPlService.fetchRunningMultiRunnerOddPl({
      userId: userBet._id,
      marketId: market._id,
    }),
  ]);

  const losingPotential = currentPls.length
    ? Math.abs(
        Math.min(
          ...currentPls.map((runner) => {
            return runner?.pl || 0;
          })
        )
      )
    : 0;

  user.exposure += losingPotential;
  user.userPl += userPl;
  user.balance += userPl;

  market.winnerRunnerId = null;

  await Promise.all([user.save(), market.save(), updateParentPls(user._id, userPl)]);

  await emitUserData({ userId: user._id, eventId: market.eventId });
}

// Revert result for Fancy and Fancy1
async function revertFancyResult({ market, marketRunner, userBet }) {
  let userPl = 0;

  // Update all user bets
  await Promise.all(
    userBet.bets.map((bet) => {
      userPl = bet.betResultStatus === BET_RESULT_STATUS.WON ? userPl - bet.betPl : Math.abs(userPl + bet.betPl);
      bet.betResultStatus = BET_RESULT_STATUS.RUNNING;
      bet.betPl = 0;
      return Bet.findByIdAndUpdate(bet._id, bet);
    })
  );

  // Get user and current used running pls
  const [user, currentPl] = await Promise.all([
    User.findById(userBet._id),
    betPlService.fetchRunningSingleRunnerOddPl({
      userId: userBet._id,
      marketId: market._id,
    }),
  ]);

  const losingPotential = Math.abs(currentPl);

  user.exposure += losingPotential;
  user.userPl += userPl;
  user.balance += userPl;

  marketRunner.winScore = null;

  await Promise.all([user.save(), marketRunner.save(), updateParentPls(user._id, userPl)]);

  await emitUserData({ userId: user._id, eventId: market.eventId });
}

// Revert Market / Runner result
async function revertResult(reqBody) {
  const { marketId, marketRunnerId } = reqBody;

  const market = await Market.findById(marketId).populate("typeId");
  const marketType = market.typeId.name;
  let marketRunner = null; // currently for Fancy and Fancy1

  if (!market) {
    throw new Error("Market not found!");
  } else if (!marketType) {
    throw new Error("Market type not found!");
  }

  // Match Odds and Bookmaker validations go here
  if ([BET_CATEGORIES.MATCH_ODDS, BET_CATEGORIES.BOOKMAKER].includes(marketType)) {
    if (!marketRunnerId.winnerRunnerId) {
      throw new Error("Result not declared yet!");
    }

    // Fancy and Fancy1 validations go here
  } else if ([BET_CATEGORIES.FANCY, BET_CATEGORIES.FANCY1].includes(marketType)) {
    if (!marketRunnerId) {
      throw new Error("marketRunnerId is required!");
    }

    marketRunner = await MarketRunner.findById(marketRunnerId);
    if (!marketRunner) {
      throw new Error("Market runner not found!");
    }

    if (!marketRunner.winScore) {
      throw new Error("Result not declared yet!");
    }
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

  const revertFn = {
    [BET_CATEGORIES.MATCH_ODDS]: revertMatchOddsResult,

    [BET_CATEGORIES.BOOKMAKER]: revertMatchOddsResult,

    [BET_CATEGORIES.FANCY]: revertFancyResult,

    [BET_CATEGORIES.FANCY1]: revertFancyResult,
  };

  await Promise.all(
    userBets.map((userBet) => {
      return revertFn[marketType]({ market, marketId, userBet, marketRunner });
    })
  );

  return { message: "Reverted" };
}

export default {
  generateMatchOddsResult,
  generateFancyResult,
  revertResult,
};
