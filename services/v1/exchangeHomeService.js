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
    const allSports = await Sport.find({ isActive: true, isDeleted: false }, { _id: 1, name: 1 }).sort("name");
    const startOfDay = new Date(new Date()).toISOString();
    const endOfDay = new Date(
      new Date(new Date().setDate(new Date().getDate() + 1)).setUTCHours(23, 59, 59, 999)
    ).toISOString();
    let data = [];
    for (var i = 0; i < allSports.length; i++) {
      const getAllCompetition = await Competition.find(
        { isActive: true, isDeleted: false, sportId: allSports[i]._id, completed: false },
        { _id: 1, name: 1 }
      );
      const getAllLiveEvent = await Event.count(
        {
          isActive: true, sportId: allSports[i]._id, isDeleted: false, completed: false, isLive: true, matchDate: {
            $gte: startOfDay,
            $lt: endOfDay,
          },
        }
      );
      const getAllActiveEvent = await Event.count(
        {
          isDeleted: false, sportId: allSports[i]._id, completed: false, isActive: true, matchDate: {
            $gte: startOfDay,
            $lt: endOfDay,
          },
        }
      );
      let competitionEvent = [];
      for (var j = 0; j < getAllCompetition.length; j++) {
        const getAllEvent = await Event.find(
          {
            isActive: true, isDeleted: false, competitionId: getAllCompetition[j]._id, completed: false, matchDate: {
              $gte: startOfDay,
              $lt: endOfDay,
            },
          },
          { _id: 1, name: 1, isFavourite: 1 }
        );
        competitionEvent.push({
          _id: getAllCompetition[j].id,
          name: getAllCompetition[j].name,
          event: getAllEvent,
        });
      }
      data.push({
        _id: allSports[i]._id,
        name: allSports[i].name,
        allLiveEvent: getAllLiveEvent,
        allActiveEvent: getAllActiveEvent,
        competition: competitionEvent,
      });
    }
    return data;
  } catch (e) {
    throw new Error(e);
  }
};

// Sport wise match list
const sportWiseMatchList = async (sportId) => {
  try {
    const startOfDay = new Date(new Date()).toISOString();
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
