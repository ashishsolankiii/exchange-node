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
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';

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

const loginFrontUser = async ({ username, password }) => {
  try {
    const customVerify = async (username, password, done) => {
      try {
        const allowedRoles = [USER_ROLE.USER];
        const errorMessage = "The provided credentials are incorrect. Please try again.";
        const inactiveMessage = "Account is inactive. Please contact your support!";
        const user = await User.findOne({
          username: username,
          role: USER_ROLE.USER,
          isDeleted: false
        });
        if (!user) {
          return done(null, false, { message: errorMessage });
        }
        if (user?.isActive != true) {
          return done(null, false, { message: inactiveMessage });
        }

        // Check if user is allowed to login
        if (!allowedRoles.includes(user.role)) {
          return done(null, false, { message: errorMessage });
        }
        // Check if password is valid
        const isValidPassword = await validatePassword(password, user.password);
        if (!isValidPassword) {
          let count = user.failedLoginAttempts;
          user.failedLoginAttempts = count + 1;

          if (count + 1 >= 5) {
            user.isActive = false;
            await user.save();
            return done(null, false, { message: inactiveMessage });
          }

          await user.save();
          return done(null, false, { message: errorMessage });
        }

        return done(null, user);

      } catch (error) {
        return done(error);
      }
    };
    // Configure passport to use the custom verification function
    passport.use(new LocalStrategy({ usernameField: 'username' }, customVerify));

    // Manually authenticate a user
    const authenticateUser = async (username, password) => {
      return new Promise((resolve, reject) => {
        customVerify(username, password, (err, user, info) => {
          if (err || !user) {
            reject(info && info.message ? info.message : 'Authentication failed');
          }

          resolve(user);
        });
      });
    };

    let data = await authenticateUser(username, password)
      .then(async (user) => {
        const token = generateJwtToken({ _id: user._id });

        const superUserId = await getSuperAdminUserId(user._id);

        const masterUserId = await getMasterUserId(user._id);

        const loggedInUser = user.toJSON();

        let finaluser = getTrimmedUser(loggedInUser);

        user.superUserId = superUserId;
        user.masterUserId = masterUserId;

        user.failedLoginAttempts = 0;
        await user.save();
        return { finaluser, token };
      })
      .catch((error) => {
        throw new ErrorResponse(error).status(200);
        // Handle authentication failure
      });

    return data;

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

export default {
  loginUser,
  loginFrontUser,
  registerUser,
  resetPassword,
  getSuperAdminUserId,
  getMasterUserId
};
