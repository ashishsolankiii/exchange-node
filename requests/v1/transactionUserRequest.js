import { isValidObjectId } from "mongoose";
import Yup from "yup";
import TransactionUser from "../../models/v1/TransactionUser.js";

async function createTransactionUserRequest(req) {
  const validationSchema = Yup.object().shape({
    name: Yup.string().required(),
    username: Yup.string().required(),
    password: Yup.string().required(),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function updateTransactionUserRequest(req) {
  const validationSchema = Yup.object().shape({
    name: Yup.string().required(),
    username: Yup.string().required(),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function userListingRequest(req) {
  req.body.page = req.body?.page ? Number(req.body.page) : null;
  req.body.perPage = req.body?.perPage ? Number(req.body.perPage) : 10;
  req.body.sortBy = req.body?.sortBy ? req.body.sortBy : "createdAt";
  req.body.direction = req.body?.direction ? req.body.direction : "desc";
  req.body.searchQuery = req.body?.searchQuery ? req.body.searchQuery?.trim() : null;
  req.body.showDeleted = req.body?.showDeleted ? [true, "true"].includes(req.body.showDeleted) : false;

  const validationSchema = Yup.object().shape({
    page: Yup.number().nullable(true),

    perPage: Yup.number(),

    sortBy: Yup.string().oneOf(Object.keys(TransactionUser.schema.paths), "Invalid sortBy key."),

    direction: Yup.string().oneOf(["asc", "desc", null], "Invalid direction use 'asc' or 'desc'.").nullable(true),

    showDeleted: Yup.boolean(),

    searchQuery: Yup.string().nullable(true),

    parentId: Yup.string()
      .nullable()
      .test("parentId", "Invalid parentId!", (v) => !v || isValidObjectId(v)),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function transactionUserLoginRequest(req) {
  const validationSchema = Yup.object().shape({
    username: Yup.string().required(),
    password: Yup.string().required(),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function transactionUserResetPasswordRequest(req) {
  const validationSchema = Yup.object().shape({
    userId: Yup.string().required(),
    oldPassword: Yup.string().required(),
    newPassword: Yup.string().required(),
  });

  await validationSchema.validate(req.body);

  return req;
}

export default {
  createTransactionUserRequest,
  updateTransactionUserRequest,
  userListingRequest,
  transactionUserLoginRequest,
  transactionUserResetPasswordRequest,
};
