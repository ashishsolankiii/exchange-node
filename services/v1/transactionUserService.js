import mongoose from "mongoose";
import ErrorResponse from "../../lib/error-handling/error-response.js";
import { generatePaginationQueries, generateSearchFilters } from "../../lib/helpers/pipeline.js";
import { encryptPassword, generateJwtToken, getTrimmedUser, validatePassword } from "../../lib/io-guards/auth.js";
import TransactionUser from "../../models/v1/TransactionUser.js";
import User from "../../models/v1/User.js";
import authService from "./authService.js";

/**
 * Create Transaction User in the database
 */
const addTransactionUser = async ({ user, ...reqBody }) => {
  const { name, username, password } = reqBody;

  try {
    const existingTransactionUser = await TransactionUser.findOne({ username: username, isDeleted: false });

    if (existingTransactionUser) {
      throw new Error("Username already exists!");
    }

    const loggedInUser = await User.findById(user._id);

    const newTransactionUserObj = {
      userId: loggedInUser.cloneParentId ? loggedInUser.cloneParentId : loggedInUser._id,
      name,
      username,
      password: await encryptPassword(password),
    };

    const newTransactionUser = await TransactionUser.create(newTransactionUserObj);

    return newTransactionUser;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Fetch Transaction user by Id from the database
 */
const fetchTransactionUserId = async (_id, fields) => {
  try {
    let project = { password: 0 };
    if (fields) {
      project = fields;
    }
    return await TransactionUser.findById(_id, project);
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * update Transaction user in the database
 */
const modifyTransactionUser = async ({ ...reqBody }) => {
  try {
    const exisitngTransactionUsername = await TransactionUser.findOne({
      username: reqBody.username,
      _id: { $ne: reqBody._id },
    });
    if (exisitngTransactionUsername) {
      throw new Error("Username already exists!");
    }

    if (reqBody?.password && reqBody.password != "") {
      reqBody.password = await encryptPassword(reqBody.password);
    } else {
      delete reqBody.password;
    }

    const updatedTransactionUser = await TransactionUser.findByIdAndUpdate(reqBody._id, reqBody, {
      new: true,
    });

    return updatedTransactionUser;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

// Fetch all Transaction users from the database
const fetchAllTransactionUsers = async ({ ...reqBody }) => {
  try {
    const { page, perPage, sortBy, direction, showDeleted, searchQuery, parentId } = reqBody;

    // Pagination and Sorting
    const sortDirection = direction === "asc" ? 1 : -1;

    const paginationQueries = generatePaginationQueries(page, perPage);

    // Filters
    const filters = {
      isDeleted: showDeleted,
      userId: new mongoose.Types.ObjectId(parentId),
    };

    if (searchQuery) {
      const fields = ["username", "name"];
      filters.$or = generateSearchFilters(searchQuery, fields);
    }

    const users = await TransactionUser.aggregate([
      {
        $match: filters,
      },
      {
        $unset: ["__v", "password"],
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

    if (users?.length) {
      data.records = users[0]?.paginatedResults || [];
      data.totalRecords = users[0]?.totalRecords?.length ? users[0]?.totalRecords[0].count : 0;
    }

    return data;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * delete Transaction user in the database
 */
const removeTransactionUser = async (_id) => {
  try {
    const transactionUser = await TransactionUser.findById(_id);

    await transactionUser.softDelete();

    return transactionUser;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Login Transaction user
 */

const loginTransactionUser = async ({ username, password }) => {
  try {
    const errorMessage = "The provided credentials are incorrect. Please try again.";

    // Check if username exists
    const existingUser = await TransactionUser.findOne({ username: username, isDeleted: false });
    if (!existingUser) {
      throw new Error(errorMessage);
    }

    // Check if password is valid
    const isValidPassword = await validatePassword(password, existingUser.password);
    if (!isValidPassword) {
      throw new Error(errorMessage);
    }
    const superUserId = await authService.getSuperAdminUserId(existingUser.userId);
    let user = {
      _id: existingUser._id,
      name: existingUser.name,
      username: existingUser.username,
      superUserId: superUserId,
    };

    const token = generateJwtToken({ _id: existingUser._id });

    return { user, token };
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Reset password
 */

const resetPassword = async ({ userId, oldPassword, newPassword }) => {
  try {
    // Check if username exists
    const existingUser = await TransactionUser.findOne({ _id: userId });
    if (!existingUser) {
      throw new Error("The provided credentials are incorrect. Please try again.");
    }

    // Check if password is valid
    const isValidPassword = await validatePassword(oldPassword, existingUser.password);
    if (!isValidPassword) {
      throw new Error("Old password is incorrect!");
    }

    existingUser.password = await encryptPassword(newPassword);
    await existingUser.save();

    const user = getTrimmedUser(existingUser.toJSON());

    return user;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

export default {
  addTransactionUser,
  fetchTransactionUserId,
  modifyTransactionUser,
  fetchAllTransactionUsers,
  removeTransactionUser,
  loginTransactionUser,
  resetPassword,
};
