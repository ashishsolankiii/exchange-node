import ErrorResponse from "../../lib/error-handling/error-response.js";
import {
  encryptPassword,
  generateJwtToken,
  getTrimmedUser,
  transferCloneParentFields,
  validatePassword,
} from "../../lib/io-guards/auth.js";
import { generateTransactionCode } from "../../lib/io-guards/transaction-code.js";
import Currency from "../../models/v1/Currency.js";
import LoggedInUser from "../../models/v1/LoggedInUser.js";
import User, { USER_ROLE } from "../../models/v1/User.js";
import permissionService from "./permissionService.js";
import mongoose from "mongoose";

const loginUser = async ({ username, password }) => {
  try {
    const allowedRoles = [
      USER_ROLE.SYSTEM_OWNER,
      USER_ROLE.SUPER_ADMIN,
      USER_ROLE.ADMIN,
      USER_ROLE.SUPER_MASTER,
      USER_ROLE.MASTER,
      USER_ROLE.AGENT,
    ];

    const errorMessage = "The provided credentials are incorrect. Please try again.";

    // Check if username exists
    const existingUser = await User.findOne({ username: username });
    if (!existingUser) {
      throw new Error(errorMessage);
    }

    // Check if user is allowed to login
    if (!allowedRoles.includes(existingUser.role)) {
      throw new Error(errorMessage);
    }

    // Check if password is valid
    const isValidPassword = await validatePassword(password, existingUser.password);
    if (!isValidPassword) {
      if (existingUser.role != USER_ROLE.SYSTEM_OWNER) {
        let count = existingUser.failedLoginAttempts;
        existingUser.failedLoginAttempts = count + 1;

        if (count + 1 >= 5) {
          existingUser.isActive = false;
          await existingUser.save();
          throw new Error("Account is inactive. Please contact your support!");
        }

        await existingUser.save();
        throw new Error(errorMessage);
      }

    }

    const token = generateJwtToken({ _id: existingUser._id });

    let loggedInUser = existingUser.toJSON();
    if (existingUser.cloneParentId) {
      loggedInUser = await transferCloneParentFields(existingUser.toJSON());
    }

    const user = getTrimmedUser(loggedInUser);
    const userPermissions = await permissionService.fetchUserPermissions({
      userId: loggedInUser._id,
    });

    existingUser.failedLoginAttempts = 0;
    await existingUser.save();

    return { user, token, userPermissions };
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const loginFrontUser = async ({ username, password, platform, ipAddress }) => {
  try {
    const allowedRoles = [USER_ROLE.USER];

    const errorMessage = "The provided credentials are incorrect. Please try again.";
    const inactiveMessage = "Account is inactive. Please contact your support!";

    // Check if username exists
    const existingUser = await User.findOne({
      username: username,
      role: USER_ROLE.USER,
      isDeleted: false
    });
    if (!existingUser) {
      throw new Error(errorMessage);
    }
    if (existingUser?.isActive != true) {
      throw new Error(inactiveMessage);
    }

    // Check if user is allowed to login
    if (!allowedRoles.includes(existingUser.role)) {
      throw new Error(errorMessage);
    }

    // Check if password is valid
    const isValidPassword = await validatePassword(password, existingUser.password);
    if (!isValidPassword) {
      let count = existingUser.failedLoginAttempts;
      existingUser.failedLoginAttempts = count + 1;

      if (count + 1 >= 5) {
        existingUser.isActive = false;
        await existingUser.save();
        throw new Error(inactiveMessage);
      }

      await existingUser.save();
      throw new Error(errorMessage);
    }

    const token = generateJwtToken({ _id: existingUser._id });

    const superUserId = await getSuperAdminUserId(existingUser._id);

    const masterUserId = await getMasterUserId(existingUser._id);

    const loggedInUser = existingUser.toJSON();

    const user = getTrimmedUser(loggedInUser);

    user.superUserId = superUserId;
    user.masterUserId = masterUserId;

    existingUser.failedLoginAttempts = 0;
    await existingUser.save();
    const existingLoggedInUser = await LoggedInUser.findOne({ userId: new mongoose.Types.ObjectId(existingUser._id) });
    if (existingLoggedInUser) {
      existingLoggedInUser.createdAt = new Date();
      existingLoggedInUser.token = token;
      existingLoggedInUser.save();
    }
    else {
      const newLoggedInUserObj = {
        userId: existingUser._id,
        parentId: existingUser.parentId,
        token: token,
        platform: platform,
        ipAddress: ipAddress
      };
      await LoggedInUser.create(newLoggedInUserObj);
    }

    return { user, token };
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const registerUser = async ({ username, password, fullName, currencyId, mobileNumber, domainUrl }) => {
  try {
    // Check if currency exists
    const encryptedPassword = await encryptPassword(password);
    const encryptedTransactionCode = await generateTransactionCode();


    const currency = await Currency.findById(currencyId);
    if (!currency) {
      throw new Error("Currency not found!");
    }

    const superAdmin = await User.findOne({ currencyId: currencyId, domainUrl: domainUrl });
    if (!superAdmin) {
      return {};
    }

    const newUser = {
      username,
      password: encryptedPassword,
      fullName,
      currencyId,
      mobileNumber,
      transactionCode: encryptedTransactionCode,
      parentId: superAdmin.defaultMasterUserId || null
    };

    const createdUser = await User.create(newUser);

    const registeredUser = createdUser.toJSON();

    const user = getTrimmedUser(registeredUser);

    return user;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const resetPassword = async ({ userId, oldPassword, newPassword, isForceChangePassword }) => {
  try {
    // Check if username exists
    const existingUser = await User.findOne({ _id: userId });
    if (!existingUser) {
      throw new Error("The provided credentials are incorrect. Please try again.");
    }

    if (existingUser.lockPasswordChange === true) {
      throw new Error("You can not change password.");
    }

    // Check if password is valid
    const isValidPassword = await validatePassword(oldPassword, existingUser.password);
    if (!isValidPassword) {
      throw new Error("Old password is incorrect!");
    }

    // Reset force password change
    if (["true", true].includes(isForceChangePassword)) {
      existingUser.forcePasswordChange = false;
    }
    existingUser.password = await encryptPassword(newPassword);
    existingUser.transactionCode = await generateTransactionCode();

    await existingUser.save();

    const user = getTrimmedUser(existingUser.toJSON(), ["transactionCode"]);

    return user;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const getSuperAdminUserId = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!(user && user.role !== USER_ROLE.SYSTEM_OWNER)) {
      return;
    }

    let iterationCount = 0;
    const maxIterationCount = Object.keys(USER_ROLE).length - 1; // Don't include SYSTEM_OWNER

    let currentParent = await User.findById(user.parentId);
    let finalParent;
    while (iterationCount < maxIterationCount && currentParent && currentParent.role !== USER_ROLE.SYSTEM_OWNER) {
      finalParent = currentParent._id;
      currentParent = await User.findById(currentParent.parentId);
      iterationCount++;
    }

    return finalParent;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const getMasterUserId = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!(user && user.role !== USER_ROLE.SYSTEM_OWNER)) {
      return;
    }

    let currentParent = await User.findById(user.parentId);
    let finalMasterId = "";
    let finalSuperUser = "";
    while (currentParent && currentParent.role !== USER_ROLE.SYSTEM_OWNER) {
      if (currentParent.role == USER_ROLE.MASTER) {
        finalMasterId = currentParent._id;
      }
      finalSuperUser = currentParent;
      currentParent = await User.findById(currentParent.parentId);
    }

    if (finalMasterId == "") {
      finalMasterId = finalSuperUser.defaultMasterUserId;
    }

    return finalMasterId;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const logout = async (userId) => {
  try {
    const deleteLoggedInUser = await LoggedInUser.deleteOne({ userId: userId });
    return deleteLoggedInUser;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

export default {
  loginUser,
  loginFrontUser,
  registerUser,
  resetPassword,
  getSuperAdminUserId,
  getMasterUserId,
  logout
};
