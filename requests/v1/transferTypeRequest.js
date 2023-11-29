import { isValidObjectId } from "mongoose";
import Yup from "yup";
import TransferType, { DEPOSIT_TYPE } from "../../models/v1/TransferType.js";

async function transferTypeListingRequest(req) {
  req.body.page = req.body?.page ? Number(req.body.page) : null;
  req.body.perPage = req.body?.perPage ? Number(req.body.perPage) : 10;
  req.body.sortBy = req.body?.sortBy ? req.body.sortBy : "isActive";
  req.body.direction = req.body?.direction ? req.body.direction : "asc";
  req.body.searchQuery = req.body?.searchQuery ? req.body.searchQuery?.trim() : null;
  req.body.showDeleted = req.body?.showDeleted ? [true, "true"].includes(req.body.showDeleted) : false;
  req.body.showRecord = req.body?.showRecord ? req.body.showRecord?.trim() : "All";
  req.body.userId = req.body?.userId ? req.body.userId?.trim() : null;
  req.body.parentUserId = req.body?.parentUserId ? req.body.parentUserId : null;
  req.body.transferType = req.body?.transferType ? req.body.transferType : null;

  const validationSchema = Yup.object().shape({
    page: Yup.number().nullable(true),

    perPage: Yup.number(),

    sortBy: Yup.string().oneOf(Object.keys(TransferType.schema.paths), "Invalid sortBy key."),

    showDeleted: Yup.boolean(),

    showRecord: Yup.string(),

    direction: Yup.string().oneOf(["asc", "desc", null], "Invalid direction use 'asc' or 'desc'.").nullable(true),

    searchQuery: Yup.string().nullable(true),

    userId: Yup.string().nullable(true),

    parentUserId: Yup.string().nullable(true),

    parentUserId: Yup.string().nullable(true),
  });

  await validationSchema.validate(req.body);

  return req;
}

const generateTransferTypeValidationFields = (req) => {
  const validationFields = {
    userId: Yup.string().required().test("userId", "Invalid userId!", isValidObjectId),
    parentUserId: Yup.string().required().test("parentUserId", "Invalid parentUserId!", isValidObjectId),
    type: Yup.string().required(),
    name: Yup.string().required(),
    minAmount: Yup.number().nullable(true),
    maxAmount: Yup.number().nullable(true),
    description: Yup.string().nullable(true),
    transferType: Yup.string().required(),
  };

  if (req.body.type === DEPOSIT_TYPE.CASH) {
    validationFields.mobileNumber = Yup.string().length(10, "Invalid mobile number.").required();
  }

  if (req.body.type === DEPOSIT_TYPE.BANK) {
    validationFields.accountHolderName = Yup.string().required();
    validationFields.bankName = Yup.string().required();
    validationFields.accountNumber = Yup.string().required();
    validationFields.accountType = Yup.string().required();
    validationFields.ifsc = Yup.string().required();
  }

  if (req.body.type === DEPOSIT_TYPE.PLATFORM) {
    validationFields.platformName = Yup.string().required();
    validationFields.platformDisplayName = Yup.string().required();
    validationFields.platformAddress = Yup.string().required();
  }

  if (req.body.type === DEPOSIT_TYPE.LINK) {
    validationFields.depositLink = Yup.string().required();
  }

  return validationFields;
};

async function createTransferTypeRequest(req) {
  req.body.accountType = req.body?.accountType || null;
  req.body.platformName = req.body?.platformName || null;

  const validationFields = generateTransferTypeValidationFields(req);
  const validationSchema = Yup.object().shape(validationFields);

  await validationSchema.validate(req.body);

  return req;
}

async function updateTransferTypeRequest(req) {
  req.body.accountType = req.body?.accountType || null;
  req.body.platformName = req.body?.platformName || null;

  const validationFields = generateTransferTypeValidationFields(req);
  const validationSchema = Yup.object().shape({
    _id: Yup.string().required().test("_id", "Given _id is not valid!", isValidObjectId),
    ...validationFields,
  });

  await validationSchema.validate(req.body);

  return req;
}

export default {
  transferTypeListingRequest,
  createTransferTypeRequest,
  updateTransferTypeRequest,
};
