import ErrorResponse from "../../lib/error-handling/error-response.js";
import { generatePaginationQueries, generateSearchFilters } from "../../lib/helpers/pipeline.js";
import WithdrawGroup from "../../models/v1/WithdrawGroup.js";
import mongoose, { isValidObjectId } from "mongoose";

// Fetch all WithdrawGroup from the database
const fetchAllWithdrawGroup = async ({ ...reqBody }) => {
  try {
    const { page, perPage, sortBy, direction, searchQuery, showDeleted, parentUserId } = reqBody;

    // Pagination and Sorting
    const sortDirection = direction === "asc" ? 1 : -1;
    const paginationQueries = generatePaginationQueries(page, perPage);

    // Filters

    let filters = {
      isDeleted: showDeleted,
    };

    if (searchQuery) {
      const fields = ["userId", "type"];
      filters.$or = generateSearchFilters(searchQuery, fields);
    }

    if (parentUserId) {
      filters.parentUserId = new mongoose.Types.ObjectId(parentUserId);
    };

    const WithdrawGroups = await WithdrawGroup.aggregate([
      {
        $match: filters,
      },
      {
        $facet: {
          totalRecords: [{ $count: "count" }],
          paginatedResults: [
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

    if (WithdrawGroups?.length) {
      data.records = WithdrawGroups[0]?.paginatedResults || [];
      data.totalRecords = WithdrawGroups[0]?.totalRecords?.length ? WithdrawGroups[0]?.totalRecords[0].count : 0;
    }

    return data;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Fetch WithdrawGroup by Id from the database
 */
const fetchWithdrawGroupId = async (_id) => {
  try {
    return await WithdrawGroup.findById(_id);
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Create WithdrawGroup in the database
 */
const addWithdrawGroup = async ({ ...reqBody }) => {
  const { userId, type, remark, commission, minAmount, maxAmount, parentUserId } = reqBody;

  try {
    const newWithdrawGroupObj = {
      userId,
      type,
      remark,
      commission,
      minAmount,
      maxAmount,
      parentUserId
    };

    const newWithdrawGroup = await WithdrawGroup.create(newWithdrawGroupObj);

    return newWithdrawGroup;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * update WithdrawGroup in the database
 */
const modifyWithdrawGroup = async ({ ...reqBody }) => {
  try {
    const withdrawGroup = await WithdrawGroup.findById(reqBody._id);

    if (!withdrawGroup) {
      throw new Error("Withdraw Group not found.");
    }

    withdrawGroup.userId = reqBody.userId;
    withdrawGroup.type = reqBody.type;
    withdrawGroup.remark = reqBody.remark;
    withdrawGroup.commission = reqBody.commission;
    withdrawGroup.minAmount = reqBody.minAmount;
    withdrawGroup.maxAmount = reqBody.maxAmount;
    withdrawGroup.isActive = reqBody.isActive;
    withdrawGroup.parentUserId = reqBody.parentUserId;

    await withdrawGroup.save();

    return withdrawGroup;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * delete WithdrawGroup in the database
 */
const removeWithdrawGroup = async (_id) => {
  try {
    const withdrawGroups = await WithdrawGroup.findById(_id);

    await withdrawGroups.softDelete();

    return withdrawGroups;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Withdraw Group status modify
 */
const withdrawGroupStatusModify = async ({ _id, fieldName, status }) => {
  try {
    const WithdrawGroups = await WithdrawGroup.findById(_id);

    WithdrawGroups[fieldName] = status;
    await WithdrawGroups.save();

    return WithdrawGroups;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

export default {
  fetchAllWithdrawGroup,
  fetchWithdrawGroupId,
  addWithdrawGroup,
  modifyWithdrawGroup,
  removeWithdrawGroup,
  withdrawGroupStatusModify,
};
