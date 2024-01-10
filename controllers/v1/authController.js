import { USER_ACTIVITY_EVENT } from "../../models/v1/UserActivity.js";
import authRequest from "../../requests/v1/authRequest.js";
import authService from "../../services/v1/authService.js";
import userActivityService from "../../services/v1/userActivityService.js";

/**
 * Logs in a user.
 *
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @returns {object} The response with success status and user data.
 */
const login = async (req, res) => {
  const { user, body } = await authRequest.userLoginRequest(req);

  const userWithToken = await authService.loginUser({ user, ...body });

  await userActivityService.createUserActivity({
    userId: userWithToken.user._id,
    event: USER_ACTIVITY_EVENT.LOGIN,
    ipAddress: body.ipAddress,
    description: body.description,
    city: body.city,
    country: body.country,
    platform: body.platform,
  });

  // Set the token in a cookie
  res.cookie("jwt", userWithToken.token, { httpOnly: true });

  return res.status(200).json({ success: true, data: userWithToken });
};

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

  // Set the token in a cookie
  res.cookie("jwt", userWithToken.token, { httpOnly: true });

  return res.status(200).json({ success: true, data: userWithToken });
};

/**
 * Registers a new user.
 *
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @returns {object} The response with success status and registered user data.
 */
const register = async (req, res) => {
  const { body } = await authRequest.userRegisterRequest(req);

  const registeredUser = await authService.registerUser(body);

  await userActivityService.createUserActivity({
    userId: registeredUser._id,
    event: USER_ACTIVITY_EVENT.REGISTERED,
    ipAddress: body.ipAddress,
    description: body.description,
  });

  return res.status(200).json({ success: true, data: registeredUser });
};

/**
 * Resets the user's password.
 *
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @returns {Promise<Object>} A Promise that resolves to the JSON response
 * containing the success status and reset password user data.
 */
const resetPassword = async (req, res) => {
  const { user, body } = await authRequest.userResetPasswordRequest(req);

  const resetPasswordUser = await authService.resetPassword({ ...body });

  await userActivityService.createUserActivity({
    userId: resetPasswordUser._id,
    event: USER_ACTIVITY_EVENT.PASSWORD_RESET,
    ipAddress: body.ipAddress,
    description: user._id,
    city: body.city,
    country: body.country,
    platform: body.platform,
  });

  return res.status(200).json({ success: true, data: resetPasswordUser });
};

const logout = async (req, res) => {
  const { user } = req;

  const deletedLoggedInUser = await authService.logout(user._id);

  res.status(200).json({ success: true, data: { details: deletedLoggedInUser } });
};

export default {
  login,
  userlogin,
  register,
  resetPassword,
  logout,
};
