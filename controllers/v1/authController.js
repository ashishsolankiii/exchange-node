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
  // if (req.session.user === userWithToken.finaluser._id) {
  //   // If session exists, update the expiry time
  //   req.session.cookie.expires = new Date(Date.now() + req.session.cookie.maxAge);
  // } else {
  //   // If session doesn't exist, create a new one
  //   req.session.user = userWithToken.finaluser._id;
  // }
  const userId = userWithToken.finaluser._id;

  // Ensure that req.session.users is an object to store user sessions
  if (!req.session.users || typeof req.session.users !== 'object') {
    req.session.users = {};
  }

  // Check if a session for the user already exists
  if (req.session.users[userId]) {
    // If session exists, update the expiry time
    req.session.users[userId].expires = new Date(Date.now() + req.session.cookie.maxAge);

  } else {
    // If session doesn't exist, create a new one
    req.session.users[userId] = {
      sessionId: req.session.id,
      expires: new Date(Date.now() + req.session.cookie.maxAge)
    };

  }
  // const users = JSON.parse(req.cookies.users || '[]');

  // const findUserInCookie = users.filter(user => user.id == userWithToken.finaluser._id);

  // if (findUserInCookie.length == 0) {
  //   // Add the new user to the array with its own maxAge setting
  //   users.push({ id: userWithToken.finaluser._id, maxAge: 30 * 60 * 1000, timestamp: Date.now() }); // Expires in 30 minutes
  // }
  // else {
  //   findUserInCookie[0].timestamp = Date.now();
  // }
  // // Set the updated cookie with the new array
  // res.cookie('users', JSON.stringify(users), { maxAge: 30 * 60 * 1000 }); // Expires in 30 minutes


  await userActivityService.createUserActivity({
    userId: userWithToken.finaluser._id,
    event: USER_ACTIVITY_EVENT.LOGIN,
    ipAddress: body.ipAddress,
    description: body.description,
    city: body.city,
    country: body.country,
    platform: body.platform,
  });

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

export default {
  login,
  userlogin,
  register,
  resetPassword,
};
