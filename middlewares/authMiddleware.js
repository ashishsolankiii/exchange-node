import { validateJwtToken } from "../lib/io-guards/auth.js";

/**
 * Middleware that performs authentication using a JWT token.
 *
 * @async
 * @function authMiddleware
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @param {Function} next - The next middleware function.
 * @returns {void}
 */
export default async function authMiddleware(req, res, next) {
  const token = await validateJwtToken(req);

  if (!token.isValid) {
    return res.status(401).json({
      invalidAuth: true,
      message: token.message || "Not authenticated!",
    });
  }

  next();
}
