import { auraConfig } from "../../config/aura.js";
import User from "../../models/v1/User.js";

// Gets the user data.
const getUserData = async (req, res) => {
  const reqUserId = req.user._id;
  const operatorId = req.body.operatorId;
  const token = req.body.token;

  const user = await User.findById(reqUserId, {
    username: 1,
    balance: 1,
    exposure: 1,
  });

  const response = {
    operatorId: operatorId,
    userId: user._id,
    username: user.username,
    playerAuthTokenLaunch: token,
    token: token,
    balance: user.balance,
    exposure: user.exposure,
    currency: auraConfig.currency,
    language: auraConfig.language,
    timestamp: Date.now(),
    clientIP: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
    VIP: auraConfig.vip,
    errorCode: auraConfig.successCode,
    errorDescription: auraConfig.successMessage,
  };

  res.json(response);
};

export default {
  getUserData
};
