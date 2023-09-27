import mongoose from "mongoose";
import ErrorResponse from "../../lib/error-handling/error-response.js";
import { generatePaginationQueries, generateSearchFilters } from "../../lib/helpers/pipeline.js";
import { validateTransactionCode } from "../../lib/io-guards/transaction-code.js";
import Transaction from "../../models/v1/Transaction.js";
import User from "../../models/v1/User.js";
// Create transaction in database
const createTransaction = async ({ points, balancePoints, type, remark, userId, fromId, fromtoName }) => {
  try {
    const userTransaction = new Transaction({
      points,
      balancePoints,
      type,
      remark,
      userId,
      fromId,
      fromtoName,
    });

    await userTransaction.save();
    return userTransaction;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Fetch all transaction from the database
const fetchAllTransaction = async ({ user, ...reqBody }) => {
  try {
    const { page, perPage, sortBy, direction, searchQuery, userId } = reqBody;

    // Pagination and Sorting
    const sortDirection = direction === "asc" ? 1 : -1;

    const paginationQueries = generatePaginationQueries(page, perPage);

    let fromDate, toDate;
    if (reqBody.fromDate && reqBody.toDate) {
      fromDate = new Date(new Date(reqBody.fromDate).setUTCHours(0, 0, 0)).toISOString();
      toDate = new Date(new Date(reqBody.toDate).setUTCHours(23, 59, 59)).toISOString();
    }
    // Filters
    let filters = {};

    if (fromDate && toDate) {
      filters = {
        createdAt: { $gte: new Date(fromDate), $lte: new Date(toDate) },
        userId: new mongoose.Types.ObjectId(user._id),
      };
    } else {
      filters = {
        userId: new mongoose.Types.ObjectId(user._id),
      };
    }

    if (userId) {
      filters.userId = new mongoose.Types.ObjectId(userId);
      filters.fromId = new mongoose.Types.ObjectId(user._id);
    }
    if (searchQuery) {
      const fields = ["fromtoName"];
      filters.$or = generateSearchFilters(searchQuery, fields);
    }

    const transaction = await Transaction.aggregate([
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

    if (transaction?.length) {
      data.records = transaction[0]?.paginatedResults || [];
      data.totalRecords = transaction[0]?.totalRecords?.length ? transaction[0]?.totalRecords[0].count : 0;
    }

    return data;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

// Add transaction in database
const addTransaction = async ({ points, type, remark, userId, fromId, user, transactionCode }) => {
  try {
    const userIdFind = await User.findOne({ _id: userId });
    const fromIdFind = await User.findOne({ _id: fromId });
    let userTransaction, fromTransaction;
    if (type == "debit") {
      userTransaction = new Transaction({
        points,
        balancePoints: Number(userIdFind.balance) + Number(points),
        type: "credit",
        remark,
        userId,
        fromId,
        fromtoName: userIdFind.username + " / " + fromIdFind.username,
      });
      const loggedInUser = await User.findById(user._id).select("transactionCode");
      const isValidCode = validateTransactionCode(transactionCode, loggedInUser.transactionCode);
      if (!isValidCode) {
        throw new Error("Invalid transactionCode!");
      }
      await userTransaction.save();

      fromTransaction = new Transaction({
        points,
        balancePoints: fromIdFind.balance - points,
        type: "debit",
        remark,
        userId: fromId,
        fromId: userId,
        fromtoName: userIdFind.username + " / " + fromIdFind.username,
      });

      await fromTransaction.save();
      await User.findOneAndUpdate(userIdFind._id, {
        balance: userIdFind.balance + points,
      });
      await User.findOneAndUpdate(fromIdFind._id, {
        balance: fromIdFind.balance - points,
      });
    } else {
      userTransaction = new Transaction({
        points,
        balancePoints: userIdFind.balance - points,
        type: "debit",
        remark,
        userId,
        fromId,
        fromtoName: userIdFind.username + " / " + fromIdFind.username,
      });
      const loggedInUser = await User.findById(user._id).select("transactionCode");
      const isValidCode = validateTransactionCode(transactionCode, loggedInUser.transactionCode);
      if (!isValidCode) {
        throw new Error("Invalid transactionCode!");
      }
      await userTransaction.save();

      fromTransaction = new Transaction({
        points,
        balancePoints: fromIdFind.balance + points,
        type: "credit",
        remark,
        userId: fromId,
        fromId: userId,
        fromtoName: userIdFind.username + " / " + fromIdFind.username,
      });
      await fromTransaction.save();
      await User.findOneAndUpdate(userIdFind._id, {
        balance: userIdFind.balance - points,
      });
      await User.findOneAndUpdate(fromIdFind._id, {
        balance: fromIdFind.balance + points,
      });
    }

    return userTransaction;
  } catch (error) {
    throw new Error(error.message);
  }
};

export default { createTransaction, fetchAllTransaction, addTransaction };
