import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { appConfig } from "../../config/app.js";
import User, { CLONE_SHARED_FIELDS } from "../../models/v1/User.js";

/**
 * Encrypts a password using bcrypt.
 *
 * @param {string} password - The password to be encrypted.
 * @returns {Promise<string>} A promise that resolves to the hashed password.
 */
export const encryptPassword = async (password) => {
  const salt = await bcrypt.genSalt(appConfig.SALT_ROUNDS);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
};

/**
 * Validates a password by comparing it to a hashed password.
 *
 * @param {string} password - The password to be validated.
 * @param {string} hashedPassword - The hashed password to compare against.
 * @returns {Promise<boolean>} A promise that resolves to a boolean indicating if the password is valid.
 */
export const validatePassword = async (password, hashedPassword) => {
  const isValid = await bcrypt.compare(password, hashedPassword);
  return isValid;
};

/**
 * Generates a JWT token with the provided payload.
 *
 * @param {Object} payload - The payload to be included in the JWT token.
 * @returns {string} The generated JWT token.
 */
export const generateJwtToken = (payload) => {
  const token = jwt.sign(payload, appConfig.JWT_SECRET, {
    expiresIn: appConfig.JWT_EXPIRY,
  });

  const prefix = appConfig.JWT_TOKEN_PREFIX || "";

  return `${prefix} ${token}`;
};

/**
 * Parses a JWT token and returns the token data.
 *
 * @param {string} token - The JWT token to be parsed.
 * @returns {Promise<{isValid: boolean, tokenData?: object, message?: string}>}
 * @throws {Error} If the token is invalid.
 * @throws {Error} If the token is missing.
 * @throws {Error} If the token prefix is invalid.
 * @throws {Error} If the token is expired.
 * @throws {Error} If the token is inactive.
 */
export const parseJwtToken = async (token) => {
  const jwtErrors = {
    TokenExpiredError: "Token expired!",
    JsonWebTokenError: "Invalid token!",
    NotBeforeError: "Inactive token!",
  };

  try {
    if (!token) {
      throw new Error("Missing token!");
    }

    const prefix = appConfig.JWT_TOKEN_PREFIX + " " || "";
    const tokenPrefix = token.slice(0, prefix.length);

    if (prefix.length && tokenPrefix !== prefix) {
      throw new Error("Invalid token!");
    }

    const originalToken = token.replace(prefix, "");
    const parsedToken = jwt.verify(originalToken, appConfig.JWT_SECRET);

    return { isValid: true, tokenData: parsedToken };
  } catch (e) {
    let errorMessage = e.message;

    if (Object.keys(jwtErrors).includes(e.name)) {
      errorMessage = jwtErrors[e.name];
    }

    return { isValid: false, message: errorMessage };
  }
};

/**
 * Validates a JWT token and attaches the token data to the request object.
 *
 * @param {*} req
 * @returns {Promise<{isValid: boolean, tokenData?: object, message?: string}>}
 */
export const validateJwtToken = async (req) => {
  const token = req.get("Authorization");
  const parserResult = await parseJwtToken(token);
  if (parserResult.isValid) {
    req.user = parserResult.tokenData;
  }
  return parserResult;
};

/**
 * Get a trimmed user object with selected properties.
 *
 * This function takes a user object and returns a new object with selected properties
 * that are considered essential and safe to be exposed in certain situations. It creates
 * a trimmed version of the user object with only the specified properties.
 *
 * @function getTrimmedUser
 * @param {Object|mongoose.Model} userObject - The user object or a mongoose Model instance representing the user.
 * @returns {Object} A new object containing selected properties from the input user object.
 * @throws {Error} If the user object is not a valid object or mongoose Model instance.
 */
export const getTrimmedUser = (userObject, additionalFields = []) => {
  let user = userObject;

  if (userObject instanceof mongoose.Model) {
    user = userObject.toJSON();
  }

  const userObj = {
    _id: user._id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
    isBetLock: user.isBetLock,
    isDemo: user.isDemo,
    isClone: user?.cloneParentId ? true : false,
    cloneParentId: user.cloneParentId,
    balance: user.balance,
    forcePasswordChange: user.forcePasswordChange,
    deviceToken: user.deviceToken,
    exposure: user.exposure,
  };

  if (additionalFields.length) {
    additionalFields.forEach((field) => {
      if (user[field]) {
        userObj[field] = user[field];
      }
    });
  }

  return userObj;
};

/**
 * Transfers shared fields from a user's clone parent to the user object.
 *
 * @async
 * @function
 * @param {Object} user - The user object to transfer fields to.
 * @param {Object} [fields={}] - An object containing fields to transfer.
 * @returns {Object} - The user object with transferred fields.
 * @throws {Error} - If the clone parent is not found.
 */
export const transferCloneParentFields = async (user, fields = {}) => {
  const cloneParent = await User.findById(user.cloneParentId);

  if (!cloneParent) {
    throw new Error("Clone parent not found!");
  }

  for (const field of CLONE_SHARED_FIELDS) {
    if (field in user && field in cloneParent) {
      user[field] = cloneParent[field];
    }
  }

  let userObj = {};

  if (fields && Object.keys(fields).length) {
    Object.keys(fields).forEach((field) => {
      if (field in user && fields[field] === 1) {
        userObj[field] = user[field];
      }
    });
  } else {
    userObj = user;
  }

  return userObj;
};
