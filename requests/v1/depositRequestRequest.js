import { isValidObjectId } from "mongoose";
import Yup from "yup";
import DepositRequest from "../../models/v1/DepositRequest.js";

async function depositRequestListingRequest(req) {
  req.body.page = req.body?.page ? Number(req.body.page) : null;
  req.body.perPage = req.body?.perPage ? Number(req.body.perPage) : 10;
  req.body.sortBy = req.body?.sortBy ? req.body.sortBy : "isActive";
  req.body.direction = req.body?.direction ? req.body.direction : "asc";
  req.body.searchQuery = req.body?.searchQuery ? req.body.searchQuery?.trim() : null;
  req.body.showDeleted = req.body?.showDeleted ? [true, "true"].includes(req.body.showDeleted) : false;
  req.body.userId = req.body?.userId ? req.body.userId?.trim() : null;
  req.body.status = req.body?.status ? req.body.status : null;

  const additionalSortKeys = ["requestedUserName", "transferTypeName", "withdrawGroupName"];

  const validationSchema = Yup.object().shape({
    page: Yup.number().nullable(true),

    perPage: Yup.number(),

    sortBy: Yup.string().oneOf(
      [...Object.keys(DepositRequest.schema.paths), ...additionalSortKeys],
      "Invalid sortBy key."
    ),

    showDeleted: Yup.boolean(),

    showRecord: Yup.string(),

    direction: Yup.string().oneOf(["asc", "desc", null], "Invalid direction use 'asc' or 'desc'.").nullable(true),

    searchQuery: Yup.string().nullable(true),
    userId: Yup.string().nullable(true),
    status: Yup.string().nullable(true),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function createDepositRequestRequest(req) {
  const validationSchema = Yup.object().shape({
    userId: Yup.string().required().test("userId", "Invalid userId!", isValidObjectId),
    transferTypeId: Yup.string().required().test("transferTypeId", "Invalid transferTypeId!", isValidObjectId),
    amount: Yup.number().required(),
    status: Yup.string().nullable(true),
    utrTransactionId: Yup.string().required()
  });

  await validationSchema.validate(req.body);

  return req;
}

async function updateDepositRequestRequest(req) {
  const validationSchema = Yup.object().shape({
    _id: Yup.string().required().test("_id", "Given _id is not valid!", isValidObjectId),
    userId: Yup.string().required().test("userId", "Invalid userId!", isValidObjectId),
    transferTypeId: Yup.string().required().test("transferTypeId", "Invalid transferTypeId!", isValidObjectId),
    amount: Yup.number().required(),
    status: Yup.string().nullable(true),
    utrTransactionId: Yup.string().required()
  });

  await validationSchema.validate(req.body);

  return req;
}

export default {
  depositRequestListingRequest,
  createDepositRequestRequest,
  updateDepositRequestRequest,
};
