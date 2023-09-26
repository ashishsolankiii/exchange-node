import mongoose from "mongoose";
import ErrorResponse from "../../lib/error-handling/error-response.js";
import { generatePaginationQueries, generateSearchFilters } from "../../lib/helpers/pipeline.js";
import { encryptPassword, generateJwtToken, getTrimmedUser, validatePassword } from "../../lib/io-guards/auth.js";
import ThemeUser from "../../models/v1/ThemeUser.js";
import User from "../../models/v1/User.js";

/**
 * Create Theme User in the database
 */
const addThemeUser = async ({ user, ...reqBody }) => {
  const { name, username, password } = reqBody;

  try {
    const existingThemeUser = await ThemeUser.findOne({ username: username, isDeleted: false });

    if (existingThemeUser) {
      throw new Error("Username already exists!");
    }

    const loggedInUser = await User.findById(user._id);

    const newThemeUserObj = {
      userId: loggedInUser.cloneParentId ? loggedInUser.cloneParentId : loggedInUser._id,
      name,
      username,
      password: await encryptPassword(password),
    };

    const newThemeUser = await ThemeUser.create(newThemeUserObj);

    return newThemeUser;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Fetch theme user by Id from the database
 */
const fetchThemeUserId = async (_id, fields) => {
  try {
    let project = { password: 0 };
    if (fields) {
      project = fields;
    }
    return await ThemeUser.findById(_id, project);
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * update theme user in the database
 */
const modifyThemeUser = async ({ ...reqBody }) => {
  try {
    const exisitngThemeUsername = await ThemeUser.findOne({
      username: reqBody.username,
      _id: { $ne: reqBody._id },
    });
    if (exisitngThemeUsername) {
      throw new Error("Username already exists!");
    }

    if (reqBody?.password && reqBody.password != "") {
      reqBody.password = await encryptPassword(reqBody.password);
    } else {
      delete reqBody.password;
    }

    const updatedThemeUser = await ThemeUser.findByIdAndUpdate(reqBody._id, reqBody, {
      new: true,
    });

    return updatedThemeUser;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

// Fetch all theme users from the database
const fetchAllThemeUsers = async ({ ...reqBody }) => {
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

    const users = await ThemeUser.aggregate([
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
 * delete theme user in the database
 */
const removeThemeUser = async (_id) => {
  try {
    const themeUser = await ThemeUser.findById(_id);

    await themeUser.softDelete();

    return themeUser;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Login theme user
 */
const loginThemeUser = async ({ username, password }) => {
  try {
    const errorMessage = "The provided credentials are incorrect. Please try again.";

    // Check if username exists
    const existingUser = await ThemeUser.findOne({ username: username, isDeleted: false });
    if (!existingUser) {
      throw new Error(errorMessage);
    }

    // Check if password is valid
    const isValidPassword = await validatePassword(password, existingUser.password);
    if (!isValidPassword) {
      throw new Error(errorMessage);
    }

    let user = {
      _id: existingUser._id,
      name: existingUser.name,
      username: existingUser.username,
      superUserId: existingUser.userId,
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
    const existingUser = await ThemeUser.findOne({ _id: userId });
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
  addThemeUser,
  fetchThemeUserId,
  modifyThemeUser,
  fetchAllThemeUsers,
  removeThemeUser,
  loginThemeUser,
  resetPassword,
};
