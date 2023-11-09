// Importing necessary modules and services
import { USER_ACTIVITY_EVENT } from "../../models/v1/UserActivity.js";
import authRequest from "../../requests/v1/authRequest.js";
import authService from "../../services/v1/authService.js";
import userActivityService from "../../services/v1/userActivityService.js";
import userRequest from "../../requests/v1/userRequest.js";
import userService from "../../services/v1/userService.js";
import User from "../../models/v1/User.js";
import { getTrimmedUser } from "../../lib/io-guards/auth.js";
import { io } from "../../socket/index.js";
import transactionActivityRequest from "../../requests/v1/transactionActivityRequest.js";
import transactionActivityService from "../../services/v1/transactionActivityService.js";

/**
 * Handles user login for the front end.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @returns {object} Login details for the front end user.
 */
const userlogin = async (req, res) => {
  // Destructuring assignment to extract user and body from the request
  const { user, body } = await authRequest.userLoginRequest(req);

  // Attempt to log in the front-end user
  const userWithToken = await authService.loginFrontUser({ user, ...body });

  // Create a user activity record for the login event
  await userActivityService.createUserActivity({
    userId: userWithToken.user._id,
    event: USER_ACTIVITY_EVENT.LOGIN,
    ipAddress: body.ipAddress,
    description: 'External Api User Login',
    city: body.city,
    country: body.country,
    platform: body.platform,
  });

  // Respond with the successful login data
  return res.status(200).json({ success: true, data: userWithToken });
};

/**
 * Creates a new user.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @returns {object} Details of the newly created user.
 */
const createUser = async (req, res) => {
  // Destructuring assignment to extract user and body from the request
  const { user, body } = await userRequest.createUserRequest(req);

  // Attempt to add a new user
  const newUser = await userService.addUser({ user, ...body });

  // Get details of the parent user and emit an event using socket.io
  const parentUser = await User.findById(user._id);
  const parentUserDetails = getTrimmedUser(parentUser);
  io.user.emit(`user:${parentUserDetails._id}`, parentUserDetails);

  // Create a user activity record for the user creation event
  await userActivityService.createUserActivity({
    userId: newUser._id,
    event: USER_ACTIVITY_EVENT.CREATED,
    ipAddress: body.ipAddress,
    description: 'External Api User Created',
  });

  // Respond with the successful user creation data
  res.status(201).json({ success: true, data: { details: newUser } });
};

/**
 * Fetches the balance of a user.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @returns {object} User balance information.
 */
const fetchUserBalance = async (req, res) => {
  // Destructuring assignment to extract user and body from the request
  const { user, body } = await userRequest.fetchUserBalanceRequest(req);

  // Fetch the user balance
  const fetchBalance = await userService.fetchBalance({ user, ...body });

  // Respond with the fetched user balance data
  res.status(200).json({ success: true, data: fetchBalance });
};

/**
 * Creates a new transaction.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @returns {object} Details of the newly created transaction.
 */
const createTransaction = async (req, res) => {
  // Destructuring assignment to extract body from the request
  const { body } = await transactionActivityRequest.createTransactionRequest(req);

  // Attempt to add a new transaction
  const newTransaction = await transactionActivityService.addTransaction({ user: req.user, ...body });

  // Respond with the successful transaction data
  res.status(201).json({ success: true, data: { details: newTransaction } });
};

/**
 * Changes the password of a user.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @returns {object} Details after changing the user password.
 */
const changePassword = async (req, res) => {
  // Destructuring assignment to extract user and body from the request
  const { user, body } = await userRequest.changePasswordRequest(req);

  // Attempt to change the user password
  const users = await userService.changePassword({ user, ...body });

  // Respond with the successful user password change data
  return res.status(200).json({ success: true, data: users });
};


/**
 * Get all user listing.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @returns {object} Details after changing the user listing.
 */
const getAllUser = async (req, res) => {
  // Destructure user and body from the request using userRequest
  const { user, body } = await userRequest.userListingRequest(req);

  // Fetch all users using userService
  const users = await userService.fetchAllUsers({ user, ...body });

  // Respond with the fetched users data
  return res.status(200).json({ success: true, data: users });
};

// Exporting the functions as part of an object
export default {
  userlogin,
  createUser,
  fetchUserBalance,
  createTransaction,
  changePassword,
  getAllUser
};
