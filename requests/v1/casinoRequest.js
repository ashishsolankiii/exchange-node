import { isValidObjectId } from "mongoose";
import Yup from "yup";
import { isValidTime } from "../../lib/helpers/validation.js";
import Casino from "../../models/v1/Casino.js";

async function casinoListingRequest(req) {
  req.body.page = req.body?.page ? Number(req.body.page) : null;
  req.body.perPage = req.body?.perPage ? Number(req.body.perPage) : 10;
  req.body.sortBy = req.body?.sortBy ? req.body.sortBy : "createdAt";
  req.body.direction = req.body?.direction ? req.body.direction : "asc";
  req.body.searchQuery = req.body?.searchQuery ? req.body.searchQuery?.trim() : null;
  req.body.showDeleted = req.body?.showDeleted ? [true, "true"].includes(req.body.showDeleted) : false;
  req.body.showRecord = req.body?.showRecord ? req.body.showRecord?.trim() : "All";
  req.body.status = req.body?.status ? req.body.status : null;
  req.body.casinoType = req.body?.casinoType ? req.body.casinoType : null;

  const validationSchema = Yup.object().shape({
    page: Yup.number().nullable(true),

    perPage: Yup.number(),

    sortBy: Yup.string().oneOf(Object.keys(Casino.schema.paths), "Invalid sortBy key."),

    showDeleted: Yup.boolean(),

    showRecord: Yup.string(),

    direction: Yup.string().oneOf(["asc", "desc", null], "Invalid direction use 'asc' or 'desc'.").nullable(true),

    searchQuery: Yup.string().nullable(true),

    status: Yup.boolean().nullable(true),

    casinoType: Yup.string().nullable(true),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function createCasinoRequest(req) {
  const validationSchema = Yup.object().shape({
    name: Yup.string().required(),
    casinoType: Yup.string().required()
  });

  await validationSchema.validate(req.body);

  return req;
}

async function updateCasinoRequest(req) {
  const validationSchema = Yup.object().shape({
    _id: Yup.string().required().test("_id", "Given _id is not valid!", isValidObjectId),
    name: Yup.string().required(),
    casinoType: Yup.string().required()
  });

  await validationSchema.validate(req.body);

  return req;
}

export default {
  casinoListingRequest,
  createCasinoRequest,
  updateCasinoRequest,
};
