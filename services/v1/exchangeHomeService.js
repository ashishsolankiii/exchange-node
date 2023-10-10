import mongoose from "mongoose";
import { appConfig } from "../../config/app.js";
import BetCategory, { BET_CATEGORIES } from "../../models/v1/BetCategory.js";
import Event from "../../models/v1/Event.js";
import Sport from "../../models/v1/Sport.js";
import commonService from "./commonService.js";

/**
 *  Sidebar Sports List
 */
const sportsList = async () => {
  try {
    const startOfDay = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(
      new Date(new Date().setDate(new Date().getDate() + 1)).setUTCHours(23, 59, 59, 999)
    ).toISOString();
    const sports = await Sport.aggregate([
      {
        $match: {
          isActive: true,
          isDeleted: false,
        },
      },
      {
        $project: { name: 1, positionIndex: 1 },
      },
      {
        $lookup: {
          from: "competitions",
          localField: "_id",
          foreignField: "sportId",
          as: "competition",
          pipeline: [
            {
              $match: {
                isActive: true,
                isDeleted: false,
                completed: false,
                $and: [
                  { startDate: { $ne: null } },
                  { endDate: { $ne: null } },
                  { endDate: { $gte: new Date(startOfDay) } },
                ],
              },
            },
            {
              $project: {
                name: 1,
                startDate: 1,
                endDate: 1,
              },
            },
            {
              $lookup: {
                from: "events",
                localField: "_id",
                foreignField: "competitionId",
                as: "event",
                pipeline: [
                  {
                    $match: {
                      isActive: true,
                      isDeleted: false,
                      completed: false,
                      isManual: false,
                      matchDate: {
                        $gte: new Date(startOfDay),
                        $lt: new Date(endOfDay),
                      },
                    },
                  },
                  {
                    $project: {
                      name: 1,
                      matchDate: 1,
                      isFavourite: 1,
                      isLive: 1,
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        $addFields: {
          // Create a new field 'sortField' that is 1 for non-null values
          // and a high value (e.g., Infinity) for null values.
          sortField: {
            $cond: {
              if: { $eq: ["$positionIndex", null] },
              then: Infinity, // High value for null values
              else: "$positionIndex", // Actual field value for non-null values
            },
          },
        },
      },
      { $sort: { sortField: 1 } },
      {
        $project: {
          // Remove the temporary 'sortField' if you don't need it in the final result.
          sortField: 0,
        },
      },
    ]);

    for (var i = 0; i < sports.length; i++) {
      let allLiveEvent = 0;
      let allActiveEvent = 0;
      if (sports[i].competition.length > 0) {
        for (const competition of sports[i].competition) {
          if (competition.event?.length > 0) {
            allActiveEvent = competition.event.length;
            const liveEvent = competition.event.filter((event) => {
              return event.isLive;
            });
            allLiveEvent = liveEvent.length;
          }
        }
      }
      sports[i].getAllLiveEvent = allLiveEvent;
      sports[i].getAllActiveEvent = allActiveEvent;
    }
    return sports;
  } catch (e) {
    throw new Error(e);
  }
};

// Sport wise match list
const sportWiseMatchList = async (sportId) => {
  try {
    const startOfDay = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(
      new Date(new Date().setDate(new Date().getDate() + 1)).setUTCHours(23, 59, 59, 999)
    ).toISOString();

    const matchOddCategory = await BetCategory.findOne(
      {
        name: {
          $regex: new RegExp(`^${BET_CATEGORIES.MATCH_ODDS}$`, "i"),
        },
      },
      { _id: 1 }
    );
    if (!matchOddCategory) {
      throw new Error("Match odds bet category not found");
    }

    const events = await Event.aggregate([
      {
        $match: {
          sportId: new mongoose.Types.ObjectId(sportId),
          isActive: true,
          completed: false,
          isManual: false,
          matchDate: { $gte: new Date(startOfDay), $lt: new Date(endOfDay) },
        },
      },
      {
        $lookup: {
          from: "markets",
          localField: "_id",
          foreignField: "eventId",
          as: "market",
          pipeline: [
            {
              $match: { typeId: matchOddCategory._id },
            },
            {
              $project: { marketId: 1, competitionId: 1, startDate: 1 },
            },
          ],
        },
      },
      {
        $addFields: {
          marketId: { $first: "$market.marketId" },
          competitionId: { $first: "$market.competitionId" },
          time: { $dateToString: { format: "%H:%M", date: { $first: "$market.startDate" } } },
        },
      },
      {
        $lookup: {
          from: "competitions",
          localField: "competitionId",
          foreignField: "_id",
          as: "competition",
          pipeline: [{ $project: { name: 1 } }],
        },
      },
      {
        $project: {
          eventName: "$name",
          competitionName: { $first: "$competition.name" },
          matchDate: 1,
          isLive: 1,
          marketId: 1,
          market: 1,
          time: 1,
          countryCode: 1
        },
      },
      {
        $unset: ["market"],
      },
    ]);

    if (!events.length) {
      return [];
    }

    const marketPromises = [];

    const fetchEventMarketData = async (event) => {
      const marketUrl = `${appConfig.BASE_URL}?action=matchodds&market_id=${event.marketId}`;
      const { statusCode, data } = await commonService.fetchData(marketUrl);
      event.matchOdds = [];
      if (statusCode === 200 && data.length) {
        event.matchOdds = data[0].runners.map(({ back, lay, runner }) => ({ back, lay, runner }));
      }
      return event;
    };

    events.forEach((event) => {
      marketPromises.push(fetchEventMarketData(event));
    });

    const data = await Promise.all(marketPromises);

    return data;
  } catch (e) {
    throw new Error(e);
  }
};

export default {
  sportsList,
  sportWiseMatchList,
};
