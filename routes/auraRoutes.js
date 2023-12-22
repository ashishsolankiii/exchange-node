import express from "express";
import { appConfig } from "../config/app.js";
import { auraConfig } from "../config/aura.js";
import { parseJwtToken } from "../lib/io-guards/auth.js";
import User from "../models/v1/User.js";

const router = express.Router();

// Authenticates the token sent by the user.
const authenticateToken = async (req, res, next) => {
  const token = req.body.token;

  if (!token) {
    res.status(401).json({
      ErrorCode: auraConfig.errorCode,
      message: "Token not found!" || auraConfig.errorMessage,
    });
  }

  const parseResult = await parseJwtToken(token);

  if (!parseResult.isValid) {
    res.status(200).json({
      ErrorCode: auraConfig.errorCode,
      message: parseResult.message || auraConfig.errorMessage,
    });
  }

  if (!(parseResult.tokenData && parseResult.tokenData._id)) {
    res.status(401).json({
      ErrorCode: auraConfig.errorCode,
      message: "User not found or is inactive!",
    });
  }

  req.user = parseResult.tokenData;

  next();
};

// Authenticates the operator sent by the user.
const authenticateOperator = async (req, res, next) => {
  const operatorId = req.body.operatorId;

  if (!operatorId) {
    res.status(401).json({
      ErrorCode: auraConfig.errorCode,
      message: "Operator not found!",
    });
  }

  if (operatorId !== appConfig.AURA_OPERATOR_ID) {
    res.status(401).json({
      ErrorCode: auraConfig.errorCode,
      message: "Invalid operator!",
    });
  }

  next();
};

// Gets the user data.
const getUserDate = async (req, res) => {
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

const middlewares = [authenticateToken, authenticateOperator];

router.post("/auth", middlewares, getUserDate);

export default router;
