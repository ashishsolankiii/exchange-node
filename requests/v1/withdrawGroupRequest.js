import { isValidObjectId } from "mongoose";
import Yup from "yup";
import WithdrawGroup from "../../models/v1/WithdrawGroup.js";

async function withdrawGroupListingRequest(req) {
  req.body.page = req.body?.page ? Number(req.body.page) : null;
  req.body.perPage = req.body?.perPage ? Number(req.body.perPage) : 10;
  req.body.sortBy = req.body?.sortBy ? req.body.sortBy : "isActive";
  req.body.direction = req.body?.direction ? req.body.direction : "asc";
  req.body.searchQuery = req.body?.searchQuery ? req.body.searchQuery?.trim() : null;
  req.body.showDeleted = req.body?.showDeleted ? [true, "true"].includes(req.body.showDeleted) : false;
  req.body.showRecord = req.body?.showRecord ? req.body.showRecord?.trim() : "All";
  req.body.parentUserId = req.body?.parentUserId ? req.body.parentUserId : null;

  const validationSchema = Yup.object().shape({
    page: Yup.number().nullable(true),

    perPage: Yup.number(),

    sortBy: Yup.string().oneOf(Object.keys(WithdrawGroup.schema.paths), "Invalid sortBy key."),

    showDeleted: Yup.boolean(),

    showRecord: Yup.string(),

    direction: Yup.string().oneOf(["asc", "desc", null], "Invalid direction use 'asc' or 'desc'.").nullable(true),

    searchQuery: Yup.string().nullable(true),

    parentUserId: Yup.string().nullable(true),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function createWithdrawGroupRequest(req) {
  const validationSchema = Yup.object().shape({
    userId: Yup.string().required().test("userId", "Invalid userId!", isValidObjectId),
    parentUserId: Yup.string().required().test("parentUserId", "Invalid parentUserId!", isValidObjectId),
    type: Yup.string().required(),
    remark: Yup.string(),
    commission: Yup.number(),
    minAmount: Yup.number(),
    maxAmount: Yup.number(),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function updateWithdrawGroupRequest(req) {
  const validationSchema = Yup.object().shape({
    _id: Yup.string().required().test("_id", "Given _id is not valid!", isValidObjectId),
    userId: Yup.string().required().test("userId", "Invalid userId!", isValidObjectId),
    parentUserId: Yup.string().required().test("parentUserId", "Invalid parentUserId!", isValidObjectId),
    type: Yup.string().required(),
    remark: Yup.string(),
    commission: Yup.number(),
    minAmount: Yup.number(),
    maxAmount: Yup.number(),
    isActive: Yup.boolean(),
  });

  await validationSchema.validate(req.body);

  return req;
}

export default {
  withdrawGroupListingRequest,
  createWithdrawGroupRequest,
  updateWithdrawGroupRequest,
};
