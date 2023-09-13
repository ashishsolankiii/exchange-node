import { isValidObjectId } from "mongoose";
import Yup from "yup";
import { isValidTime } from "../../lib/helpers/validation.js";
import Event from "../../models/v1/Event.js";

async function eventListingRequest(req) {
  req.body.page = req.body?.page ? Number(req.body.page) : null;
  req.body.perPage = req.body?.perPage ? Number(req.body.perPage) : 10;
  req.body.sortBy = req.body?.sortBy ? req.body.sortBy : "isActive";
  req.body.direction = req.body?.direction ? req.body.direction : "asc";
  req.body.searchQuery = req.body?.searchQuery ? req.body.searchQuery?.trim() : null;
  req.body.showDeleted = req.body?.showDeleted ? [true, "true"].includes(req.body.showDeleted) : false;
  req.body.showRecord = req.body?.showRecord ? req.body.showRecord?.trim() : "All";
  req.body.status = req.body?.status ? req.body.status : null;
  req.body.fromDate = req.body?.fromDate || null;
  req.body.toDate = req.body?.toDate || null;
  req.body.sportId = req.body?.sportId || null;
  req.body.competitionId = req.body?.competitionId || null;
  req.body.fields = req.body.fields
    ? typeof req.body.fields === "string"
      ? JSON.parse(req.body.fields)
      : req.body.fields
    : null;

  const validationSchema = Yup.object().shape({
    page: Yup.number().nullable(true),

    perPage: Yup.number(),

    sortBy: Yup.string().oneOf(Object.keys(Event.schema.paths), "Invalid sortBy key."),

    showDeleted: Yup.boolean(),

    showRecord: Yup.string(),

    direction: Yup.string().oneOf(["asc", "desc", null], "Invalid direction use 'asc' or 'desc'.").nullable(true),

    searchQuery: Yup.string().nullable(true),

    status: Yup.boolean().nullable(true),

    fromDate: Yup.date().nullable(true),

    toDate: Yup.date().nullable(true),

    sportId: Yup.string()
      .nullable(true)
      .test("sportId", "Invalid sportId!", (v) => !v || isValidObjectId),

    competitionId: Yup.string()
      .nullable(true)
      .test("competitionId", "Invalid competitionId!", (v) => !v || isValidObjectId),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function createEventRequest(req) {
  const validationSchema = Yup.object().shape({
    name: Yup.string().required(),
    sportId: Yup.string().required().test("sportId", "Invalid sportId!", isValidObjectId),
    competitionId: Yup.string().required().test("competitionId", "Invalid competitionId!", isValidObjectId),
    oddsLimit: Yup.number().min(0),
    volumeLimit: Yup.number().min(0),
    minStake: Yup.number().min(0),
    maxStake: Yup.number().when("minStake", (minStake, schema) =>
      schema.test({
        test: (maxStake) => !maxStake || maxStake >= minStake,
        message: "Max stake must be greater than or equal to min stake",
      })
    ),
    minStakeSession: Yup.number().min(0),
    maxStakeSession: Yup.number()
      .min(0)
      .when("minStakeSession", (minStakeSession, schema) =>
        schema.test({
          test: (maxStakeSession) => !maxStakeSession || maxStakeSession >= minStakeSession,
          message: "Max stake session must be greater than or equal to min stake session",
        })
      ),
    betLock: Yup.boolean(),
    betDelay: Yup.number().min(0),
    matchDate: Yup.date().required("Match Date is required!"),
    matchTime: Yup.string()
      .required("Match Time is required!")
      .test("matchTime", "Invalid matchTime!", (v) => isValidTime(v, "HH:mm")),
    isFavourite: Yup.boolean().nullable(true),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function updateEventRequest(req) {
  const validationSchema = Yup.object().shape({
    _id: Yup.string().required().test("_id", "Given _id is not valid!", isValidObjectId),
    name: Yup.string().required(),
    sportId: Yup.string().required().test("sportId", "Invalid sportId!", isValidObjectId),
    competitionId: Yup.string().required().test("competitionId", "Invalid sportId!", isValidObjectId),
    matchDate: Yup.date().required("Match Date is required!"),
    matchTime: Yup.string()
      .required("Match Time is required!")
      .test("matchTime", "Invalid matchTime!", (v) => isValidTime(v, "HH:mm")),
    oddsLimit: Yup.number().min(0),
    betLock: Yup.boolean(),
    betDelay: Yup.number().min(0),
    volumeLimit: Yup.number().min(0),
    minStake: Yup.number().min(0),
    maxStake: Yup.number()
      .min(0)
      .when("minStake", (minStake, schema) =>
        schema.test({
          test: (maxStake) => !maxStake || maxStake >= minStake,
          message: "Max stake must be greater than or equal to min stake",
        })
      ),
    minStakeSession: Yup.number().min(0),
    maxStakeSession: Yup.number()
      .min(0)
      .when("minStakeSession", (minStakeSession, schema) =>
        schema.test({
          test: (maxStakeSession) => !maxStakeSession || maxStakeSession >= minStakeSession,
          message: "Max stake session must be greater than or equal to min stake session",
        })
      ),
    betDeleted: Yup.boolean(),
    completed: Yup.boolean(),
    isActive: Yup.boolean(),
    isFavourite: Yup.boolean().nullable(true),
  });

  await validationSchema.validate(req.body);

  return req;
}

export default {
  eventListingRequest,
  createEventRequest,
  updateEventRequest,
};
