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
import User, { USER_ROLE } from "../../models/v1/User.js";
import permissionService from "./permissionService.js";

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
      throw new Error(errorMessage);
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

    return { user, token, userPermissions };
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const loginFrontUser = async ({ username, password }) => {
  try {
    const allowedRoles = [USER_ROLE.USER];

    const errorMessage = "The provided credentials are incorrect. Please try again.";

    // Check if username exists
    const existingUser = await User.findOne({
      username: username,
      role: USER_ROLE.USER,
      isDeleted: false,
      isActive: true
    });
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
      throw new Error(errorMessage);
    }

    const token = generateJwtToken({ _id: existingUser._id });

    const loggedInUser = existingUser.toJSON();

    const user = getTrimmedUser(loggedInUser);

    return { user, token };
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const registerUser = async ({ username, password, fullName, currencyId, mobileNumber }) => {
  try {
    // Check if currency exists
    const currency = await Currency.findById(currencyId);
    if (!currency) {
      throw new Error("Currency not found!");
    }

    const encryptedPassword = await encryptPassword(password);
    const encryptedTransactionCode = await generateTransactionCode();

    const newUser = {
      username,
      password: encryptedPassword,
      fullName,
      currencyId,
      mobileNumber,
      transactionCode: encryptedTransactionCode,
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

export default {
  loginUser,
  loginFrontUser,
  registerUser,
  resetPassword,
};
