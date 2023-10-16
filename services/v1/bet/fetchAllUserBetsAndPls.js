import mongoose from "mongoose";
import Bet, { BET_ORDER_STATUS, BET_RESULT_STATUS } from "../../../models/v1/Bet.js";
import { BET_CATEGORIES } from "../../../models/v1/BetCategory.js";
import betPlService from "./betPlService.js";
import { fetchUserEventBets } from "./runningBetService.js";

const fetchAllUserBetsAndPls = async ({ eventId, userId }) => {
  const betMarkets = await Bet.aggregate([
    {
      $match: {
        eventId: new mongoose.Types.ObjectId(eventId),
        betOrderStatus: BET_ORDER_STATUS.PLACED,
        betResultStatus: BET_RESULT_STATUS.RUNNING,
        userId: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: "$marketId",
      },
    },
    {
      $lookup: {
        from: "markets",
        localField: "_id",
        foreignField: "_id",
        as: "market",
        pipeline: [
          {
            $project: { typeId: 1 },
          },
        ],
      },
    },
    {
      $unwind: "$market",
    },
    {
      $lookup: {
        from: "bet_categories",
        localField: "market.typeId",
        foreignField: "_id",
        as: "betCategory",
        pipeline: [
          {
            $project: { name: 1 },
          },
        ],
      },
    },
    {
      $unwind: "$betCategory",
    },
    {
      $project: {
        _id: 0,
        marketId: "$_id",
        betCategory: "$betCategory.name",
      },
    },
  ]);

  const plPromises = [];
  for (const betMarket of betMarkets) {
    const params = {
      user: { _id: userId },
      marketId: betMarket.marketId,
    };
    if ([BET_CATEGORIES.MATCH_ODDS, BET_CATEGORIES.BOOKMAKER].includes(betMarket.betCategory)) {
      plPromises.push(betPlService.fetchRunningMultiRunnerOddPl(params));
    } else if ([BET_CATEGORIES.FANCY, BET_CATEGORIES.FANCY1].includes(betMarket.betCategory)) {
      plPromises.push(betPlService.fetchRunningSingleRunnerOddPl(params));
    }
  }

  const promises = [];
  promises.push(fetchUserEventBets({ eventId, userId }));
  promises.push(Promise.all(plPromises));

  const [marketBets, marketPls] = await Promise.all(promises);

  return { marketBets, marketPls };
};
