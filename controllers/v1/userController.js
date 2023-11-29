import ErrorResponse from "../../lib/error-handling/error-response.js";
import { getTrimmedUser } from "../../lib/io-guards/auth.js";
import { decryptTransactionCode } from "../../lib/io-guards/transaction-code.js";
import User from "../../models/v1/User.js";
import { USER_ACTIVITY_EVENT } from "../../models/v1/UserActivity.js";
import userRequest from "../../requests/v1/userRequest.js";
import userActivityService from "../../services/v1/userActivityService.js";
import userService from "../../services/v1/userService.js";
import { io } from "../../socket/index.js";

// Get all users
const getAllUser = async (req, res) => {
  const { user, body } = await userRequest.userListingRequest(req);

  const users = await userService.fetchAllUsers({ user, ...body });

  return res.status(200).json({ success: true, data: users });
};

// Get user by ID
const getUserById = async (req, res) => {
  const { _id = null, fields } = req.body;

  if (!_id) {
    throw new Error("_id is required");
  }

  const user = await userService.fetchUserId(_id, fields);

  res.status(200).json({ success: true, data: { details: user } });
};

const getUserDetails = async (req, res) => {
  const { _id } = req.user;
  const { fields } = req.body;

  const user = await userService.fetchUserId(_id, fields || { _id: 1, username: 1 });

  res.status(200).json({ success: true, data: { details: user } });
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

// Update a user
const updateUser = async (req, res) => {
  const { user, body } = await userRequest.updateUserRequest(req);

  const updatedUser = await userService.modifyUser({ user, ...body });

  const userDetails = getTrimmedUser(updatedUser);
  io.user.emit(`user:${userDetails._id}`, userDetails);

  if (userDetails.parentId) {
    const parentUser = await User.findById(userDetails.parentId);
    const parentUserDetails = getTrimmedUser(parentUser);
    io.user.emit(`user:${parentUserDetails._id}`, parentUserDetails);
  }

  await userActivityService.createUserActivity({
    userId: updatedUser._id,
    event: USER_ACTIVITY_EVENT.UPDATED,
    ipAddress: body.ipAddress,
    description: body.description,
  });

  res.status(200).json({ success: true, data: { details: updatedUser } });
};

// Delete a user
const deleteUser = async (req, res) => {
  const { _id } = req.body;

  if (!_id) {
    throw new Error("_id is required!");
  }

  const deletedUser = await userService.removeUser(_id);

  res.status(200).json({ success: true, data: { details: deletedUser } });
};

// Bet Lock
const updateUserStatus = async (req, res) => {
  const _id = req.body?._id || null;
  const fieldName = req.body.fieldName || null;
  const status = req.body.status || null;

  if (!(_id && fieldName && status)) {
    throw new Error("Missing payload!");
  }

  const updatedUserStatus = await userService.statusModify({
    _id,
    fieldName,
    status,
  });

  res.status(200).json({ success: true, data: { details: updatedUserStatus } });
};

// Fetch User Balance
const fetchUserBalance = async (req, res) => {
  const { user, body } = await userRequest.fetchUserBalanceRequest(req);

  const fetchBalance = await userService.fetchBalance({ user, ...body });

  res.status(200).json({ success: true, data: fetchBalance });
};

const createUserClone = async (req, res) => {
  const { user, body } = await userRequest.cloneUserRequest(req);

  const clonedUser = await userService.cloneUser({ user, ...body });

  res.status(200).json({ success: true, data: { details: clonedUser } });
};

const getUserTransactionCode = async (req, res) => {
  const { _id = null } = req.body;

  if (!_id) {
    throw new ErrorResponse("_id is required!").status(200);
  }

  const user = await User.findById(_id, { transactionCode: 1 });
  const transactionCode = decryptTransactionCode(user.transactionCode);

  res.status(200).json({ success: true, data: { details: transactionCode } });
};

const getHydratedUser = async (req, res) => {
  const { _id = null } = req.body;
  const { user } = req;

  const userId = _id || user._id;
  const refreshedUser = await userService.fetchHydratedUser(userId);

  res.status(200).json({ success: true, data: { details: refreshedUser } });
};

const getUserActivity = async (req, res) => {
  const { user, body } = await userRequest.userActivityRequest(req);

  const users = await userActivityService.fetchAllUserActivity({ user, ...body });

  return res.status(200).json({ success: true, data: users });
};

const getUserActivityTypes = async (req, res) => {
  var userActivityTypes = await userActivityService.fetUserActivityTypes();
  return res.status(200).json({ success: true, data: userActivityTypes });
};

const changePassword = async (req, res) => {
  const { user, body } = await userRequest.changePasswordRequest(req);

  const users = await userService.changePassword({ user, ...body });

  return res.status(200).json({ success: true, data: users });
};

const getSuperAdminMasters = async (req, res) => {

  const { _id = null } = req.body;

  if (!_id) {
    throw new ErrorResponse("_id is required!").status(200);
  }

  const users = await userService.fetchSuperAdminMasters(_id);

  return res.status(200).json({ success: true, data: users });
};

export default {
  getAllUser,
  getUserById,
  getUserDetails,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  fetchUserBalance,
  createUserClone,
  getUserTransactionCode,
  getHydratedUser,
  getUserActivity,
  getUserActivityTypes,
  changePassword,
  getSuperAdminMasters
};
