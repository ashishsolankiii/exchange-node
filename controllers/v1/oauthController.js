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
 * Role : User.
 *
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @returns {object} Login for only front end user.
 */
const userlogin = async (req, res) => {
  const { user, body } = await authRequest.userLoginRequest(req);

  const userWithToken = await authService.loginFrontUser({ user, ...body });

  await userActivityService.createUserActivity({
    userId: userWithToken.user._id,
    event: USER_ACTIVITY_EVENT.LOGIN,
    ipAddress: body.ipAddress,
    description: body.description,
    city: body.city,
    country: body.country,
    platform: body.platform,
  });

  return res.status(200).json({ success: true, data: userWithToken });
};

// Create a new user
const createUser = async (req, res) => {
  const { user, body } = await userRequest.createUserRequest(req);

  const newUser = await userService.addUser({ user, ...body });

  const parentUser = await User.findById(user._id);
  const parentUserDetails = getTrimmedUser(parentUser);
  io.user.emit(`user:${parentUserDetails._id}`, parentUserDetails);

  await userActivityService.createUserActivity({
    userId: newUser._id,
    event: USER_ACTIVITY_EVENT.CREATED,
    ipAddress: body.ipAddress,
    description: body.description,
  });

  res.status(201).json({ success: true, data: { details: newUser } });
};

const fetchUserBalance = async (req, res) => {
  const { user, body } = await userRequest.fetchUserBalanceRequest(req);

  const fetchBalance = await userService.fetchBalance({ user, ...body });

  res.status(200).json({ success: true, data: fetchBalance });
};

const createTransaction = async (req, res) => {
  const { body } = await transactionActivityRequest.createTransactionRequest(req);

  const newTransaction = await transactionActivityService.addTransaction({ user: req.user, ...body });

  res.status(201).json({ success: true, data: { details: newTransaction } });
};

const changePassword = async (req, res) => {
  const { user, body } = await userRequest.changePasswordRequest(req);

  const users = await userService.changePassword({ user, ...body });

  return res.status(200).json({ success: true, data: users });
};

export default {
  userlogin,
  createUser,
  fetchUserBalance,
  createTransaction,
  changePassword
};