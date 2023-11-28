import mongoose from "mongoose";
import ErrorResponse from "../../lib/error-handling/error-response.js";
import { generatePaginationQueries, generateSearchFilters } from "../../lib/helpers/pipeline.js";
import TransferRequest, { STATUS } from "../../models/v1/TransferRequest.js";
import User from "../../models/v1/User.js";

// Fetch all TransferRequest from the database
const fetchAllTransferRequest = async ({ ...reqBody }) => {
  try {
    const { page, perPage, sortBy, direction, searchQuery, showDeleted, userId, requestedUserId, status } = reqBody;

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
    if (requestedUserId) {
      filters.requestedUserId = new mongoose.Types.ObjectId(requestedUserId);
    }

    if (status) {
      filters.status = status;
    }

    if (searchQuery) {
      const fields = ["userId", "type"];
      filters.$or = generateSearchFilters(searchQuery, fields);
    }

    const TransferRequests = await TransferRequest.aggregate([
      {
        $match: filters,
      },
      {
        $lookup: {
          from: "users",
          localField: "requestedUserId",
          foreignField: "_id",
          as: "user",
          pipeline: [{ $project: { username: 1 } }],
        },
      },
      { $unwind: "$user" },
      {
        $addFields: {
          requestedUserName: "$user.username",
        },
      },
      {
        $lookup: {
          from: "transfer_types",
          localField: "transferTypeId",
          foreignField: "_id",
          as: "transferType",
        },
      },
      { $unwind: "$transferType" },
      {
        $addFields: {
          transferTypeName: "$transferType.type",
        },
      },
      {
        $lookup: {
          from: "withdraw_groups",
          localField: "withdrawGroupId",
          foreignField: "_id",
          as: "withdrawGroup",
          pipeline: [{ $project: { type: 1 } }],
        },
      },
      { $unwind: "$withdrawGroup" },
      {
        $addFields: {
          withdrawGroupName: "$withdrawGroup.type",
        },
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

    if (TransferRequests?.length) {
      data.records = TransferRequests[0]?.paginatedResults || [];
      data.totalRecords = TransferRequests[0]?.totalRecords?.length ? TransferRequests[0]?.totalRecords[0].count : 0;
    }

    return data;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Fetch TransferRequest by Id from the database
 */
const fetchTransferRequestId = async (_id) => {
  try {
    return await TransferRequest.findById(_id);
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Create TransferRequest in the database
 */
const addTransferRequest = async ({ ...reqBody }) => {
  const { userId, transferTypeId, withdrawGroupId, amount, requestedUserId } = reqBody;

  try {
    var findUser = await User.findById(userId);

    if (findUser.balance < amount) {
      throw new Error("Given amount exceed the available balance!");
    }
    const newTransferRequestObj = {
      userId,
      transferTypeId,
      withdrawGroupId,
      amount,
      requestedUserId,
    };

    const newTransferRequest = await TransferRequest.create(newTransferRequestObj);

    return newTransferRequest;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * update TransferRequest in the database
 */
const modifyTransferRequest = async ({ ...reqBody }) => {
  try {
    const TransferRequests = await TransferRequest.findById(reqBody._id);

    if (!TransferRequests) {
      throw new Error("TransferRequest not found.");
    }

    TransferRequests.userId = reqBody.userId;
    TransferRequests.requestedUserId = reqBody.requestedUserId;
    TransferRequests.transferTypeId = reqBody.transferTypeId;
    TransferRequests.withdrawGroupId = reqBody.withdrawGroupId;
    TransferRequests.amount = reqBody.amount;
    TransferRequests.status = reqBody.status;
    TransferRequests.message = reqBody.message;

    await TransferRequests.save();

    return TransferRequests;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * delete TransferRequest in the database
 */
const removeTransferRequest = async (_id) => {
  try {
    const TransferRequests = await TransferRequest.findById(_id);

    await TransferRequests.softDelete();

    return TransferRequests;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 *Transfer Request status modify
 */
const transferRequestStatusModify = async ({ _id, fieldName, status }) => {
  try {
    const TransferRequests = await TransferRequest.findById(_id);
    if (TransferRequests.status == STATUS.APPROVE) {
      throw new Error("TransferRequest already approved.");
    } else if (TransferRequests.status == STATUS.REJECT) {
      throw new Error("TransferRequest already rejected.");
    } else {
      if (status == STATUS.APPROVE) {
        var findUser = await User.findById(TransferRequests.userId);

        if (findUser.balance < TransferRequests.amount) {
          throw new Error("Given amount exceed the available balance!");
        } else {
          findUser.balance = findUser.balance - TransferRequests.amount;
          findUser.save();

          let withdrawPoints = new Transaction({
            points: TransferRequests.amount,
            balancePoints: findUser.balance - TransferRequests.amount,
            type: "debit",
            remark: "Withdraw Points",
            userId: findUser._id,
            fromId: findUser._id,
            fromtoName: findUser.username + " / " + findUser.username,
          });

          await withdrawPoints.save();
        }
      }

      TransferRequests[fieldName] = status;
      await TransferRequests.save();
    }
    return TransferRequests;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

export default {
  fetchAllTransferRequest,
  fetchTransferRequestId,
  addTransferRequest,
  modifyTransferRequest,
  removeTransferRequest,
  transferRequestStatusModify,
};
