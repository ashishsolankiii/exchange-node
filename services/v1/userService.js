import mongoose, { isValidObjectId } from "mongoose";
import ErrorResponse from "../../lib/error-handling/error-response.js";
import { encryptPassword, getTrimmedUser, transferCloneParentFields } from "../../lib/helpers/auth.js";
import { generatePaginationQueries, generateSearchFilters } from "../../lib/helpers/pipeline.js";
import { decryptTransactionCode, encryptTransactionCode, generateTransactionCode, validateTransactionCode } from "../../lib/helpers/transaction-code.js";
import AppModule from "../../models/v1/AppModule.js";
import User, { SETTLEMENT_DURATION, USER_ACCESSIBLE_ROLES, USER_ROLE } from "../../models/v1/User.js";
import transactionActivityService from "../../services/v1/transactionActivityService.js";
import permissionService from "./permissionService.js";

// Fetch all users from the database
const fetchAllUsers = async ({ user, ...reqBody }) => {
  try {
    const {
      page,
      perPage,
      sortBy,
      direction,
      showDeleted,
      role,
      searchQuery,
      parentId,
      cloneParentId,
      withPermissions,
    } = reqBody;

    // Pagination and Sorting
    const sortDirection = direction === "asc" ? 1 : -1;

    const paginationQueries = generatePaginationQueries(page, perPage);

    // Filters
    const filters = {
      isDeleted: showDeleted,
      role: { $ne: USER_ROLE.SYSTEM_OWNER },
    };

    if (role) {
      // Remove system_owner role
      let showRole = role.filter(function (e) {
        return e !== USER_ROLE.SYSTEM_OWNER;
      });
      filters.role = { $in: showRole };
    }

    if (cloneParentId) {
      filters.cloneParentId = new mongoose.Types.ObjectId(cloneParentId);
    }

    if (parentId) {
      filters.parentId = new mongoose.Types.ObjectId(parentId);
    }

    if (searchQuery) {
      const fields = ["username", "fullName", "mobileNumber"];
      filters.$or = generateSearchFilters(searchQuery, fields);
    }

    const loggedInUser = await User.findById(user._id, { role: 1, cloneParentId: 1 });
    if (loggedInUser.role !== USER_ROLE.SYSTEM_OWNER) {
      if (cloneParentId) {
        filters.cloneParentId = new mongoose.Types.ObjectId(cloneParentId);
      } else if (loggedInUser?.cloneParentId) {
        filters.parentId = new mongoose.Types.ObjectId(parentId);
      } else {
        filters.parentId = new mongoose.Types.ObjectId(user._id);
      }
    } else {
      filters.cloneParentId = { $exists: false };
    }

    const users = await User.aggregate([
      {
        $match: filters,
      },
      {
        $lookup: {
          from: "users",
          localField: "parentId",
          foreignField: "_id",
          as: "parentUser",
          pipeline: [
            {
              $project: { username: 1 },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$parentUser",
          preserveNullAndEmptyArrays: true,
        },
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

    // User permissions
    if (withPermissions) {
      for (const user of data.records) {
        const permissions = await permissionService.fetchUserActivePermissions({ userId: user._id });
        user.permissions = permissions || null;
      }
    }

    return data;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Fetch user by Id from the database
 */
const fetchUserId = async (_id, fields = {}) => {
  try {
    let projection = {};

    if (fields && Object.keys(fields).length) {
      projection = { ...fields, cloneParentId: 1 };
    }

    let user = await User.findById(_id, projection);

    if (user.cloneParentId) {
      user = await transferCloneParentFields(user, fields);
    }

    delete user.password;
    delete user.transactionCode;

    return user;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * Create user in the database
 */
const addUser = async ({ user, ...reqBody }) => {
  const {
    fullName,
    username,
    password,
    rate,
    creditPoints,
    role,
    currencyId,
    mobileNumber,
    countryCode,
    settlementDurationType,
    settlementDate,
    settlementDay,
    settlementTime,
    city,
    forcePasswordChange,

    // Super Admin Params
    domainUrl,
    contactEmail,
    availableSports,
    isCasinoAvailable,
    isAutoSettlement,
  } = reqBody;

  try {
    const loggedInUser = await User.findById(user._id);

    const newUserObj = {
      fullName,
      username,
      password: await encryptPassword(password),
      transactionCode: await generateTransactionCode(),
      role,
      city,
      rate,
      settlementDurationType,
      settlementDate,
      settlementDay,
      settlementTime,
      mobileNumber,
      currencyId: loggedInUser.currencyId,
      parentId: loggedInUser.cloneParentId ? loggedInUser.cloneParentId : loggedInUser._id,
      countryCode,
      forcePasswordChange,
    };

    // For Role = User add other params
    if (newUserObj.role === USER_ROLE.USER) {
      newUserObj.isBetLock = reqBody.isBetLock;
      newUserObj.forcePasswordChange = reqBody.forcePasswordChange;
      newUserObj.exposureLimit = reqBody.exposureLimit;
      newUserObj.exposurePercentage = reqBody.exposurePercentage;
      newUserObj.stakeLimit = reqBody.stakeLimit;
      newUserObj.maxProfit = reqBody.maxProfit;
      newUserObj.maxLoss = reqBody.maxLoss;
      newUserObj.bonus = reqBody.bonus;
      newUserObj.maxStake = reqBody.maxStake;
    }

    // Only for SUPER_ADMIN
    if (role === USER_ROLE.SUPER_ADMIN) {
      newUserObj.domainUrl = domainUrl;
      newUserObj.contactEmail = contactEmail;
      newUserObj.availableSports = availableSports;
      newUserObj.isCasinoAvailable = isCasinoAvailable;
      newUserObj.isAutoSettlement = isAutoSettlement;
    }

    if (settlementDurationType === SETTLEMENT_DURATION.DAILY) {
      newUserObj.settlementDate = null;
      newUserObj.settlementDay = null;
    }
    if (settlementDurationType === SETTLEMENT_DURATION.WEEKLY) {
      newUserObj.settlementDate = null;
    }

    // Credit Points and Balance
    if (creditPoints) {
      if (creditPoints > loggedInUser.balance) {
        throw new Error("Given credit points exceed the available balance!");
      }
      newUserObj.creditPoints = creditPoints;
      newUserObj.balance = creditPoints;
    }

    // Currency
    if (loggedInUser.role === USER_ROLE.SYSTEM_OWNER) {
      if (!currencyId) {
        throw new Error("currencyId is required!");
      }
      newUserObj.currencyId = currencyId;
    }

    const decryptedTransactionCode = decryptTransactionCode(loggedInUser.transactionCode);
      let newUser = []
    if (reqBody.role !== USER_ROLE.ADMIN) {
      // Create the user if the role is not ADMIN
       newUser = await User.create(newUserObj);
    } else {
      if (reqBody.transactionCode === decryptedTransactionCode) {
        // Create the user only if the role is ADMIN and transaction codes match
        console.log("Transaction Codes Match. Creating User...");
         newUser = await User.create(newUserObj);
        console.log("User Successfully Created.");
      } else {
        // Throw an error if the role is ADMIN but transaction codes don't match
        console.log("Transaction Codes Do Not Match.");
        throw new Error("Transaction Code is not the same");
      }
    }

    // Create entry in transaction type debit
    await transactionActivityService.createTransaction({
      points: creditPoints,
      balancePoints: loggedInUser.balance - creditPoints,
      type: "debit",
      remark: "User creation",
      userId: loggedInUser._id,
      fromId: newUser._id,
      fromtoName: loggedInUser.username + " / " + username,
    });

    // Create entry in transaction type credit
    await transactionActivityService.createTransaction({
      points: creditPoints,
      balancePoints: creditPoints,
      type: "credit",
      remark: "Opening pts",
      userId: newUser._id,
      fromId: loggedInUser._id,
      fromtoName: loggedInUser.username + " / " + username,
    });

    // Update logged in users balance and child status
    loggedInUser.balance = loggedInUser.balance - creditPoints;
    loggedInUser.hasChild = true;

    await loggedInUser.save();

    return newUser;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const calculateUserPointBalance = async (currentUser, userReq) => {
  try {
    const parentUser = await User.findById(currentUser.parentId);

    let userNewCreditPoints = currentUser.creditPoints;
    let userNewBalance = currentUser.balance;
    const currentUserBalanceInUse = currentUser.creditPoints - currentUser.balance;

    let parentNewBalance = parentUser.balance;

    const pointDiff = userReq.creditPoints - currentUser.creditPoints;

    // If points reduced
    if (pointDiff < 0) {
      if (currentUser.balance < Math.abs(pointDiff)) {
        throw new Error("Balance already in use!");
      }
      parentNewBalance = parentUser.balance + Math.abs(pointDiff);
      // If no change in points
    } else if (pointDiff === 0) {
      userNewCreditPoints = currentUser.creditPoints;
      userNewBalance = currentUser.balance;
      parentNewBalance = parentUser.balance;
      // If points increased
    } else if (pointDiff > 0) {
      if (parentUser.balance < pointDiff) {
        throw new Error("Insufficient balance!");
      }
      parentNewBalance = parentUser.balance - pointDiff;
    }

    userNewCreditPoints = currentUser.creditPoints + pointDiff;
    userNewBalance = userNewCreditPoints - currentUserBalanceInUse;

    return {
      creditPoints: userNewCreditPoints,
      balance: userNewBalance,
      parentBalance: parentNewBalance,
    };
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * update user in the database
 */
const modifyUser = async ({ user, ...reqBody }) => {
  try {
    const exisitngUsername = await User.findOne({
      username: reqBody.username,
      _id: { $ne: reqBody._id },
    });

    if (exisitngUsername) {
      throw new Error("Username already exists!");
    }
    const currentUser = await User.findById(reqBody._id);
    if (currentUser.role === USER_ROLE.SYSTEM_OWNER) {
      throw new Error("Failed to update user!");
    }

    const loggedInUser = await User.findById(user._id);

    if (reqBody?.isTransactionCode === true || reqBody.transactionCode) {
      const isValidCode = validateTransactionCode(reqBody.transactionCode, loggedInUser.transactionCode);
      if (!isValidCode) {
        throw new Error("Invalid transactionCode!");
      }
    }

    if (currentUser?.cloneParentId) {
      // If user is cloned user, then logged in user should be the parent of the cloned user
      if (!(currentUser.cloneParentId.toString() === loggedInUser._id.toString())) {
        throw new Error("Failed to update user!");
      }
    } else {
      // Logged in user should have access to the current user's role
      // Logged in user should be direct parent or System Owner
      if (
        !(
          USER_ACCESSIBLE_ROLES[loggedInUser.role].includes(currentUser.role) &&
          (currentUser.parentId.toString() === loggedInUser._id.toString() ||
            loggedInUser.role === USER_ROLE.SYSTEM_OWNER)
        )
      ) {
        throw new Error("Failed to update user!");
      }
    }

    if (reqBody.settlementDurationType === SETTLEMENT_DURATION.DAILY) {
      reqBody.settlementDay = null;
      reqBody.settlementDate = null;
    }
    if (reqBody.settlementDurationType === SETTLEMENT_DURATION.WEEKLY) {
      reqBody.settlementDate = null;
    }

    const { creditPoints, balance, parentBalance } = await calculateUserPointBalance(currentUser, reqBody);

    reqBody.creditPoints = creditPoints;
    reqBody.balance = balance;

    if (reqBody?.password) {
      reqBody.password = await encryptPassword(reqBody.password);
      reqBody.transactionCode = await generateTransactionCode();
    } else {
      delete reqBody.password;
      delete reqBody.transactionCode;
    }

    // If currentUser is not SUPER_ADMIN
    if (currentUser.role !== USER_ROLE.SUPER_ADMIN) {
      delete reqBody.domainUrl;
      delete reqBody.contactEmail;
    }

    // Remove fields not allowed to be updated
    delete reqBody.username;
    delete reqBody.role;
    delete reqBody.currencyId;

    const updatedUser = await User.findByIdAndUpdate(currentUser._id, reqBody, {
      new: true,
    });

    // Update user's permissions if it's a cloned user
    if (currentUser?.cloneParentId) {
      await permissionService.setUserPermissions({
        userId: currentUser._id,
        moduleIds: reqBody.moduleIds,
      });
    }

    // Update parent's balance
    await User.findOneAndUpdate(updatedUser.parentId, {
      balance: parentBalance,
    });

    return updatedUser;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * delete user in the database
 */
const removeUser = async (_id) => {
  try {
    const user = await User.findById(_id);

    await user.softDelete();

    return user;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const statusModify = async ({ _id, fieldName, status }) => {
  try {
    const user = await User.findByIdAndUpdate(_id, { [fieldName]: status }, { new: true });

    const userObj = await getTrimmedUser(user);

    return userObj;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

/**
 * fetch balance
 */
const fetchBalance = async ({ ...reqBody }) => {
  try {
    const { userId } = reqBody;
    const user = await User.findOne({ _id: userId, role: { $ne: USER_ROLE.SYSTEM_OWNER } }, { balance: 1, _id: 0 });
    if (user) {
      return user;
    } else {
      throw new Error("User Not Found!");
    }
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const cloneUser = async ({ user, ...reqBody }) => {
  try {
    const { fullName, username, password, moduleIds, transactionCode } = reqBody;

    // Only accept valid moduleIds
    const validModuleIds = [];
    for (const id of moduleIds) {
      if (!isValidObjectId(id)) {
        continue;
      }
      const module = await AppModule.findById(id);
      if (module) {
        validModuleIds.push(id);
      }
    }

    const cloneParent = await User.findById(user._id).lean();
    // Throw error if user is not a clone parent
    // Throw error if user is a system owner
    // Throw error if user is a clone child
    if (
      !cloneParent ||
      [USER_ROLE.SYSTEM_OWNER, USER_ROLE.USER].includes(cloneParent.role) ||
      !!cloneParent.cloneParentId
    ) {
      throw new Error("Unauthorised request!");
    }

    // Check if transactionCode is valid
    const isValidCode = validateTransactionCode(transactionCode, cloneParent?.transactionCode);
    if (!isValidCode) {
      throw new Error("Invalid transactionCode!");
    }

    // Encrypt password
    const encryptedPassword = await encryptPassword(password);

    // Create user
    const newUserObj = {
      ...cloneParent,
      cloneParentId: cloneParent._id,
      fullName,
      username,
      password: encryptedPassword,
    };

    // Remove unwanted fields
    delete newUserObj._id;
    delete newUserObj.transactionCode;
    delete newUserObj.mobileNumber;
    delete newUserObj.balance;
    delete newUserObj.creditPoints;

    const clonedUser = await User.create(newUserObj);

    // Set user permissions
    await permissionService.setUserPermissions({
      userId: clonedUser._id,
      moduleIds,
    });

    return clonedUser;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const fetchHydratedUser = async (_id) => {
  try {
    let user = await User.findById(_id);

    if (user.cloneParentId) {
      user = await transferCloneParentFields(user);
    }

    user = await getTrimmedUser(user);
    user.scKey = await permissionService.fetchUserActivePermissions({ userId: user._id });

    return user;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

export default {
  fetchAllUsers,
  fetchUserId,
  addUser,
  modifyUser,
  removeUser,
  statusModify,
  fetchBalance,
  cloneUser,
  fetchHydratedUser,
};
