import { decryptResponse, encryptResponse, validateJwtToken } from "../lib/helpers/auth.js";

/**
 * Middleware that performs authentication using a crypto.
 *
 * @async
 * @function encrptionMiddleware
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @param {Function} next - The next middleware function.
 * @returns {void}
 */
export default async function encryptResponseInterceptor(req, res, next) {

  //  Encrypt response
  const originalSend = res.send;
  res.send = async function () {
    console.log(arguments);
    arguments[0] = await encryptResponse(arguments[0]);
    originalSend.apply(res, arguments);
  };

  //  Decrypt response
  if (req.body && req.body.message) {
    req.body = JSON.parse(await decryptResponse(req.body.message));
  }
  next();
}
