import mongoose from "mongoose";
import { appConfig } from "../../config/app.js";
import cronController from "../../controllers/v1/cronController.js";
import ErrorResponse from "../../lib/error-handling/error-response.js";
import ArrayProto from "../../lib/helpers/array-proto.js";
import BetCategory, { DEFAULT_CATEGORIES } from "../../models/v1/BetCategory.js";
import Competition from "../../models/v1/Competition.js";
import Event from "../../models/v1/Event.js";
import Market from "../../models/v1/Market.js";
import MarketRunner, { RUNNER_STATUS } from "../../models/v1/MarketRunner.js";
import Sport from "../../models/v1/Sport.js";
import commonService from "./commonService.js";

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

    if (statusCode !== 200 || !data.length) {
      return [];
    }

    const allData = await Promise.all(
      data.map(async (dataItem) => {
        const market = await Market.findOne({ marketId: dataItem.marketId });

        const { minStake, maxStake } =
          market.minStake !== 0 || market.maxStake !== 0 ? market : await Event.findOne({ _id: market.eventId });

        const matchOdds = dataItem.runners
          ? dataItem.runners.map((item) => {
              delete item.ex;
              return item;
            })
          : [];

        return { marketId: dataItem.marketId, min: minStake, max: maxStake, matchOdds };
      })
    );

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
    startDate,
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
      startDate,
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

    (market.name = reqBody.name),
      (market.betDelay = reqBody.betDelay),
      (market.visibleToPlayer = reqBody.visibleToPlayer),
      (market.positionIndex = reqBody.positionIndex),
      (market.minStake = reqBody.minStake),
      (market.maxStake = reqBody.maxStake),
      (market.maxBetLiability = reqBody.maxBetLiability),
      (market.maxMarketLiability = reqBody.maxMarketLiability),
      (market.maxMarketProfit = reqBody.maxMarketProfit),
      (market.startDate = reqBody.startDate),
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
    apiEventId.push(mongoEventId.apiEventId);
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
    const marketUrl = `${appConfig.BASE_URL}?action=fancy&event_id=${eventId}`;
    const [market, { statusCode, data = [] }] = await Promise.all([
      Market.findOne({ apiEventId: eventId, name: "Normal" }),
      commonService.fetchData(marketUrl),
    ]);

    if (!(market && statusCode === 200 && data.length)) {
      return [];
    }

    const marketRunners = await MarketRunner.find({
      marketId: market._id,
      status: { $ne: RUNNER_STATUS.IN_ACTIVE },
    });

    const oldRunnerIds = new Set(marketRunners.map((runner) => runner.selectionId));

    const newRunnersToAdd = data.reduce((acc, obj) => {
      if (!oldRunnerIds.has(obj.SelectionId)) {
        acc.push({
          marketId: market._id,
          selectionId: obj.SelectionId,
          runnerName: obj.RunnerName,
        });
      }
      return acc;
    }, []);

    const oldRunnerIdsToRemove = marketRunners.reduce((acc, obj) => {
      if (!data.some((obj2) => obj.selectionId === obj2.SelectionId)) {
        acc.push(obj.selectionId);
      }
      return acc;
    }, []);

    await Promise.all([
      MarketRunner.updateMany(
        { selectionId: { $in: oldRunnerIdsToRemove }, marketId: new mongoose.Types.ObjectId(market._id) },
        { status: RUNNER_STATUS.IN_ACTIVE }
      ),
      ...newRunnersToAdd.map((obj) => MarketRunner.create(obj)),
    ]);

    const sortedData = new ArrayProto(data).sortByKeyAsc({ key: "RunnerName" });

    if (newRunnersToAdd.length) {
      for (const dataItem of sortedData) {
        const filterData = marketRunners.find((item) => item.selectionId === dataItem.SelectionId);
        if (filterData) {
          dataItem.runnerId = filterData._id;
          dataItem.marketId = filterData.marketId;
          if (!dataItem.min) {
            dataItem.min = String(market.minStake);
            dataItem.max = String(market.maxStake);
          }
        }
      }
    }

    return sortedData;
  } catch (e) {
    return e;
  }
};

const getFencyPriceByRunner = async (runnerId) => {
  try {
    let findMarketRuner = await MarketRunner.findOne({ _id: runnerId });
    let findMarket = await Market.findOne({ _id: findMarketRuner.marketId });
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

const getBookmakerPrice = async (marketId) => {
  try {
    const allMarketId = marketId.toString().replace(/["']/g, "");
    const marketUrl = `${appConfig.BASE_URL}?action=bookmakermatchodds&market_id=${allMarketId}`;
    const { statusCode, data } = await commonService.fetchData(marketUrl);

    if (statusCode !== 200 || !data.length) {
      return [];
    }

    const allData = await Promise.all(
      data.map(async (dataItem) => {
        const market = await Market.findOne({ marketId: dataItem.marketId });

        const { minStake, maxStake } =
          market.minStake !== 0 || market.maxStake !== 0 ? market : await Event.findOne({ _id: market.eventId });

        const matchOdds = dataItem.runners
          ? dataItem.runners.map((item) => {
              delete item.ex;
              return item;
            })
          : [];

        return { marketId: dataItem.marketId, min: minStake, max: maxStake, matchOdds };
      })
    );

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
  getFencyPriceByRunner,
};
