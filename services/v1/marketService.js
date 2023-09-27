import { appConfig } from "../../config/app.js";
import BetCategory, { DEFAULT_CATEGORIES } from "../../models/v1/BetCategory.js";
import Competition from "../../models/v1/Competition.js";
import Event from "../../models/v1/Event.js";
import Market from "../../models/v1/Market.js";
import Sport from "../../models/v1/Sport.js";
import commonService from "./commonService.js";
import ErrorResponse from "../../lib/error-handling/error-response.js";
import cronController from "../../controllers/v1/cronController.js";
import MarketRunner, { RUNNER_STATUS } from "../../models/v1/MarketRunner.js";
import mongoose from "mongoose";

const syncMarkets = async (data) => {
  //Get Bet Categories
  var betCategories = await BetCategory.find({ name: { $in: DEFAULT_CATEGORIES } });
  const betCategoryIdMap = betCategories.reduce((acc, betCategory) => {
    acc[betCategory.name] = betCategory._id;
    return acc;
  }, {});

  // Extract the fields separately
  const competitionIds = data.map((item) => item.stCompititionID);
  const eventIds = data.map((item) => item.stEventID);
  const sportsIds = data.map((item) => item.stSportsID);

  //Get All Sports
  var sports = await Sport.find({ apiSportId: { $in: sportsIds } });
  // Create an array of objects with sportId as key and _id as value
  const sportIdMap = sports.reduce((acc, sport) => {
    acc[sport.apiSportId] = sport._id;
    return acc;
  }, {});

  //Get All Competition
  var competitions = await Competition.find({ apiCompetitionId: { $in: competitionIds } });
  // Create an array of objects with competitionId as key and _id as value
  const competitionIdMap = competitions.reduce((acc, competition) => {
    acc[competition.apiCompetitionId] = competition._id;
    return acc;
  }, {});

  //Get All Events
  var events = await Event.find({ apiEventId: { $in: eventIds } });
  // Create an array of objects with eventId as key and _id as value
  const eventIdMap = events.reduce((acc, event) => {
    acc[event.apiEventId] = event._id;
    return acc;
  }, {});

  var allMarketData = [];
  data.map((record) => {
    if (
      sportIdMap.hasOwnProperty(record.stSportsID) &&
      competitionIdMap.hasOwnProperty(record.stCompititionID) &&
      eventIdMap.hasOwnProperty(record.stEventID)
    ) {
      var marketId = record.stMarketID;
      var type_id = "";
      if (record.stMarketName === "Match Odds") {
        type_id = betCategoryIdMap[DEFAULT_CATEGORIES[0]];
      } else if (record.stMarketName === "Match Odds-BOOK MAKER-M") {
        type_id = betCategoryIdMap[DEFAULT_CATEGORIES[1]];
      } else {
        type_id = betCategoryIdMap[DEFAULT_CATEGORIES[2]];
      }

      var market = {
        name: record.stEventName,
        typeId: type_id,
        marketStatus: record.btMarketStatus,
        marketId: record.stMarketID,
        apiEventId: record.stEventID,
        eventId: eventIdMap[record.stEventID],
        apiCompetitionId: record.stCompititionID,
        competitionId: competitionIdMap[record.stCompititionID],
        apiSportId: record.stSportsID,
        sportId: sportIdMap[record.stSportsID],
        marketRunners: record.submaster,
        startDate: record.dtStartDate,
      };

      allMarketData.push({
        updateOne: {
          filter: { marketId }, // Use the unique identifier for the document
          update: { $set: market }, // Use $set to update specified fields
          upsert: true, // Create a new document if it doesn't exist
        },
      });
    }
    // else {
    //   console.log(record);
    // }
  });

  // Perform the bulkWrite operation
  const result = await Market.bulkWrite(allMarketData);
  return result;
};

const getMatchOdds = async (markeId) => {
  try {
    let allMarketId = markeId.toString().replace(/["']/g, "");
    var marketUrl = `${appConfig.BASE_URL}?action=matchodds&market_id=${allMarketId}`;
    const { statusCode, data } = await commonService.fetchData(marketUrl);
    let allData = [];
    if (statusCode === 200) {
      for (const market of data) {
        let findMarket = await Market.findOne({ marketId: market["marketId"] });
        let min, max;
        if (findMarket.minStake != 0 || findMarket.maxStake != 0) {
          min = findMarket.minStake;
          max = findMarket.maxStake;
        }
        else {
          let findEvent = await Event.findOne({ _id: findMarket.eventId });
          min = findEvent.minStake;
          max = findEvent.maxStake;
        }
        if (market["runners"]) {
          allData.push({
            marketId: market["marketId"],
            min,
            max,
            matchOdds: market["runners"].map(function (item) {
              delete item.ex;
              return item;
            }),
          });
        } else {
          allData.push({
            marketId: market["marketId"],
            matchOdds: {},
          });
        }
      }
    }
    return allData;
  } catch (e) {
    return e;
  }
};

/**
 * Create market in the database
 */
const addMarket = async ({ ...reqBody }) => {
  const {
    name,
    typeId,
    eventId,
    competitionId,
    sportId,
    isManual,
    betDelay,
    visibleToPlayer,
    positionIndex,
    minStake,
    maxStake,
    maxBetLiability,
    maxMarketLiability,
    maxMarketProfit,
    startDate
  } = reqBody;

  try {
    const newMarketObj = {
      name,
      typeId,
      eventId,
      competitionId,
      sportId,
      isManual,
      betDelay,
      visibleToPlayer,
      positionIndex,
      minStake,
      maxStake,
      maxBetLiability,
      maxMarketLiability,
      maxMarketProfit,
      startDate
    };

    const newMarket = await Market.create(newMarketObj);

    return newMarket;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * update market in the database
 */
const modifyMarket = async ({ ...reqBody }) => {
  try {
    const market = await Market.findById(reqBody._id);

    if (!market) {
      throw new Error("Market not found.");
    }

    market.name = reqBody.name,
      market.betDelay = reqBody.betDelay,
      market.visibleToPlayer = reqBody.visibleToPlayer,
      market.positionIndex = reqBody.positionIndex,
      market.minStake = reqBody.minStake,
      market.maxStake = reqBody.maxStake,
      market.maxBetLiability = reqBody.maxBetLiability,
      market.maxMarketLiability = reqBody.maxMarketLiability,
      market.maxMarketProfit = reqBody.maxMarketProfit,
      market.startDate = reqBody.startDate,

      await market.save();

    return market;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};


/**
 * sync market by event id in the database
 */
const syncMarketByEventId = async ({ eventId }) => {
  try {
    const mongoEventId = await Event.findById(eventId);
    let apiEventId = [];
    apiEventId.push(mongoEventId.apiEventId)
    await cronController.syncMarket(apiEventId);
    await cronController.syncMarketBookmakers(apiEventId);
    await cronController.syncMarketFancy(apiEventId);
    return eventId;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const getFencyPrice = async (eventId) => {
  try {
    let findMarket = await Market.findOne({ apiEventId: eventId, name: "Normal" })
    var marketUrl = `${appConfig.BASE_URL}?action=fancy&event_id=${eventId}`;
    const { statusCode, data } = await commonService.fetchData(marketUrl);
    if (findMarket) {
      let findMarketRunners = await MarketRunner.find({ marketId: findMarket._id, status: { $ne: RUNNER_STATUS.IN_ACTIVE } })
      if (statusCode === 200) {
        var newMarketRunnersAdd = data.filter(function (obj) {
          return !findMarketRunners.some(function (obj2) {
            return obj.SelectionId == obj2.selectionId;
          });
        });
        let promise = []
        var oldMarketRunnersRemove = findMarketRunners.filter(function (obj) {
          return !data.some(function (obj2) {
            return obj.selectionId == obj2.SelectionId;
          });
        }).map((item) => item.selectionId);
        promise.push(MarketRunner.updateMany({ selectionId: { $in: oldMarketRunnersRemove }, marketId: new mongoose.Types.ObjectId(findMarket._id) }, { status: RUNNER_STATUS.IN_ACTIVE }));

        for (var j = 0; j < newMarketRunnersAdd.length; j++) {
          const marketRunnerObj = {
            marketId: findMarket._id,
            selectionId: newMarketRunnersAdd[j].SelectionId,
            runnerName: newMarketRunnersAdd[j].RunnerName,
          };

          promise.push(MarketRunner.create(marketRunnerObj));
        }
        await Promise.all(promise);
      }
      for (var k = 0; k < data.length; k++) {
        let filterdata = findMarketRunners.filter(function (item) {
          return item.selectionId == data[k].SelectionId;
        });
        data[k].runnerId = filterdata[0]._id;
        data[k].marketId = filterdata[0].marketId;
        if (data[k].min == undefined || data[k].min == "" || data[k].min == null || data[k].max == undefined || data[k].max == "" || data[k].max == null) {
          data[k].min = String(findMarket.minStake);
          data[k].max = String(findMarket.maxStake);
        }
      }
    }
    return data;
  } catch (e) {
    return e;
  }
};

const getFencyPriceByRunner = async (runnerId) => {
  try {
    let findMarketRuner = await MarketRunner.findOne({ _id: runnerId })
    let findMarket = await Market.findOne({ _id: findMarketRuner.marketId })
    var marketUrl = `${appConfig.BASE_URL}?action=fancy&event_id=${Number(findMarket.apiEventId)}`;
    const { statusCode, data } = await commonService.fetchData(marketUrl);
    if (statusCode === 200) {
      var newMarketRunnersAdd = data.filter(function (element) {
        return element.SelectionId == findMarketRuner.selectionId;
      });
      return newMarketRunnersAdd;
    }

  } catch (e) {
    return e;
  }
};

const getBookmakerPrice = async (markeId) => {
  try {
    let allMarketId = markeId.toString().replace(/["']/g, "");
    var marketUrl = `${appConfig.BASE_URL}?action=bookmakermatchodds&market_id=${allMarketId}`;
    const { statusCode, data } = await commonService.fetchData(marketUrl);
    let allData = [];
    if (statusCode === 200) {
      for (const market of data) {
        let findMarket = await Market.findOne({ marketId: market["marketId"] });
        let min, max;
        if (findMarket.minStake != 0 || findMarket.maxStake != 0) {
          min = findMarket.minStake;
          max = findMarket.maxStake;
        }
        else {
          let findEvent = await Event.findOne({ _id: findMarket.eventId });
          min = findEvent.minStake;
          max = findEvent.maxStake;
        }
        if (market["runners"]) {
          allData.push({
            marketId: market["marketId"],
            min,
            max,
            matchOdds: market["runners"].map(function (item) {
              delete item.ex;
              return item;
            }),
          });
        } else {
          allData.push({
            marketId: market["marketId"],
            matchOdds: {},
          });
        }
      }
    }
    return allData;
  } catch (e) {
    return e;
  }
};

export default {
  syncMarkets,
  getMatchOdds,
  addMarket,
  modifyMarket,
  syncMarketByEventId,
  getFencyPrice,
  getBookmakerPrice,
  getFencyPriceByRunner
};
