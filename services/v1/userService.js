import mongoose, { isValidObjectId } from "mongoose";
import ErrorResponse from "../../lib/error-handling/error-response.js";
import { generatePaginationQueries, generateSearchFilters } from "../../lib/helpers/pipeline.js";
import { encryptPassword, getTrimmedUser, transferCloneParentFields, validatePassword } from "../../lib/io-guards/auth.js";
import { generateTransactionCode, validateTransactionCode } from "../../lib/io-guards/transaction-code.js";
import AppModule from "../../models/v1/AppModule.js";
import User, { SETTLEMENT_DURATION, USER_ACCESSIBLE_ROLES, USER_ROLE } from "../../models/v1/User.js";
import transactionActivityService from "../../services/v1/transactionActivityService.js";
import permissionService from "./permissionService.js";
import authService from "./authService.js";
import LoggedInUser from "../../models/v1/LoggedInUser.js";

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
        const permissions = await permissionService.fetchUserPermissions({ userId: user._id });
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
    transactionCode,
    defaultMasterUserId,
    businessType
  } = reqBody;

  try {
    const loggedInUser = await User.findById(user._id);

    // Check transaction code
    if (loggedInUser.role !== USER_ROLE.SYSTEM_OWNER) {
      const isValidCode = validateTransactionCode(transactionCode, loggedInUser.transactionCode);
      if (!isValidCode) {
        throw new Error("Invalid transactionCode!");
      }
    }

    const existingUsername = await User.findOne({ username: username }, { _id: 1 });
    if (existingUsername) {
      throw new Error("Username already exists. Please choose a different username.");
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error("Username can only contain alphanumeric characters or an underscore.");
    }
    // Existing mobile number
    const existingMobile = await User.findOne({ mobileNumber: reqBody.mobileNumber }, { _id: 1 });
    if (reqBody.mobileNumber && existingMobile) {
      throw new Error("Mobile number already in use. Please choose a different mobile number.");
    }

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
      defaultMasterUserId,
      businessType
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

    let newUser = [];
    newUser = await User.create(newUserObj);

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
    // Existing username check
    const exisitngUsername = await User.findOne({ username: reqBody.username, _id: { $ne: reqBody._id } }, { _id: 1 });
    if (exisitngUsername) {
      throw new Error("Username already exists. Please choose a different username.");
    } else if (!/^[a-zA-Z0-9_]+$/.test(reqBody.username)) {
      throw new Error("Username can only contain alphanumeric characters or an underscore.");
    }

    // Existing mobile number
    const existingMobile = await User.findOne(
      { mobileNumber: reqBody.mobileNumber, _id: { $ne: reqBody._id } },
      { _id: 1 }
    );
    if (reqBody.mobileNumber && existingMobile) {
      throw new Error("Mobile number already in use. Please choose a different mobile number.");
    }

    const currentUser = await User.findById(reqBody._id);
    if (currentUser.role === USER_ROLE.SYSTEM_OWNER) {
      throw new Error("Failed to update user!");
    }

    const loggedInUser = await User.findById(user._id);

    // Check transaction code
    if (loggedInUser.role !== USER_ROLE.SYSTEM_OWNER) {
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
    if (reqBody.isMultiLoginUser === true && !reqBody.moduleIds?.length) {
      throw new Error("Please select atleast one module.");
    }
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
    let updateColumn =
    {
      [fieldName]: status
    }
    if (fieldName == 'isActive' && status == "true") {
      updateColumn.failedLoginAttempts = 0
    }
    const user = await User.findByIdAndUpdate(_id, updateColumn, { new: true });

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

    const exisitngUsername = await User.findOne({ username: username }, { _id: 1 });
    if (exisitngUsername) {
      throw new Error("Username already exists. Please choose a different username.");
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error("Username can only contain alphanumeric characters or an underscore.");
    }

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
    if (!validModuleIds.length) {
      throw new Error("Please select atleast one module.");
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

    const superUserId = await authService.getSuperAdminUserId(user._id);
    const masterUserId = await authService.getMasterUserId(user._id);

    let superUser = await User.findById(superUserId).select("businessType");
    user.superUserId = superUserId;
    user.masterUserId = masterUserId;
    user.businessType = superUser.businessType;
    user.scKey = await permissionService.fetchUserActivePermissions({ userId: user._id });

    return user;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const changePassword = async ({ user, ...reqBody }) => {
  try {
    // Check if user id exists
    const existingUser = await User.findOne({ _id: reqBody.loginUserId });
    if (!existingUser) {
      throw new Error("The provided credentials are incorrect. Please try again.");
    }

    // Check if password is valid
    const isValidPassword = await validatePassword(reqBody.oldPassword, existingUser.password);
    if (!isValidPassword) {
      throw new Error("Old password is incorrect!");
    }

    existingUser.password = await encryptPassword(reqBody.newPassword);
    await existingUser.save();
    const user = getTrimmedUser(existingUser.toJSON(), ["transactionCode"]);

    return user;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const getAllChildUsers = async (loginUserId) => {
  try {
    const userIds = [];
    const findUser = await User.findOne({ _id: loginUserId });
    async function getChidUsers(user, userArray) {
      let findUsers = await User.find({ parentId: user._id });

      for (var i = 0; i < findUsers.length; i++) {
        if (findUsers[i].role == USER_ROLE.USER) {
          userArray.push(findUsers[i]._id);
        }
        await getChidUsers(findUsers[i], userArray);
      }
    }
    await getChidUsers(findUser, userIds);

    return userIds;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const fetchSuperAdminMasters = async (_id) => {
  try {
    const userIds = [];
    const findUser = await User.findOne({ _id: _id });
    async function getChidUsers(user, userArray) {
      let findUsers = await User.find({ parentId: user._id });

      for (var i = 0; i < findUsers.length; i++) {
        if (findUsers[i].role == USER_ROLE.MASTER) {
          userArray.push({ _id: findUsers[i]._id, username: findUsers[i]?.username });
        }
        await getChidUsers(findUsers[i], userArray);
      }
    }
    await getChidUsers(findUser, userIds);
    const data = {
      records: userIds
    }
    return data;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

// Fetch all users from the database
const fetchLoggedInUsers = async ({ user, ...reqBody }) => {
  try {
    const {
      page,
      perPage,
      sortBy,
      direction,
    } = reqBody;

    // Pagination and Sorting
    const sortDirection = direction === "asc" ? 1 : -1;

    const paginationQueries = generatePaginationQueries(page, perPage);

    const fiveHoursAgo = new Date();
    fiveHoursAgo.setHours(fiveHoursAgo.getHours() - 5);
    const users = await LoggedInUser.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(fiveHoursAgo) }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
          pipeline: [
            {
              $project: { username: 1, mobileNumber: 1, balance: 1, userPl: 1, exposure: 1, isActive: 1, createdAt: 1 },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
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
  changePassword,
  getAllChildUsers,
  fetchSuperAdminMasters,
  fetchLoggedInUsers
};
