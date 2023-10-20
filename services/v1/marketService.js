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
 * update market runner in the database
 */
const modifyMarketRunner = async ({ ...reqBody }) => {
  try {
    const market = await MarketRunner.findById(reqBody._id);

    if (!market) {
      throw new Error("Market Runer not found.");
    }

    market.betDelay = reqBody.betDelay;
    market.minStake = reqBody.minStake;
    market.maxStake = reqBody.maxStake;
    market.status = reqBody.status;
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

    const [market, marketFancy1, { statusCode, data = [] }] = await Promise.all([
      Market.findOne({ apiEventId: eventId, name: "Normal" }),
      Market.findOne({ apiEventId: eventId, name: "Fancy1" }),
      commonService.fetchData(marketUrl),
    ]);

    if (!(market && statusCode === 200 && data.length)) {
      return [];
    }

    const marketRunners = await MarketRunner.find({
      marketId: {
        $in: [market._id, marketFancy1._id],
      },
      // status: { $ne: RUNNER_STATUS.IN_ACTIVE },
    });

    const oldRunnerIds = new Set(marketRunners.map((runner) => runner.selectionId));
    const newRunnersToAdd = data.reduce((acc, obj) => {
      if (!oldRunnerIds.has(Number(obj.SelectionId))) {
        let marketId = "";
        if (obj.gtype) {
          if (obj.gtype == "fancy1") {
            marketId = marketFancy1._id;
          } else {
            marketId = market._id;
          }
        }
        acc.push({
          marketId: marketId,
          selectionId: obj.SelectionId,
          runnerName: obj.RunnerName,
        });
      }
      return acc;
    }, []);

    const oldRunnerIdsToRemove = marketRunners.reduce((acc, obj) => {
      if (!data.some((obj2) => obj.selectionId === Number(obj2.SelectionId))) {
        acc.push(obj.selectionId);
      }
      return acc;
    }, []);

    const [newRunners] = await Promise.all([
      ...newRunnersToAdd.map((obj) => {
        let findRunnerAlreadyAdd = marketRunners.filter(
          (item) => item.selectionId == obj.selectionId && item.marketId == obj.marketId
        );
        if (findRunnerAlreadyAdd.length > 0) {
          return MarketRunner.findOneAndUpdate(
            { selectionId: findRunnerAlreadyAdd[0].selectionId, marketId: findRunnerAlreadyAdd[0].marketId },
            { $set: { status: RUNNER_STATUS.ACTIVE } },
            { upsert: true, new: true }
          );
        } else {
          return MarketRunner.create(obj);
        }
      }),

      MarketRunner.updateMany(
        { selectionId: { $in: oldRunnerIdsToRemove }, marketId: new mongoose.Types.ObjectId(market._id) },
        { status: RUNNER_STATUS.IN_ACTIVE }
      ),
      MarketRunner.updateMany(
        { selectionId: { $in: oldRunnerIdsToRemove }, marketId: new mongoose.Types.ObjectId(marketFancy1._id) },
        { status: RUNNER_STATUS.IN_ACTIVE }
      ),
    ]);
    const sortedData = new ArrayProto(data).sortByKeyAsc({ key: "RunnerName" });
    const allRunners = marketRunners.concat(newRunners);

    for (const dataItem of sortedData) {
      let typeName = "";
      let typeId = "";
      let min = "";
      let max = "";
      if (dataItem.gtype == "fancy1") {
        typeName = marketFancy1.name;
        typeId = marketFancy1._id;
        min = marketFancy1.minStake;
        max = marketFancy1.maxStake;
      } else {
        typeName = market.name;
        typeId = market._id;
        min = market.minStake;
        max = market.maxStake;
      }
      const runner = allRunners.find((item) => item.selectionId === Number(dataItem.SelectionId));
      if (runner) {
        dataItem.runnerId = runner._id;
        dataItem.marketId = runner.marketId;
        dataItem.typeName = typeName;
        dataItem.typeId = typeId;
        if (min != 0 || !dataItem.min) {
          dataItem.min = String(min);
          dataItem.max = String(max);
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

const liveScore = async (eventId) => {
  try {
    const liveScoreUrl = `${appConfig.BASE_URL}?action=score&match_id=${eventId}`;
    const { statusCode, data } = await commonService.fetchData(liveScoreUrl);
    if (!(statusCode === 200 && data.length)) {
      return [];
    }
    return data;
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
  modifyMarketRunner,
  liveScore,
};
