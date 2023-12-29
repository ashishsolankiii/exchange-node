import { isValidObjectId } from "mongoose";
import Yup from "yup";
import ApiProvider from "../../models/v1/ApiProvider.js";

async function apiProviderListingRequest(req) {
  req.body.page = req.body?.page ? Number(req.body.page) : null;
  req.body.perPage = req.body?.perPage ? Number(req.body.perPage) : 10;
  req.body.sortBy = req.body?.sortBy ? req.body.sortBy : "isActive";
  req.body.direction = req.body?.direction ? req.body.direction : "desc";
  req.body.searchQuery = req.body?.searchQuery ? req.body.searchQuery?.trim() : null;
  req.body.showDeleted = req.body?.showDeleted ? [true, "true"].includes(req.body.showDeleted) : false;
  req.body.status = req.body?.status ? req.body.status : null;

  const validationSchema = Yup.object().shape({
    page: Yup.number().nullable(true),

    perPage: Yup.number(),

    sortBy: Yup.string().oneOf(Object.keys(ApiProvider.schema.paths), "Invalid sortBy key."),

    showDeleted: Yup.boolean(),

    showRecord: Yup.string(),

    direction: Yup.string().oneOf(["asc", "desc", null], "Invalid direction use 'asc' or 'desc'.").nullable(true),

    searchQuery: Yup.string().nullable(true),

    status: Yup.boolean().nullable(true),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function createApiProviderRequest(req) {
  const validationSchema = Yup.object().shape({
    name: Yup.string().required(),
    type: Yup.string().required(),
    metaData: Yup.object().nullable('true'),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function updateApiProviderRequest(req) {
  const validationSchema = Yup.object().shape({
    _id: Yup.string().required().test("_id", "Given _id is not valid!", isValidObjectId),
    name: Yup.string().required(),
    type: Yup.string().required(),
    metaData: Yup.object().nullable('true'),
  });

  await validationSchema.validate(req.body);

  return req;
}


export default {
  apiProviderListingRequest,
  createApiProviderRequest,
  updateApiProviderRequest
};
