import mongoose from "mongoose";
import { appConfig } from "../../config/app.js";
import BetCategory, { DEFAULT_CATEGORIES } from "../../models/v1/BetCategory.js";
import Competition from "../../models/v1/Competition.js";
import Event from "../../models/v1/Event.js";
import Market from "../../models/v1/Market.js";
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
                endDate: 1
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
                      isLive: 1
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

    let findMatchOdds = await BetCategory.findOne(
      {
        name: DEFAULT_CATEGORIES[0],
      },
      { _id: 1 }
    );

    let findEvents = await Event.find(
      {
        sportId: sportId,
        matchDate: {
          $gte: startOfDay,
          $lt: endOfDay,
        },
        isActive: true,
        completed: false
      },
      { name: 1, matchDate: 1, _id: 1, apiCompetitionId: 1, isLive: 1 }
    ).sort({ matchDate: 1 });
    let ids = findEvents.map((item) => item._id);
    let findMarketIds = await Market.find(
      {
        typeId: findMatchOdds._id,
        eventId: { $in: ids },
      },
      { _id: 0, marketId: 1, eventId: 1 }
    ).sort({ startDate: 1 });
    if (findMarketIds.length > 0) {
      let allMarketId = findMarketIds
        .map((item) => item.marketId)
        .toString()
        .replace(/["']/g, "");
      var marketUrl = `${appConfig.BASE_URL}?action=matchodds&market_id=${allMarketId}`;
      const { statusCode, data } = await commonService.fetchData(marketUrl);
      let allData = [];
      if (statusCode === 200) {
        for (const market of data) {
          let eventId = findMarketIds.filter((item) => item.marketId == Number(market.marketId));
          let eventInfo = findEvents.filter((item) => item._id == eventId[0].eventId.toString());
          let findCompetition = await Competition.findOne(
            {
              apiCompetitionId: eventInfo[0].apiCompetitionId,
            },
            { name: 1 }
          );
          if (eventInfo.length > 0 && findCompetition) {
            allData.push({
              _id: eventInfo[0]._id,
              eventName: eventInfo[0].name,
              competitionName: findCompetition.name,
              matchDate: eventInfo[0].matchDate,
              isLive: eventInfo[0].isLive,
              matchOdds: market["runners"].map(function (item) {
                delete item.ex;
                delete item.selectionId;
                delete item.status;
                delete item.lastPriceTraded;
                delete item.removalDate;

                return item;
              }),
            });
          }
        }
      }
      return allData;
    }
    else {
      return [];
    }
  } catch (e) {
    throw new Error(e);
  }
};

export default {
  sportsList,
  sportWiseMatchList,
};
