import { isValidObjectId } from "mongoose";
import Yup from "yup";
import Bet from "../../models/v1/Bet.js";

async function createBetRequest(req) {
  const validationSchema = Yup.object().shape({
    marketId: Yup.string()
      .required()
      .test("marketId", "Invalid marketId!", (v) => !v || isValidObjectId),
    eventId: Yup.string()
      .required()
      .test("eventId", "Invalid eventId!", (v) => !v || isValidObjectId),
    apiMarketId: Yup.string().nullable(true),
    runnerSelectionId: Yup.number().required(),
    odds: Yup.number().required(),
    stake: Yup.number().required(),
    isBack: Yup.boolean().required(),
    betOrderType: Yup.string().required(),
    deviceInfo: Yup.string().required(),
    ipAddress: Yup.string().required(),
    runnerId: Yup.string()
      .required()
      .test("runnerId", "Invalid runnerId!", (v) => !v || isValidObjectId),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function getAllBetRequest(req) {
  req.body.page = req.body?.page ? Number(req.body.page) : null;
  req.body.perPage = req.body?.perPage ? Number(req.body.perPage) : 10;
  req.body.sortBy = req.body?.sortBy ? req.body.sortBy : "createdAt";
  req.body.direction = req.body?.direction ? req.body.direction : "desc";
  req.body.searchQuery = req.body?.searchQuery ? req.body.searchQuery?.trim() : null;
  req.body.eventId = req.body.eventId || null;
  req.body.marketId = req.body.marketId || null;
  req.body.betType = req.body.betType || null;
  req.body.username = req.body.username || null;
  req.body.startDate = req.body?.startDate || null;
  req.body.endDate = req.body?.endDate || null;

  const validationSchema = Yup.object().shape({
    page: Yup.number().nullable(true),

    perPage: Yup.number(),

    sortBy: Yup.string().oneOf(Object.keys(Bet.schema.paths), "Invalid sortBy key."),

    direction: Yup.string().oneOf(["asc", "desc", null], "Invalid direction use 'asc' or 'desc'.").nullable(true),

    searchQuery: Yup.string().nullable(true),

    eventId: Yup.string()
      .nullable(true)
      .test("eventId", "Invalid eventId!", (v) => !v || isValidObjectId),

    marketId: Yup.string()
      .nullable(true)
      .test("marketId", "Invalid marketId!", (v) => !v || isValidObjectId),

    betType: Yup.string().nullable(true),
    username: Yup.string().nullable(true),
    startDate: Yup.date().nullable(true),
    endDate: Yup.date().nullable(true),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function betCompleteRequest(req) {
  const validationSchema = Yup.object().shape({
    marketId: Yup.string()
      .required()
      .test("marketId", "Invalid marketId!", (v) => !v || isValidObjectId),
    winRunnerId: Yup.string()
      .required()
      .test("marketRunnerId", "Invalid marketRunnerId!", (v) => !v || isValidObjectId),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function betCompleteFancyRequest(req) {
  const validationSchema = Yup.object().shape({
    marketId: Yup.string()
      .required()
      .test("marketId", "Invalid marketId!", (v) => !v || isValidObjectId),
    marketRunnerId: Yup.string()
      .required()
      .test("marketRunnerId", "Invalid market runner id!", (v) => !v || isValidObjectId),
    winScore: Yup.number().required(),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function settlementRequest(req) {
  const validationSchema = Yup.object().shape({
    settlementData: Yup.array().required(),
    loginUserId: Yup.string()
      .nullable(true)
      .test("userId", "Invalid userId!", (v) => !v || isValidObjectId),
    transactionCode: Yup.string().length(6).required(),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function getRunnerPlsRequest(req) {
  const validationSchema = Yup.object().shape({
    marketId: Yup.string()
      .required()
      .test("marketId", "Invalid marketId!", (v) => !v || isValidObjectId),
    eventId: Yup.string()
      .required()
      .test("eventId", "Invalid eventId!", (v) => !v || isValidObjectId),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function getCurrentBetsUserwise(req) {
  req.body.page = req.body?.page ? Number(req.body.page) : null;
  req.body.perPage = req.body?.perPage ? Number(req.body.perPage) : 10;
  req.body.sortBy = req.body?.sortBy ? req.body.sortBy : "createdAt";
  req.body.direction = req.body?.direction ? req.body.direction : "desc";
  req.body.betType = req.body.betType || null;
  req.body.betResultStatus = req.body.betResultStatus || null;

  const validationSchema = Yup.object().shape({
    page: Yup.number().nullable(true),

    perPage: Yup.number(),

    sortBy: Yup.string().oneOf(Object.keys(Bet.schema.paths), "Invalid sortBy key."),

    direction: Yup.string().oneOf(["asc", "desc", null], "Invalid direction use 'asc' or 'desc'.").nullable(true),

    loginUserId: Yup.string()
      .nullable(true)
      .test("userId", "Invalid userId!", (v) => !v || isValidObjectId),
    betType: Yup.string().nullable(true),
    betResultStatus: Yup.string().nullable(true),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function getCompleteBetEventWise(req) {
  const validationSchema = Yup.object().shape({
    loginUserId: Yup.string()
      .required()
      .test("userId", "Invalid userId!", (v) => !v || isValidObjectId),
    eventId: Yup.string()
      .required()
      .test("eventId", "Invalid eventId!", (v) => !v || isValidObjectId),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function reverResultRequest(req) {
  const validationSchema = Yup.object().shape({
    marketId: Yup.string()
      .required()
      .test("marketId", "Invalid marketId!", (v) => !v || isValidObjectId),
    marketRunnerId: Yup.string(),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function getRunAmountRequest(req) {
  const validationSchema = Yup.object().shape({
    loginUserId: Yup.string()
      .required()
      .test("userId", "Invalid userId!", (v) => !v || isValidObjectId),
    marketRunnerId: Yup.string(),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function getUserExposureListRequest(req) {
  const validationSchema = Yup.object().shape({
    loginUserId: Yup.string()
      .required()
      .test("userId", "Invalid userId!", (v) => !v || isValidObjectId),
  });

  await validationSchema.validate(req.body);

  return req;
}

export default {
  createBetRequest,
  getAllBetRequest,
  betCompleteRequest,
  betCompleteFancyRequest,
  settlementRequest,
  getRunnerPlsRequest,
  getCurrentBetsUserwise,
  getCompleteBetEventWise,
  reverResultRequest,
  getRunAmountRequest,
  getUserExposureListRequest,
};
