import mongoose from "mongoose";
import ErrorResponse from "../../lib/error-handling/error-response.js";
import { generatePaginationQueries, generateSearchFilters } from "../../lib/helpers/pipeline.js";
import TransferType from "../../models/v1/TransferType.js";

// Fetch all TransferType from the database
const fetchAllTransferType = async ({ ...reqBody }) => {
  try {
    const { page, perPage, sortBy, direction, searchQuery, showDeleted, userId, parentUserId } = reqBody;

    // Pagination and Sorting
    const sortDirection = direction === "asc" ? 1 : -1;
    const paginationQueries = generatePaginationQueries(page, perPage);

    // Filters

    let filters = {
      isDeleted: showDeleted,
    };

    if (userId) {
      filters.userId = new mongoose.Types.ObjectId(userId);
    }

    if (parentUserId) {
      filters.parentUserId = new mongoose.Types.ObjectId(parentUserId);
    }

    if (searchQuery) {
      const fields = ["userId", "type"];
      filters.$or = generateSearchFilters(searchQuery, fields);
    }

    const TransferTypes = await TransferType.aggregate([
      {
        $match: filters,
      },
      {
        $facet: {
          totalRecords: [{ $count: "count" }],
          paginatedResults: [
            ...paginationQueries,
            {
              $sort: { [sortBy]: sortDirection },
            },
            ...paginationQueries,
          ],
        },
      },
    ]);

    const data = {
      records: [],
      totalRecords: 0,
    };

    if (TransferTypes?.length) {
      data.records = TransferTypes[0]?.paginatedResults || [];
      data.totalRecords = TransferTypes[0]?.totalRecords?.length ? TransferTypes[0]?.totalRecords[0].count : 0;
    }

    return data;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Fetch TransferType by Id from the database
 */
const fetchTransferTypeId = async (_id) => {
  try {
    return await TransferType.findById(_id);
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Create TransferType in the database
 */
const addTransferType = async ({ ...reqBody }) => {
  const {
    userId,
    type,
    name,
    minAmount,
    maxAmount,
    description,
    mobileNumber,
    accountHolderName,
    bankName,
    accountNumber,
    accountType,
    ifsc,
    platformName,
    platformDisplayName,
    platformAddress,
    depositLink,
    parentUserId
  } = reqBody;

  try {
    const newTransferTypeObj = {
      userId,
      type,
      name,
      minAmount,
      maxAmount,
      description,
      mobileNumber,
      accountHolderName,
      bankName,
      accountNumber,
      accountType,
      ifsc,
      platformName,
      platformDisplayName,
      platformAddress,
      depositLink,
      parentUserId
    };

    const newTransferType = await TransferType.create(newTransferTypeObj);

    return newTransferType;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * update TransferType in the database
 */
const modifyTransferType = async ({ ...reqBody }) => {
  try {
    const TransferTypes = await TransferType.findById(reqBody._id);

    if (!TransferTypes) {
      throw new Error("TransferType not found.");
    }

    TransferTypes.userId = reqBody.userId;
    TransferTypes.type = reqBody.type;
    TransferTypes.name = reqBody.name;
    TransferTypes.minAmount = reqBody.minAmount;
    TransferTypes.maxAmount = reqBody.maxAmount;
    TransferTypes.description = reqBody.description;
    TransferTypes.mobileNumber = reqBody.mobileNumber;
    TransferTypes.accountHolderName = reqBody.accountHolderName;
    TransferTypes.bankName = reqBody.bankName;
    TransferTypes.accountNumber = reqBody.accountNumber;
    TransferTypes.accountType = reqBody.accountType;
    TransferTypes.ifsc = reqBody.ifsc;
    TransferTypes.platformName = reqBody.platformName;
    TransferTypes.platformDisplayName = reqBody.platformDisplayName;
    TransferTypes.platformAddress = reqBody.platformAddress;
    TransferTypes.depositLink = reqBody.depositLink;
    TransferTypes.isActive = reqBody.isActive;
    TransferTypes.parentUserId = reqBody.parentUserId;

    await TransferTypes.save();

    return TransferTypes;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * delete TransferType in the database
 */
const removeTransferType = async (_id) => {
  try {
    const TransferTypes = await TransferType.findById(_id);

    await TransferTypes.softDelete();

    return TransferTypes;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Withdraw Group status modify
 */
const transferTypeStatusModify = async ({ _id, fieldName, status }) => {
  try {
    const TransferTypes = await TransferType.findById(_id);

    TransferTypes[fieldName] = status;
    await TransferTypes.save();

    return TransferTypes;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

export default {
  fetchAllTransferType,
  fetchTransferTypeId,
  addTransferType,
  modifyTransferType,
  removeTransferType,
  transferTypeStatusModify,
};
