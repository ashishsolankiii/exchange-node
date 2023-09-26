import mongoose from "mongoose";
import ErrorResponse from "../../lib/error-handling/error-response.js";
import { getTrimmedUser } from "../../lib/helpers/auth.js";
import { generatePaginationQueries, generateSearchFilters } from "../../lib/helpers/pipeline.js";
import { decryptTransactionCode } from "../../lib/helpers/transaction-code.js";
import Bet, { BET_ORDER_STATUS, BET_RESULT_STATUS } from "../../models/v1/Bet.js";
import Event from "../../models/v1/Event.js";
import Market from "../../models/v1/Market.js";
import MarketRunner from "../../models/v1/MarketRunner.js";
import User, { USER_ROLE } from "../../models/v1/User.js";
import { io } from "../../socket/index.js";
import marketService from "./marketService.js";
import BetCategory, { BET_CATEGORIES, DEFAULT_CATEGORIES } from "../../models/v1/BetCategory.js";

const fetchRunnerPls = async ({ user, ...reqBody }) => {
  try {
    const { eventId, marketId } = reqBody;

    const bets = await Bet.aggregate([
      {
        $match: {
          eventId: new mongoose.Types.ObjectId(eventId),
          marketId: new mongoose.Types.ObjectId(marketId),
          userId: new mongoose.Types.ObjectId(user._id),
          betOrderStatus: BET_ORDER_STATUS.PLACED,
          betResultStatus: BET_RESULT_STATUS.RUNNING,
        },
      },
      { $sort: { createdAt: 1 } },
    ]);

    const marketRunners = await MarketRunner.find({ marketId: new mongoose.Types.ObjectId(marketId) });
    const runner1 = marketRunners[0]._id;
    const runner2 = marketRunners[1]._id;

    const runners = {
      [marketRunners[0]._id]: {
        _id: marketRunners[0]._id,
        marketId: marketRunners[0].marketId,
        runnerName: marketRunners[0].runnerName,
        pl: 0,
      },
      [marketRunners[1]._id]: {
        _id: marketRunners[1]._id,
        marketId: marketRunners[1].marketId,
        runnerName: marketRunners[1].runnerName,
        pl: 0,
      },
    };

    bets.forEach((bet) => {
      if (bet.isBack) {
        if (bet.runnerId.toString() === runner1.toString()) {
          runners[runner1].pl += bet.potentialWin;
          runners[runner2].pl += bet.potentialLoss;
        } else {
          runners[runner1].pl += bet.potentialLoss;
          runners[runner2].pl += bet.potentialWin;
        }
      } else {
        if (bet.runnerId.toString() === runner1.toString()) {
          runners[runner1].pl += bet.potentialLoss;
          runners[runner2].pl += bet.potentialWin;
        } else {
          runners[runner1].pl += bet.potentialWin;
          runners[runner2].pl += bet.potentialLoss;
        }
      }
    });

    return Object.values(runners);
  } catch (e) {
    throw new Error(e);
  }
};

/**
 * create Bet in the database
 */
const addBet = async ({ user: loggedInUser, ...reqBody }) => {
  try {
    const findMarket = await Market.findById(reqBody.marketId);
    let winLossCalculation;
    if (findMarket) {
      const findBetType = await BetCategory.findById(findMarket.typeId)
      if (findBetType) {
        if (findBetType.name == BET_CATEGORIES.MATCH_ODDS) {
          winLossCalculation = await matchOddsBet(loggedInUser, reqBody);
        }
        else if (findBetType.name == BET_CATEGORIES.BOOKMAKER) {
          winLossCalculation = await bookmakersBet(loggedInUser, reqBody);
        }
        else if (findBetType.name == BET_CATEGORIES.FANCY) {
          winLossCalculation = await fancyBet(loggedInUser, reqBody);
        }
        else {
          throw new Error("Market Type not found.");
        }
      }
    }
    const newBetObj = {
      userId: loggedInUser._id,
      marketId: reqBody.marketId,
      eventId: reqBody.eventId,
      odds: reqBody.odds,
      stake: reqBody.stake,
      isBack: reqBody.isBack,
      betOrderType: reqBody.betOrderType,
      betOrderStatus: BET_ORDER_STATUS.PLACED,
      betResultStatus: BET_RESULT_STATUS.RUNNING,
      deviceInfo: reqBody.deviceInfo,
      ipAddress: reqBody.ipAddress,
      runnerId: reqBody.runnerId,
      potentialWin: winLossCalculation.potentialWin,
      potentialLoss: winLossCalculation.potentialLoss,
    };

    const newBet = await Bet.create(newBetObj);
    const user = await User.findById(loggedInUser._id);
    user.exposure = winLossCalculation.newExposure < 0 ? 0 : winLossCalculation.newExposure;
    await user.save();
    io.user.emit(`user:${user._id}`, getTrimmedUser(user));

    return newBet;
  } catch (e) {
    throw new Error(e);
  }
};

// Add bet matchodds logic
async function matchOddsBet(loggedInUser, reqBody) {
  // Market Validation
  const data = await marketService.getMatchOdds(reqBody.apiMarketId);
  if (!data) {
    throw new Error("Market not found.");
  }

  const [{ matchOdds }] = data;
  const runner = matchOdds.find((runner) => runner.selectionId === Number(reqBody.runnerSelectionId));
  if (!runner) {
    throw new Error("Runner not found.");
  }

  const oddPrices = reqBody.isBack ? runner.back.map((o) => o.price) : runner.lay.map((o) => o.price);
  if (!oddPrices.includes(Number(reqBody.odds))) {
    throw new Error("Bet not confirmed, Odds changed!");
  }

  // User Validation
  const user = await User.findById(loggedInUser._id);
  if (!user) {
    throw new Error("User not found.");
  }
  if (!(user.role === USER_ROLE.USER && user.isActive && !user?.isDeleted && !user.isBetLock)) {
    throw new Error("Invalid request.");
  }

  const potentialWin = reqBody.isBack ? reqBody.stake * reqBody.odds - reqBody.stake : reqBody.stake;
  const potentialLoss = reqBody.isBack ? -reqBody.stake : -(reqBody.stake * reqBody.odds - reqBody.stake);

  const runnerPls = await fetchRunnerPls({ user, ...reqBody });

  let totalPreviousLoss = 0;
  let requiredExposure = 0;

  const pl = [0, 0];
  runnerPls.forEach((runner) => {
    if (runner.pl < 0) {
      totalPreviousLoss += runner.pl;
    }
    if (runner._id.toString() === reqBody.runnerId) {
      pl[0] = runner.pl;
    } else {
      pl[1] = runner.pl;
    }
  });

  if (reqBody.isBack) {
    pl[0] = pl[0] + potentialWin;
    pl[1] = pl[1] + potentialLoss;
  } else {
    pl[0] = pl[0] + potentialLoss;
    pl[1] = pl[1] + potentialWin;
  }

  requiredExposure = Math.min(...pl);

  const newExposure = user.exposure + totalPreviousLoss + Math.abs(requiredExposure);

  if (user.balance < Math.abs(requiredExposure)) {
    throw new Error("Insufficient balance.");
  }

  if (newExposure > user.exposureLimit) {
    throw new Error("Exposure limit reached.");
  }

  const event = await Event.findById(reqBody.eventId, {
    maxStake: 1,
    minStake: 1,
    isActive: 1,
    isDeleted: 1,
    betLock: 1,
  });
  if (!(event && event.isActive && !event?.isDeleted && !event.betLock)) {
    throw new Error("Event closed.");
  }

  const market = await Market.findById(reqBody.marketId, { maxStake: 1, minStake: 1 });
  if (!market) {
    throw new Error("Market not found.");
  }

  if (market.maxStake > 0 && market.minStake > 0) {
    if (reqBody.stake < market.minStake || reqBody.stake > market.maxStake) {
      throw new Error("Invalid stake.");
    }
  } else {
    if (reqBody.stake < event.minStake || reqBody.stake > event.maxStake) {
      throw new Error("Invalid stake.");
    }
  }

  let potentialWinLoss = {
    potentialWin,
    potentialLoss,
    newExposure
  }
  return potentialWinLoss;
}

// Add bet bookmakers logic
async function bookmakersBet(loggedInUser, reqBody) {
  // Market Validation
  const data = await marketService.getBookmakerPrice(reqBody.apiMarketId);
  if (!data) {
    throw new Error("Market not found.");
  }
  const [{ matchOdds }] = data;
  const runner = matchOdds.find((runner) => runner.selectionId === Number(reqBody.runnerSelectionId));
  if (!runner) {
    throw new Error("Runner not found.");
  }

  const oddPrices = reqBody.isBack ? runner.back.map((o) => o.price) : runner.lay.map((o) => o.price);
  if (!oddPrices.includes(Number(reqBody.odds))) {
    throw new Error("Bet not confirmed, Odds changed!");
  }

  // User Validation
  const user = await User.findById(loggedInUser._id);
  if (!user) {
    throw new Error("User not found.");
  }
  if (!(user.role === USER_ROLE.USER && user.isActive && !user?.isDeleted && !user.isBetLock)) {
    throw new Error("Invalid request.");
  }

  // let length = Number(String(reqBody.odds).length);
  // let divideBy = Number(String(1).padEnd(length + 1, "0"));
  const potentialWin = reqBody.isBack ? reqBody.stake * reqBody.odds / 100 : reqBody.stake;
  const potentialLoss = reqBody.isBack ? -reqBody.stake : -(reqBody.stake * reqBody.odds / 100);

  const runnerPls = await fetchRunnerPls({ user, ...reqBody });

  let totalPreviousLoss = 0;
  let requiredExposure = 0;

  const pl = [0, 0];
  runnerPls.forEach((runner) => {
    if (runner.pl < 0) {
      totalPreviousLoss += runner.pl;
    }
    if (runner._id.toString() === reqBody.runnerId) {
      pl[0] = runner.pl;
    } else {
      pl[1] = runner.pl;
    }
  });

  if (reqBody.isBack) {
    pl[0] = pl[0] + potentialWin;
    pl[1] = pl[1] + potentialLoss;
  } else {
    pl[0] = pl[0] + potentialLoss;
    pl[1] = pl[1] + potentialWin;
  }

  requiredExposure = Math.min(...pl);

  const newExposure = user.exposure + totalPreviousLoss + Math.abs(requiredExposure);

  if (user.balance < Math.abs(requiredExposure)) {
    throw new Error("Insufficient balance.");
  }

  if (newExposure > user.exposureLimit) {
    throw new Error("Exposure limit reached.");
  }

  const event = await Event.findById(reqBody.eventId, {
    maxStake: 1,
    minStake: 1,
    isActive: 1,
    isDeleted: 1,
    betLock: 1,
  });
  if (!(event && event.isActive && !event?.isDeleted && !event.betLock)) {
    throw new Error("Event closed.");
  }

  const market = await Market.findById(reqBody.marketId, { maxStake: 1, minStake: 1 });
  if (!market) {
    throw new Error("Market not found.");
  }

  if (market.maxStake > 0 && market.minStake > 0) {
    if (Number(reqBody.stake) < market.minStake || Number(reqBody.stake) > market.maxStake) {
      throw new Error("Invalid stake.");
    }
  } else {
    if (Number(reqBody.stake) < event.minStake || Number(reqBody.stake) > event.maxStake) {
      throw new Error("Invalid stake.");
    }
  }
  let potentialWinLoss = {
    potentialWin,
    potentialLoss,
    newExposure
  }
  return potentialWinLoss;
}

// Add bet fancy logic
async function fancyBet(loggedInUser, reqBody) {
  // Market Validation
  const data = await marketService.getFencyPriceByRunner(reqBody.runnerId);
  if (!data) {
    throw new Error("Market not found.");
  }
  const matchOdds = data;
  const runner = matchOdds.find((runner) => Number(runner.SelectionId) === Number(reqBody.runnerSelectionId));
  if (!runner) {
    throw new Error("Runner not found.");
  }
  const oddPrices = reqBody.isBack ? runner.BackPrice1 : runner.LayPrice1;
  if (oddPrices != Number(reqBody.odds)) {
    throw new Error("Bet not confirmed, Odds changed!");
  }

  // User Validation
  const user = await User.findById(loggedInUser._id);
  if (!user) {
    throw new Error("User not found.");
  }
  if (!(user.role === USER_ROLE.USER && user.isActive && !user?.isDeleted && !user.isBetLock)) {
    throw new Error("Invalid request.");
  }

  // let length = Number(String(reqBody.odds).length);
  // let divideBy = Number(String(1).padEnd(length + 1, "0"));
  const potentialWin = reqBody.stake;
  const potentialLoss = -reqBody.stake;

  const runnerPls = await fetchRunnerPls({ user, ...reqBody });

  let totalPreviousLoss = 0;
  let requiredExposure = 0;

  const pl = [0, 0];
  runnerPls.forEach((runner) => {
    if (runner.pl < 0) {
      totalPreviousLoss += runner.pl;
    }
    if (runner._id.toString() === reqBody.runnerId) {
      pl[0] = runner.pl;
    } else {
      pl[1] = runner.pl;
    }
  });

  if (reqBody.isBack) {
    pl[0] = pl[0] + potentialWin;
    pl[1] = pl[1] + potentialLoss;
  } else {
    pl[0] = pl[0] + potentialLoss;
    pl[1] = pl[1] + potentialWin;
  }

  requiredExposure = Math.min(...pl);

  const newExposure = user.exposure + totalPreviousLoss + Math.abs(requiredExposure);

  if (user.balance < Math.abs(requiredExposure)) {
    throw new Error("Insufficient balance.");
  }

  if (newExposure > user.exposureLimit) {
    throw new Error("Exposure limit reached.");
  }

  const event = await Event.findById(reqBody.eventId, {
    maxStake: 1,
    minStake: 1,
    isActive: 1,
    isDeleted: 1,
    betLock: 1,
  });
  if (!(event && event.isActive && !event?.isDeleted && !event.betLock)) {
    throw new Error("Event closed.");
  }

  const market = await Market.findById(reqBody.marketId, { maxStake: 1, minStake: 1 });
  if (!market) {
    throw new Error("Market not found.");
  }
  if (Number(runner.max > 0) && Number(runner.min) > 0) {
    if (Number(reqBody.stake) < Number(runner.min) || Number(reqBody.stake) > Number(runner.max)) {
      throw new Error("Invalid stake.");
    }
  }
  else if (market.maxStake > 0 && market.minStake > 0) {
    if (Number(reqBody.stake) < market.minStake || Number(reqBody.stake) > market.maxStake) {
      throw new Error("Invalid stake.");
    }
  } else {
    if (Number(reqBody.stake) < event.minStake || Number(reqBody.stake) > event.maxStake) {
      throw new Error("Invalid stake.");
    }
  }
  let potentialWinLoss = {
    potentialWin,
    potentialLoss,
    newExposure
  }
  return potentialWinLoss;
}

// Fetch all bet from the database
const fetchAllBet = async ({ ...reqBody }) => {
  try {
    const { page, perPage, sortBy, direction, searchQuery, eventId, marketId, betType, username } = reqBody;

    // Pagination and Sorting
    const sortDirection = direction === "asc" ? 1 : -1;
    const paginationQueries = generatePaginationQueries(page, perPage);

    let filters = {};

    if (eventId) {
      filters.eventId = new mongoose.Types.ObjectId(eventId);
    }

    if (marketId) {
      filters.marketId = new mongoose.Types.ObjectId(marketId);
    }

    if (eventId && marketId) {
      delete filters.marketId;
    }

    if (betType) {
      if (betType == "back") {
        filters.isBack = true;
      } else if (betType == "lay") {
        filters.isBack = false;
      }
    }

    if (username) {
      filters["user.username"] = { $regex: username, $options: "i" };
    }

    if (searchQuery) {
      const fields = ["userId", "ipAddress"];
      filters.$or = generateSearchFilters(searchQuery, fields);
    }

    const bet = await Bet.aggregate([
      {
        $lookup: {
          from: "events",
          localField: "eventId",
          foreignField: "_id",
          as: "event",
          pipeline: [{ $project: { name: 1 } }],
        },
      },
      {
        $unwind: { path: "$event", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
          pipeline: [{ $project: { username: 1 } }],
        },
      },
      {
        $unwind: { path: "$user", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "market_runners",
          localField: "runnerId",
          foreignField: "_id",
          as: "marketRunner",
          pipeline: [{ $project: { runnerName: 1 } }],
        },
      },
      { $unwind: "$marketRunner" },
      {
        $lookup: {
          from: "markets",
          localField: "marketId",
          foreignField: "_id",
          as: "market",
          pipeline: [{ $project: { name: 1 } }],
        },
      },
      {
        $unwind: {
          path: "$market",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: filters,
      },
      {
        $set: {
          eventName: "$event.name",
          userName: "$user.username",
          marketName: "$market.name",
          runnerName: "$marketRunner.runnerName",
        },
      },
      {
        $unset: ["event", "user", "market", "marketRunner"],
      },
      {
        $facet: {
          totalRecords: [{ $count: "count" }],
          paginatedResults: [
            {
              $sort: { [sortBy]: sortDirection },
            },
            ...paginationQueries,
          ],
        },
      },
    ]);

    const data = {
      records: [],
      totalRecords: 0,
    };

    if (bet?.length) {
      data.records = bet[0]?.paginatedResults || [];
      data.totalRecords = bet[0]?.totalRecords?.length ? bet[0]?.totalRecords[0].count : 0;
    }
    return data;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

async function updateUserPl(userId, profitLoss) {
  let findUser = await User.findOne({ _id: userId });
  findUser.userPl = findUser.userPl + profitLoss;
  // findUser.balance = findUser.balance + profitLoss;
  findUser.save();

  if (findUser.role != USER_ROLE.SUPER_ADMIN) {
    await updateUserPl(findUser.parentId, profitLoss);
  } else {
    return;
  }
}

const fetchUserEventBets = async ({ ...reqBody }) => {
  try {
    const { eventId, userId } = reqBody;

    const eventBets = await Bet.aggregate([
      {
        $match: {
          eventId: new mongoose.Types.ObjectId(eventId),
          userId: new mongoose.Types.ObjectId(userId),
          betResultStatus: BET_RESULT_STATUS.RUNNING
        },
      },
      {
        $lookup: {
          from: "market_runners",
          localField: "runnerId",
          foreignField: "_id",
          as: "marketRunner",
          pipeline: [{ $project: { runnerName: 1 } }],
        },
      },
      { $unwind: "$marketRunner" },
      {
        $lookup: {
          from: "markets",
          localField: "marketId",
          foreignField: "_id",
          as: "market",
          pipeline: [{ $project: { name: 1 } }, {
            $sort: { name: 1 },
          },],
        },
      },
      {
        $unwind: "$market",
      },
      {
        $group: {
          _id: "$market",
          bets: {
            $push: {
              _id: "$_id",
              runner: "$marketRunner.runnerName",
              stake: "$stake",
              odds: "$odds",
              isBack: "$isBack",
              createdAt: "$createdAt",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          market: "$_id",
          bets: 1,
        },
      },
      {
        $sort: { 'bets.createdAt': -1 },
      },
    ]);

    return eventBets;
  } catch (e) {
    throw new Error(e);
  }
};

const completeBet = async ({ ...reqBody }) => {
  try {
    const { marketId, winRunnerId } = reqBody;

    let findMarket = await Market.findOne({ _id: marketId });
    if (
      findMarket.winnerRunnerId == undefined ||
      findMarket.winnerRunnerId == "" ||
      findMarket.winnerRunnerId == null
    ) {
      let findBet = await Bet.find({ marketId: marketId });

      for (var i = 0; i < findBet.length; i++) {
        let newFindBet = await Bet.findOne({ userId: findBet[i].userId, marketId: findBet[i].marketId });
        let profit = 0;
        let loss = 0;
        if (findBet[i].isBack == true) {
          if (winRunnerId == findBet[i].marketRunnerId) {
            profit = findBet[i].potentialWin;
            newFindBet.betPl = profit;
            newFindBet.betResultStatus = BET_RESULT_STATUS.WON
          } else {
            loss = findBet[i].potentialLoss;
            newFindBet.betPl = loss;
            newFindBet.betResultStatus = BET_RESULT_STATUS.LOST
          }
        } else {
          if (winRunnerId != findBet[i].marketRunnerId) {
            profit = findBet[i].potentialWin;
            newFindBet.betPl = profit;
            newFindBet.betResultStatus = BET_RESULT_STATUS.WON
          } else {
            loss = findBet[i].potentialLoss;
            newFindBet.betPl = loss;
            newFindBet.betResultStatus = BET_RESULT_STATUS.LOST
          }
        }
        newFindBet.save();
        if (loss == 0) {
          await updateUserPl(findBet[i].userId, profit);
        } else {
          await updateUserPl(findBet[i].userId, loss);
        }
      }
      findMarket.winnerRunnerId = winRunnerId;
      findMarket.save();
      return reqBody;
    } else {
      throw new ErrorResponse("Winner already added.").status(200);
    }
  } catch (e) {
    throw new Error(e);
  }
};

const completeBetFency = async ({ ...reqBody }) => {
  try {
    const { marketRunnerId, winScore } = reqBody;

    let findMarketRunner = await MarketRunner.findOne({ _id: marketRunnerId });
    if (
      findMarketRunner.winScore == null
    ) {
      let findBet = await Bet.find({ runnerId: marketRunnerId });

      for (var i = 0; i < findBet.length; i++) {
        let newFindBet = await Bet.findOne({ userId: findBet[i].userId, runnerId: findBet[i].runnerId });
        let profit = 0;
        let loss = 0;
        if (findBet[i].isBack == true) {
          if (newFindBet.odds <= winScore) {
            profit = findBet[i].potentialWin;
            newFindBet.betPl = profit;
            newFindBet.betResultStatus = BET_RESULT_STATUS.WON
          }
          else {
            loss = findBet[i].potentialLoss;
            newFindBet.betPl = loss;
            newFindBet.betResultStatus = BET_RESULT_STATUS.LOST
          }
        } else {
          if (newFindBet.odds > winScore) {
            profit = findBet[i].potentialWin;
            newFindBet.betPl = profit;
            newFindBet.betResultStatus = BET_RESULT_STATUS.WON
          }
          else {
            loss = findBet[i].potentialLoss;
            newFindBet.betPl = loss;
            newFindBet.betResultStatus = BET_RESULT_STATUS.LOST
          }
        }
        newFindBet.save();
        if (loss == 0) {
          await updateUserPl(findBet[i].userId, profit);
        } else {
          await updateUserPl(findBet[i].userId, loss);
        }
      }
      findMarketRunner.winScore = winScore;
      findMarketRunner.save();
      return reqBody;
    } else {
      throw new ErrorResponse("Winner already added.").status(200);
    }
  } catch (e) {
    throw new Error(e);
  }
};

const settlement = async ({ ...reqBody }) => {
  try {
    const { settlementData, loginUserId, transactionCode } = reqBody;

    let findLoginUser = await User.findOne({ _id: loginUserId });
    const loginUsertransactionCode = decryptTransactionCode(findLoginUser.transactionCode);

    if (transactionCode == loginUsertransactionCode) {
      for (var i = 0; i < settlementData.length; i++) {
        let findUser = await User.findOne({ _id: settlementData[i].userId });
        let findParentUser = await User.findOne({ _id: findUser.parentId });

        if (findUser) {
          if (findUser.userPl >= 0) {
            findParentUser.downPoint = findParentUser.downPoint + Number(settlementData[i].amount) * -1;
            await findParentUser.save();
            findUser.userPl = Number(findUser.userPl) - Number(settlementData[i].amount);
            findUser.balance = Number(findUser.balance) - Number(settlementData[i].amount);
            findUser.upPoint = findUser.upPoint + Number(settlementData[i].amount);
            await findUser.save();
          } else {
            findParentUser.downPoint = findParentUser.downPoint + settlementData[i].amount;
            await findParentUser.save();
            findUser.userPl = Number(findUser.userPl) + Number(settlementData[i].amount);
            findUser.balance = Number(findUser.balance) + Number(settlementData[i].amount);
            findUser.upPoint = findUser.upPoint + Number(settlementData[i].amount) * -1;
            await findUser.save();
          }
        } else {
          throw new ErrorResponse("User not found.").status(200);
        }
      }
    } else {
      throw new ErrorResponse("Invalid transaction code.").status(200);
    }

    return settlementData.map(function (item) {
      return item;
    });
  } catch (e) {
    throw new Error(e);
  }
};

const getChildUserData = async ({ userId, filterUserId }) => {
  try {
    // Filters
    const filters = {
      isDeleted: false,
      isActive: true,
      parentId: new mongoose.Types.ObjectId(userId),
      userPl: { $ne: 0 }
    };

    //If filterUserId has value then add in filter
    if (filterUserId) {
      filters._id = new mongoose.Types.ObjectId(filterUserId);
    }

    //Get all users
    const users = await User.aggregate([
      {
        $match: filters,
      },
      {
        $unset: ["__v", "password"],
      },
      {
        $project: {
          username: 1,
          fullName: 1,
          role: 1,
          creditPoints: { $ifNull: ["$creditPoints", 0] },
          balance: { $ifNull: ["$balance", 0] },
          userPl: { $ifNull: ["$userPl", 0] },
          exposure: { $ifNull: ["$exposure", 0] },
        },
      },
    ]);

    //Add new attribute points = creditPoints +userPl
    users.forEach((user) => {
      user.points = user.creditPoints + user.userPl;
    });

    return users;
  } catch (e) {
    throw new Error(e);
  }
};

const getCurrentBetsUserwise = async ({ ...reqBody }) => {
  try {
    const { loginUserId, page,
      perPage,
      sortBy,
      direction, betType, betResultStatus } = reqBody;

    const startOfDay = new Date(
      new Date().setUTCHours(0, 0, 0, 0)
    ).toISOString();
    const endOfDay = new Date(
      new Date().setUTCHours(23, 59, 59, 999)
    ).toISOString();

    // Pagination and Sorting
    const sortDirection = direction === "asc" ? 1 : -1;
    const paginationQueries = generatePaginationQueries(page, perPage);

    let filters = {
      userId: new mongoose.Types.ObjectId(loginUserId), "market.startDate": {
        $gte: new Date(startOfDay),
        $lt: new Date(endOfDay),
      }
    };

    if (betType) {
      if (betType == "back") {
        filters.isBack = true;
      } else if (betType == "lay") {
        filters.isBack = false;
      }
    }
    if (betResultStatus) {
      filters.betResultStatus = betResultStatus;
    }
    const bet = await Bet.aggregate([
      {
        $lookup: {
          from: "events",
          localField: "eventId",
          foreignField: "_id",
          as: "event",
          pipeline: [{ $project: { name: 1, sportId: 1 } }],
        },
      },
      {
        $unwind: { path: "$event", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "sports",
          localField: "event.sportId",
          foreignField: "_id",
          as: "sport",
          pipeline: [{ $project: { name: 1 } }],
        },
      },
      {
        $unwind: { path: "$sport", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "market_runners",
          localField: "runnerId",
          foreignField: "_id",
          as: "marketRunner",
          pipeline: [{ $project: { runnerName: 1 } }],
        },
      },
      { $unwind: "$marketRunner" },
      {
        $lookup: {
          from: "markets",
          localField: "marketId",
          foreignField: "_id",
          as: "market",
          pipeline: [{ $project: { name: 1, startDate: 1 } }],
        },
      },
      {
        $unwind: {
          path: "$market",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: filters
      },
      {
        $set: {
          eventName: "$event.name",
          marketName: "$market.name",
          runnerName: "$marketRunner.runnerName",
          sportName: "$sport.name",
        },
      },
      {
        $unset: ["event", "market", "marketRunner", "sport"],
      },
      {
        $facet: {
          totalRecords: [{ $count: "count" }],
          paginatedResults: [
            {
              $sort: { [sortBy]: sortDirection },
            },
            ...paginationQueries,
          ],
        },
      },
    ]);

    let totalAmount = await Bet.aggregate([
      {
        $lookup: {
          from: "markets",
          localField: "marketId",
          foreignField: "_id",
          as: "market",
          pipeline: [{ $project: { name: 1, startDate: 1 } }],
        },
      },
      {
        $unwind: {
          path: "$market",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: filters
      },
      {
        $unset: ["market"],
      },
      {
        "$group": {
          _id: null,
          total: {
            $sum: "$stake"
          }
        }
      }
    ]);

    if (totalAmount.length > 0) {
      totalAmount = totalAmount[0].total;
    }
    else {
      totalAmount = 0;
    }
    const data = {
      records: [],
      totalRecords: 0,
      totalAmount: totalAmount
    };

    if (bet?.length) {
      data.records = bet[0]?.paginatedResults || [];
      data.totalRecords = bet[0]?.totalRecords?.length ? bet[0]?.totalRecords[0].count : 0;
    }

    return data;

  } catch (e) {
    throw new Error(e);
  }
};

export default {
  fetchRunnerPls,
  addBet,
  fetchAllBet,
  fetchUserEventBets,
  completeBet,
  completeBetFency,
  settlement,
  getChildUserData,
  getCurrentBetsUserwise
};
