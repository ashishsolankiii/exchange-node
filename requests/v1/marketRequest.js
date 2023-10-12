import { isValidObjectId } from "mongoose";
import Yup from "yup";
import { isValidTime } from "../../lib/helpers/validation.js";

async function createMarketRequest(req) {
  const validationSchema = Yup.object().shape({
    name: Yup.string().required(),
    typeId: Yup.string().required().test("betCategoryId", "Invalid betCategoryId!", isValidObjectId),
    eventId: Yup.string().required().test("eventId", "Invalid eventId!", isValidObjectId),
    competitionId: Yup.string().required().test("competitionId", "Invalid competitionId!", isValidObjectId),
    sportId: Yup.string().required().test("sportId", "Invalid sportId!", isValidObjectId),
    isManual: Yup.boolean().nullable(true),
    betDelay: Yup.number().nullable(true),
    visibleToPlayer: Yup.boolean().nullable(true),
    positionIndex: Yup.number().nullable(true),
    minStake: Yup.number().nullable(true),
    maxStake: Yup.number().nullable(true),
    maxBetLiability: Yup.number().nullable(true),
    maxMarketLiability: Yup.number().nullable(true),
    maxMarketProfit: Yup.number().nullable(true),
    startDate: Yup.date().nullable(true)
  });

  await validationSchema.validate(req.body);

  return req;
}

async function updateMarketRequest(req) {
  const validationSchema = Yup.object().shape({
    _id: Yup.string().required().test("_id", "Given _id is not valid!", isValidObjectId),
    name: Yup.string().required(),
    marketStatus: Yup.number().nullable(true),
    betDelay: Yup.number().nullable(true),
    visibleToPlayer: Yup.boolean().nullable(true),
    positionIndex: Yup.number().nullable(true),
    minStake: Yup.number().nullable(true),
    maxStake: Yup.number().nullable(true),
    maxBetLiability: Yup.number().nullable(true),
    maxMarketLiability: Yup.number().nullable(true),
    maxMarketProfit: Yup.number().nullable(true),
    startDate: Yup.date().nullable(true)
  });

  await validationSchema.validate(req.body);

  return req;
}
async function updateMarketRunnerRequest(req) {
  const validationSchema = Yup.object().shape({
    _id: Yup.string().required().test("_id", "Given _id is not valid!", isValidObjectId),
    betDelay: Yup.number().nullable(true),
    minStake: Yup.number().nullable(true),
    maxStake: Yup.number().nullable(true),
    status: Yup.string().nullable(true)
  });

  await validationSchema.validate(req.body);

  return req;
}
export default {
  createMarketRequest,
  updateMarketRequest,
  updateMarketRunnerRequest
};
