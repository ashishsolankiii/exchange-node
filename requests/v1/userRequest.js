import { isValidObjectId } from "mongoose";
import Yup from "yup";
import { isValidCountryCode, isValidObjectIdArray, isValidUrl } from "../../lib/helpers/validation.js";
import User, { SETTLEMENT_DAY, SETTLEMENT_DURATION, USER_ACCESSIBLE_ROLES } from "../../models/v1/User.js";
import UserActivity from "../../models/v1/UserActivity.js";

async function userListingRequest(req) {
  req.body.page = req.body?.page ? Number(req.body.page) : null;
  req.body.perPage = req.body?.perPage ? Number(req.body.perPage) : 10;
  req.body.sortBy = req.body?.sortBy ? req.body.sortBy : "createdAt";
  req.body.direction = req.body?.direction ? req.body.direction : "desc";
  req.body.searchQuery = req.body?.searchQuery ? req.body.searchQuery?.trim() : null;
  req.body.role = req.body?.role ? req.body.role : null;
  req.body.showDeleted = req.body?.showDeleted ? [true, "true"].includes(req.body.showDeleted) : false;
  req.body.parentId = req.body?.parentId ? req.body.parentId : null;
  req.body.cloneParentId = req.body?.cloneParentId ? req.body.cloneParentId : null;
  req.body.withPermissions = req.body?.withPermissions ? [true, "true"].includes(req.body.withPermissions) : false;

  const validationSchema = Yup.object().shape({
    page: Yup.number().nullable(true),

    perPage: Yup.number(),

    sortBy: Yup.string().oneOf(Object.keys(User.schema.paths), "Invalid sortBy key."),

    direction: Yup.string().oneOf(["asc", "desc", null], "Invalid direction use 'asc' or 'desc'.").nullable(true),

    showDeleted: Yup.boolean(),

    role: Yup.array().nullable(true),

    searchQuery: Yup.string().nullable(true),

    parentId: Yup.string()
      .nullable()
      .test("validId", "Invalid parentId!", (v) => (v === null ? true : isValidObjectId(v))),

    cloneParentId: Yup.string()
      .nullable()
      .test("validId", "Invalid cloneParentId!", (v) => (v === null ? true : isValidObjectId(v))),

    withPermissions: Yup.boolean(),
  });

  await validationSchema.validate(req.body);

  return req;
}

const userCreateUpdateCommonSchema = {
  fullName: Yup.string().required(),

  rate: Yup.number().min(0).max(100).nullable(true),

  creditPoints: Yup.number().min(0).nullable(true),

  city: Yup.string(),

  mobileNumber: Yup.string().length(10).required(),

  countryCode: Yup.string()
    .nullable(true)
    .test("countryCode", "Invalid country code.", (value) => !value || isValidCountryCode(value)),

  isBetLock: Yup.boolean(),

  exposureLimit: Yup.number().min(0).nullable(true),

  exposurePercentage: Yup.number().min(0).max(100).nullable(true),

  stakeLimit: Yup.number().min(0).nullable(true),

  maxProfit: Yup.number().min(0).nullable(true),

  maxLoss: Yup.number().min(0).nullable(true),

  bonus: Yup.number().min(0).nullable(true),

  maxStake: Yup.number().min(0).nullable(true),

  settlementDurationType: Yup.string()
    .oneOf([...Object.values(SETTLEMENT_DURATION), null], "Invalid settlement duration type!")
    .nullable(true),

  settlementDate: Yup.number().min(1).max(31).nullable(true),

  settlementDay: Yup.string()
    .oneOf([...Object.values(SETTLEMENT_DAY), null], "Invalid settlement day!")
    .nullable(true),

  settlementTime: Yup.string().nullable(true),

  // Only for SUPER_ADMIN
  contactEmail: Yup.string().email().nullable(true),
  domainUrl: Yup.string().test("domainUrl", "Invalid URL format", (value) => !value || isValidUrl(value)),
  availableSports: Yup.array().test(
    "availableSports",
    "One or more sport id(s) are invalid!",
    (value) => !value || isValidObjectIdArray
  ),
};

async function createUserRequest(req) {
  req.body.username = req.body.username?.trim();
  req.body.password = req.body.password?.toString()?.trim();
  req.body.settlementDurationType = req.body.settlementDurationType || null;
  req.body.settlementDate = req.body.settlementDate || null;
  req.body.settlementDay = req.body.settlementDay || null;
  req.body.defaultMasterUserId = req.body.defaultMasterUserId || null;
  req.body.businessType = req.body.businessType || null;

  const user = await User.findById(req.user._id, { role: 1 });

  const schemaObj = {
    // Keep this on top so that
    // we can override any field if required
    ...userCreateUpdateCommonSchema,

    username: Yup.string().required(),

    password: Yup.string().required(),

    confirmPassword: Yup.string()
      .oneOf([Yup.ref("password")], "Passwords must match.")
      .required(),

    role: Yup.string().oneOf(USER_ACCESSIBLE_ROLES[user.role], "Invalid user role!").required(),

    currencyId: Yup.string().nullable(true),

    isCasinoAvailable: Yup.boolean().nullable(true),

    isAutoSettlement: Yup.boolean().nullable(true),

    forcePasswordChange: Yup.boolean(),

    defaultMasterUserId: Yup.string().nullable(true),

    businessType: Yup.string().nullable(true),
  };

  const validationSchema = Yup.object().shape(schemaObj);

  await validationSchema.validate(req.body);

  return req;
}

async function updateUserRequest(req) {
  req.body.settlementDurationType = req.body.settlementDurationType || null;
  req.body.settlementDate = req.body.settlementDate || null;
  req.body.settlementDay = req.body.settlementDay || null;
  req.body.defaultMasterUserId = req.body.defaultMasterUserId || null;
  req.body.businessType = req.body.businessType || null;

  const schemaObj = {
    // Keep this on top so that
    // we can override any field if required
    ...userCreateUpdateCommonSchema,

    _id: Yup.string().required().test("_id", "Given _id is not valid!", isValidObjectId),

    password: Yup.string().nullable(true),

    mobileNumber: Yup.string().length(10).nullable(true),

    isTransactionCode: Yup.boolean().nullable(true),

    transactionCode: Yup.string().nullable(true),

    isCasinoAvailable: Yup.boolean().nullable(true),

    isAutoSettlement: Yup.boolean().nullable(true),

    isMultiLoginUser: Yup.boolean().nullable(true),

    defaultMasterUserId: Yup.string().nullable(true),

    businessType: Yup.string().nullable(true),
  };
  if (req.body.transactionCode) {
    schemaObj.isTransactionCode = Yup.string().required("isTransactionCode flag is required.");
  }

  if (req.body.password) {
    schemaObj.confirmPassword = Yup.string()
      .oneOf([Yup.ref("password")], "Passwords must match.")
      .required();
  }

  const validationSchema = Yup.object().shape(schemaObj);

  await validationSchema.validate(req.body);

  return req;
}

async function fetchUserBalanceRequest(req) {
  const validationSchema = Yup.object().shape({
    userId: Yup.string().required().test("userId", "Given _id is not valid!", isValidObjectId),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function cloneUserRequest(req) {
  req.body.moduleIds = req.body.moduleIds || [];
  req.body.username = req.body.username?.trim();
  req.body.password = req.body.password?.toString()?.trim();
  req.body.transactionCode = req.body?.transactionCode?.toString();

  const validationSchema = Yup.object().shape({
    fullName: Yup.string().required(),

    username: Yup.string().required(),

    password: Yup.string().nullable(true),

    confirmPassword: Yup.string()
      .nullable(true)
      .when(["password"], (password, schema) => {
        return password ? schema.oneOf([Yup.ref("password")], "Passwords should match.").required() : schema;
      }),

    moduleIds: Yup.array().required(),

    transactionCode: Yup.string().length(6).required(),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function userActivityRequest(req) {
  req.body.page = req.body?.page ? Number(req.body.page) : null;
  req.body.perPage = req.body?.perPage ? Number(req.body.perPage) : 10;
  req.body.sortBy = req.body?.sortBy ? req.body.sortBy : "createdAt";
  req.body.direction = req.body?.direction ? req.body.direction : "desc";
  req.body.searchQuery = req.body?.searchQuery ? req.body.searchQuery?.trim() : null;
  req.body.fromDate = req.body?.fromDate ? req.body.fromDate : null;
  req.body.toDate = req.body?.toDate ? req.body.toDate : null;
  req.body.userId = req.body?.userId ? req.body.userId?.trim() : null;
  req.body.filterUserId = req.body?.filterUserId ? req.body.filterUserId?.trim() : null;

  const validationSchema = Yup.object().shape({
    page: Yup.number().nullable(true),
    perPage: Yup.number(),
    sortBy: Yup.string().oneOf(Object.keys(UserActivity.schema.paths), "Invalid sortBy key."),
    direction: Yup.string().oneOf(["asc", "desc", null], "Invalid direction use 'asc' or 'desc'.").nullable(true),
    searchQuery: Yup.string().nullable(true),
    type: Yup.string(),
    fromDate: Yup.date().nullable(true),
    toDate: Yup.date().nullable(true),
    userId: Yup.string().nullable(true),
    filterUserId: Yup.string().nullable(true),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function changePasswordRequest(req) {
  const validationSchema = Yup.object().shape({
    loginUserId: Yup.string().required().test("userId", "Given _id is not valid!", isValidObjectId),
    oldPassword: Yup.string().required(),
    newPassword: Yup.string().required()
  });

  await validationSchema.validate(req.body);

  return req;
}

export default {
  userListingRequest,
  createUserRequest,
  updateUserRequest,
  fetchUserBalanceRequest,
  cloneUserRequest,
  userActivityRequest,
  changePasswordRequest
};
