import { parseJwtToken } from "../lib/io-guards/auth.js";
import { appConfig } from "../config/app.js";
import { auraConfig } from "../config/aura.js";

// Authenticates the token sent by the user.
export const authenticateToken = async (req, res, next) => {
  const token = req.body.token;

  if (!token) {
    return res.status(401).json({
      ErrorCode: auraConfig.errorCode,
      message: "Token not found!" || auraConfig.errorMessage,
    });
  }

  const parseResult = await parseJwtToken(token);

  if (!parseResult.isValid) {
    return res.status(200).json({
      ErrorCode: auraConfig.errorCode,
      message: parseResult.message || auraConfig.errorMessage,
    });
  }

  if (!(parseResult.tokenData && parseResult.tokenData._id)) {
    return res.status(401).json({
      ErrorCode: auraConfig.errorCode,
      message: "User not found or is inactive!",
    });
  }

  req.user = parseResult.tokenData;

  next();
};

// Authenticates the operator sent by the user.
export const authenticateOperator = async (req, res, next) => {
  const operatorId = req.body.operatorId;

  if (!operatorId) {
    return res.status(401).json({
      ErrorCode: auraConfig.errorCode,
      message: "Operator not found!",
    });
  }

  if (operatorId !== appConfig.AURA_OPERATOR_ID) {
    return res.status(401).json({
      ErrorCode: auraConfig.errorCode,
      message: "Invalid operator!",
    });
  }

  next();
};