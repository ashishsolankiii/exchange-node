import mongoose from "mongoose";
import Bet, { BET_ORDER_STATUS, BET_RESULT_STATUS } from "../../../models/v1/Bet.js";
import MarketRunner from "../../../models/v1/MarketRunner.js";

// Calculates PLs of markets having multiple runners and odds
async function calcualteMultiRunnerOddPl({ bets, marketId }) {
  const marketRunners = await MarketRunner.find({ marketId });

  const runnerMap = new Map();

  for (const runner of marketRunners) {
    runnerMap.set(runner._id.toString(), {
      _id: runner._id,
      marketId: runner.marketId,
      runnerName: runner.runnerName,
      pl: 0,
    });
  }

  for (const bet of bets) {
    const { isBack, runnerId, potentialWin, potentialLoss } = bet;

    if (isBack) {
      runnerMap.get(runnerId.toString()).pl += potentialWin;

      runnerMap.forEach((runner) => {
        if (runner._id.toString() !== runnerId.toString()) {
          runner.pl += potentialLoss;
        }
      });
    } else {
      runnerMap.get(runnerId.toString()).pl += potentialLoss;

      runnerMap.forEach((runner) => {
        if (runner._id.toString() !== runnerId.toString()) {
          runner.pl += potentialWin;
        }
      });
    }
  }

  return Array.from(runnerMap.values());
}

// Calcualtes PLs of markets having single runner and odds
function calcualteSingleRunnerOddPl({ bets }) {
  let backLoss = 0;
  let backProfit = 0;
  let layLoss = 0;
  let layProfit = 0;

  for (const bet of bets) {
    const { isBack, potentialWin, potentialLoss } = bet;
    if (isBack) {
      backLoss += potentialLoss;
      backProfit += potentialWin;
    } else {
      layLoss += potentialLoss;
      layProfit += potentialWin;
    }
  }

  const totalPl = Math.min(backLoss + layProfit, layLoss + backProfit);
  const pl = totalPl < 0 ? totalPl : 0;

  return pl;
}

// Fetches PLs of markets having multiple runners and odds
async function fetchRunningMultiRunnerOddPl({ userId, marketId, mockBet = null }) {
  const bets = await Bet.aggregate([
    {
      $match: {
        marketId: new mongoose.Types.ObjectId(marketId),
        userId: new mongoose.Types.ObjectId(userId),
        betOrderStatus: BET_ORDER_STATUS.PLACED,
        betResultStatus: BET_RESULT_STATUS.RUNNING,
      },
    },
    { $sort: { createdAt: 1 } },
  ]);

  const allBets = mockBet ? [...bets, mockBet] : bets;

  if (!allBets.length) {
    return [];
  }

  return await calcualteMultiRunnerOddPl({
    bets: allBets,
    marketId,
  });
}

// Fetches PLs of markets having single runner and odds
async function fetchRunningSingleRunnerOddPl({ userId, marketId, mockBet = null }) {
  const bets = await Bet.aggregate([
    {
      $match: {
        marketId: new mongoose.Types.ObjectId(marketId),
        userId: new mongoose.Types.ObjectId(userId),
        betOrderStatus: BET_ORDER_STATUS.PLACED,
        betResultStatus: BET_RESULT_STATUS.RUNNING,
      },
    },
    { $sort: { createdAt: 1 } },
  ]);

  const allBets = mockBet ? [...bets, mockBet] : bets;

  if (!allBets.length) {
    return 0;
  }

  return calcualteSingleRunnerOddPl({ bets: allBets });
}

// Fetches PLs of Runner by Id
async function fetchRunnerWiseSingleOddsPl({ userId, marketId }) {
  const runnerBets = await Bet.aggregate([
    {
      $match: {
        marketId: new mongoose.Types.ObjectId(marketId),
        userId: new mongoose.Types.ObjectId(userId),
        betOrderStatus: BET_ORDER_STATUS.PLACED,
        betResultStatus: BET_RESULT_STATUS.RUNNING,
      },
    },
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: "$runnerId",
        bets: {
          $push: "$$ROOT",
        },
      },
    },
  ]);

  const betPlData = [];
  for (const runner of runnerBets) {
    const { bets = [] } = runner;
    const pl = calcualteSingleRunnerOddPl({ bets });
    betPlData.push({ _id: runner._id, marketId, pl });
  }

  return betPlData;
}

export default {
  calcualteMultiRunnerOddPl,
  calcualteSingleRunnerOddPl,
  fetchRunningMultiRunnerOddPl,
  fetchRunningSingleRunnerOddPl,
  fetchRunnerWiseSingleOddsPl,
};
