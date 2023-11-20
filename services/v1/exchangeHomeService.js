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
            allActiveEvent = allActiveEvent + competition.event.length;
            const liveEvent = competition.event.filter((event) => {
              return event.isLive;
            });
            allLiveEvent = allLiveEvent + liveEvent.length;
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
const sportWiseMatchList = async (sportId, type, userId) => {
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

    let filters = {
      isActive: true,
      completed: false,
      isManual: false,
      isDeleted: false,
      'competition.isActive': true,
      'competition.isDeleted': false,
      'competition.completed': false,
      $and: [
        { 'competition.startDate': { $ne: null } },
        { 'competition.endDate': { $ne: null } },
        { 'competition.endDate': { $gte: new Date(startOfDay) } },
      ],
    };
    if (type == 'upcoming') {
      filters.matchDate = {
        $gt: new Date(),
        $lte: new Date(endOfDay)
      };
    }
    else if (type == 'live') {
      filters.isLive = true;
      filters.matchDate = { $gte: new Date(startOfDay), $lt: new Date(endOfDay) };
    }
    else if (type == 'favourite') {
      filters['favourite.userId'] = new mongoose.Types.ObjectId(userId);
    }
    else {
      filters.matchDate = { $gte: new Date(startOfDay), $lt: new Date(endOfDay) };
    }

    if (sportId) {
      filters.sportId = new mongoose.Types.ObjectId(sportId);
    }

    let events = await Event.aggregate([
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
              $project: { marketId: 1, competitionId: 1, startDate: 1, time: { $dateToString: { format: "%H:%M", date: "$startDate" } }, },
            },
          ],
        },
      },
      {
        $addFields: {
          marketId: { $first: "$market.marketId" },
          competitionId: { $first: "$market.competitionId" },
        },
      },
      {
        $lookup: {
          from: "competitions",
          localField: "competitionId",
          foreignField: "_id",
          as: "competition",
          pipeline: [
            { $project: { name: 1, isActive: 1, isDeleted: 1, completed: 1, startDate: 1, endDate: 1 } }],
        },
      },
      {
        $unwind: {
          path: "$competition",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "sports",
          localField: "sportId",
          foreignField: "_id",
          as: "sport",
          pipeline: [
            { $project: { name: 1 } }],
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
          from: "favourites",
          localField: "_id",
          foreignField: "eventId",
          as: "favourite",
          pipeline: [
            {
              $project: { userId: 1, eventId: 1 },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$favourite",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: filters
      },
      {
        $project: {
          eventName: "$name",
          competitionName: "$competition.name",
          matchDate: "$matchDate",
          isLive: "$isLive",
          marketId: "$marketId",
          market: "$market",
          countryCode: "$countryCode",
          videoStreamId: "$videoStreamId",
          sportId: "$sportId",
          sportName: '$sport.name',
          favourite:
            { $cond: [{ $not: ["$favourite"] }, 0, 1] }
        },
      },
      {
        $group: {
          _id: "$sportId",
          sportName: { $first: "$sportName" },
          events: { $push: "$$ROOT" }
        }
      }
    ]);

    if (!events.length) {
      events = [];
    }

    const fetchEventMarketData = async (event) => {
      const marketUrl = `${appConfig.BASE_URL}?action=matchodds&market_id=${event.market[0]?.marketId}`;
      const { statusCode, data } = await commonService.fetchData(marketUrl);

      let matchOdds;
      if (statusCode === 200 && data.length) {
        matchOdds = data[0].runners.map(({ back, lay, runner }) => ({ back, lay, runner }));
      }
      else {
        matchOdds = []
      }

      return matchOdds;
    };

    for (var i = 0; i < events.length; i++) {
      for (var j = 0; j < events[i].events.length; j++) {
        events[i].events[j].matchOdds = await fetchEventMarketData(events[i].events[j]);
      }
    }

    let newFilters = {
      isActive: true,
      completed: false,
      isManual: false,
      isDeleted: false,
      "competitionData.isActive": true,
      "competitionData.isDeleted": false,
      "competitionData.completed": false,
      $and: [
        { 'competitionData.startDate': { $ne: null } },
        { 'competitionData.endDate': { $ne: null } },
        { 'competitionData.endDate': { $gte: new Date(startOfDay) } },
      ],
    }
    let counts = await Event.aggregate([
      {
        $lookup: {
          from: "competitions",
          localField: "competitionId",
          foreignField: "_id",
          as: "competitionData",
        },
      },
      {
        $unwind: "$competitionData",
      },
      {
        $lookup: {
          from: "favourites",
          localField: "_id",
          foreignField: "eventId",
          as: "favourite",
          pipeline: [
            {
              $project: { userId: 1, eventId: 1 },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$favourite",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $facet: {
          liveEventCount: [
            {
              $match: {
                isLive: true,
                matchDate: { $gte: new Date(startOfDay), $lt: new Date(endOfDay) },
                ...newFilters
              },
            },
            { $count: "total" },
          ],
          upcomingEventCount: [
            {
              $match: {
                matchDate: {
                  $gt: new Date(),
                  $lte: new Date(endOfDay)
                },
                ...newFilters
              },
            },
            { $count: "total" },
          ],
          totalEvent: [
            {
              $match: {
                matchDate: { $gte: new Date(startOfDay), $lt: new Date(endOfDay) },
                ...newFilters
              }
            },
            { $count: "total" },
          ],
          favouriteEventCount: [
            {
              $match: {
                matchDate: { $gte: new Date(startOfDay), $lt: new Date(endOfDay) },
                'favourite.userId': new mongoose.Types.ObjectId(userId),
                ...newFilters
              },
            },
            { $count: "total" },
          ],
        },
      },
      {
        $project: {
          liveEventCount: {
            $arrayElemAt: [
              "$liveEventCount.total",
              0,
            ],
          },
          upcomingEventCount: {
            $arrayElemAt: [
              "$upcomingEventCount.total",
              0,
            ],
          },
          totalEvent: {
            $arrayElemAt: [
              "$totalEvent.total",
              0,
            ],
          },
          favouriteEventCount: {
            $arrayElemAt: [
              "$favouriteEventCount.total",
              0,
            ],
          },
        },
      },
    ]);

    if (sportId) {
      events = events[0]?.events ? events[0].events : []
    }

    let finalResult = {
      totalEvent: counts[0]?.totalEvent ? counts[0].totalEvent : 0,
      totalLiveEvent: counts[0]?.liveEventCount ? counts[0].liveEventCount : 0,
      totalUpcomingEvent: counts[0]?.upcomingEventCount ? counts[0].upcomingEventCount : 0,
      totalFavouriteEvent: counts[0]?.favouriteEventCount ? counts[0].favouriteEventCount : 0,
      events
    }
    return finalResult;
  } catch (e) {
    throw new Error(e);
  }
};

export default {
  sportsList,
  sportWiseMatchList,
};
