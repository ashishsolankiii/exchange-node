import jwt from "jsonwebtoken";
import { appConfig } from "../config/app.js";

/**
 * Generates a JWT token with the provided payload.
 *
 * @param {object} payload - The payload object.
 *
 * @returns {string} The generated JWT token.
 */
const generateJwtToken = (payload) => {
  const token = jwt.sign(payload, appConfig.JWT_SECRET, {
    expiresIn: appConfig.JWT_EXPIRY,
  });

  const prefix = appConfig.JWT_TOKEN_PREFIX || "";

  return `${prefix} ${token}`;
};

/**
 * Parses a JWT token and returns the token data.
 *
 * @param {string} token - The JWT token.
 *
 * @returns {object} The parsed token data.
 */
const parseJwtToken = async (token) => {
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
 * Validates a JWT token from the request header and sets the user data in the request object.
 *
 * @param {Object} req - The request object.
 *
 * @returns {Promise<Object>} - A promise that resolves to the result of token validation.
 */
const validateJwtToken = async (req) => {
  const token = req.get("Authorization");
  const parserResult = await parseJwtToken(token);
  if (parserResult.isValid) {
    req.user = parserResult.tokenData;
  }
  return parserResult;
};

export { generateJwtToken, parseJwtToken, validateJwtToken };
