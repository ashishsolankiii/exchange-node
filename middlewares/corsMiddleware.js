import { appConfig } from "../config/app.js";

/**
 * Middleware that handles Cross-Origin Resource Sharing (CORS) for incoming requests.
 *
 * @function corsMiddleware
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @param {Function} next - The next middleware function.
 * @returns {void}
 */
export default function corsMiddleware(req, res, next) {
  if (!appConfig?.CORS_ALLOWED_ORIGINS?.length) {
    next();
  }

  const origin = req.get("origin");

  // Check if the origin is in whitelist
  if (appConfig.CORS_ALLOWED_ORIGINS.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);

    res.header("Access-Control-Allow-Methods", "GET, HEAD, PUT, PATCH, POST, DELETE");

    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Bypass-Res-Enc, X-Res-Enc-Bypass-Key"
    );

    // Check if it's a preflight request
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
  }

  next();
}
