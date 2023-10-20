import mongoose from "mongoose";
import { generatePaginationQueries, generateSearchFilters } from "../../../lib/helpers/pipeline.js";
import Bet, { BET_ORDER_STATUS, BET_RESULT_STATUS } from "../../../models/v1/Bet.js";
import { BET_CATEGORIES } from "../../../models/v1/BetCategory.js";
import betPlService from "./betPlService.js";

// Fetch all bets for listing page
async function fetchAllBets(reqBody) {
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
    if (betType === "back") {
      filters.isBack = true;
    } else if (betType === "lay") {
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
      $unwind: {
        path: "$event",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
        pipeline: [
          {
            $project: { username: 1 },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$user",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "market_runners",
        localField: "runnerId",
        foreignField: "_id",
        as: "marketRunner",
        pipeline: [
          {
            $project: { runnerName: 1 },
          },
        ],
      },
    },
    {
      $unwind: "$marketRunner",
    },
    {
      $lookup: {
        from: "markets",
        localField: "marketId",
        foreignField: "_id",
        as: "market",
        pipeline: [
          {
            $project: { name: 1 },
          },
        ],
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
            $sort: {
              [sortBy]: sortDirection,
            },
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
}

// Fetch user bet history
async function fetchUserBetHistory(reqBody) {
  const { loginUserId, page, perPage, sortBy, direction, betType, betResultStatus, startDate, endDate } = reqBody;

  let startOfDay, endOfDay;

  if (startDate && endDate) {
    startOfDay = new Date(new Date(startDate).setUTCHours(0, 0, 0, 0)).toISOString();
    endOfDay = new Date(new Date(endDate).setUTCHours(23, 59, 59, 999)).toISOString();
  } else {
    if (startDate) {
      startOfDay = new Date(new Date(startDate).setUTCHours(0, 0, 0, 0)).toISOString();
      endOfDay = new Date(new Date().setUTCHours(23, 59, 59, 999)).toISOString();
    } else if (endDate) {
      startOfDay = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString();
      endOfDay = new Date(new Date(endDate).setUTCHours(23, 59, 59, 999)).toISOString();
    } else {
      startOfDay = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString();
      endOfDay = new Date(new Date().setUTCHours(23, 59, 59, 999)).toISOString();
    }
  }

  // Pagination and Sorting
  const sortDirection = direction === "asc" ? 1 : -1;
  const paginationQueries = generatePaginationQueries(page, perPage);

  let filters = {
    userId: new mongoose.Types.ObjectId(loginUserId),
    "market.startDate": {
      $gte: new Date(startOfDay),
      $lt: new Date(endOfDay),
    },
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

  const bets = await Bet.aggregate([
    {
      $lookup: {
        from: "events",
        localField: "eventId",
        foreignField: "_id",
        as: "event",
        pipeline: [
          {
            $project: { name: 1, sportId: 1 },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$event",
        preserveNullAndEmptyArrays: true,
      },
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
      $unwind: {
        path: "$sport",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "market_runners",
        localField: "runnerId",
        foreignField: "_id",
        as: "marketRunner",
        pipeline: [
          {
            $project: { runnerName: 1 },
          },
        ],
      },
    },
    {
      $unwind: "$marketRunner",
    },
    {
      $lookup: {
        from: "markets",
        localField: "marketId",
        foreignField: "_id",
        as: "market",
        pipeline: [
          {
            $project: { name: 1, startDate: 1 },
          },
        ],
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
            $sort: {
              [sortBy]: sortDirection,
            },
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
        pipeline: [
          {
            $project: { name: 1, startDate: 1 },
          },
        ],
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
      $unset: ["market"],
    },
    {
      $group: {
        _id: null,
        total: {
          $sum: "$stake",
        },
      },
    },
  ]);

  if (totalAmount.length > 0) {
    totalAmount = totalAmount[0].total;
  } else {
    totalAmount = 0;
  }

  const data = {
    records: [],
    totalRecords: 0,
    totalAmount: totalAmount,
  };

  if (bets?.length) {
    data.records = bets[0]?.paginatedResults || [];
    data.totalRecords = bets[0]?.totalRecords?.length ? bets[0]?.totalRecords[0].count : 0;
  }

  return data;
}

// Fetch all user Bets for an Event
async function fetchUserEventBets(reqBody) {
  const { eventId, userId } = reqBody;

  const eventBets = await Bet.aggregate([
    {
      $match: {
        eventId: new mongoose.Types.ObjectId(eventId),
        userId: new mongoose.Types.ObjectId(userId),
        betResultStatus: BET_RESULT_STATUS.RUNNING,
      },
    },
    {
      $lookup: {
        from: "market_runners",
        localField: "runnerId",
        foreignField: "_id",
        as: "marketRunner",
        pipeline: [
          {
            $project: { runnerName: 1 },
          },
        ],
      },
    },
    {
      $unwind: "$marketRunner",
    },
    {
      $lookup: {
        from: "markets",
        localField: "marketId",
        foreignField: "_id",
        as: "market",
        pipeline: [
          {
            $project: { name: 1 },
          },
          {
            $sort: { name: 1 },
          },
        ],
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
            runnerScore: "$runnerScore",
            potentialWin: "$potentialWin",
            potentialLoss: "$potentialLoss",
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
      $sort: { "bets.createdAt": -1 },
    },
  ]);

  return eventBets;
}

// Fetch all user Bets and Market Pls for an Event
async function fetchAllUserBetsAndPls({ eventId, userId }) {
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
      userId,
      marketId: betMarket.marketId,
    };
    if ([BET_CATEGORIES.MATCH_ODDS, BET_CATEGORIES.BOOKMAKER].includes(betMarket.betCategory)) {
      plPromises.push(betPlService.fetchRunningMultiRunnerOddPl(params));
    } else if ([BET_CATEGORIES.FANCY, BET_CATEGORIES.FANCY1].includes(betMarket.betCategory)) {
      plPromises.push(betPlService.fetchRunnerWiseSingleOddsPl(params));
    }
  }

  const [marketBets, marketPls] = await Promise.all([fetchUserEventBets({ eventId, userId }), Promise.all(plPromises)]);

  return { marketBets, marketPls };
}

export default {
  fetchAllBets,
  fetchUserBetHistory,
  fetchUserEventBets,
  fetchAllUserBetsAndPls,
};
