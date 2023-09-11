import { decryptRequest, encryptResponse } from "../lib/helpers/io-encryption.js";

/**
 * Middleware function to encrypt response and decrypt request payload
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export default function encryptResponseInterceptor(req, res, next) {
  try {
    //  Encrypt response
    const originalSend = res.json;
    res.json = function (data) {
      const encrypted = encryptResponse(data);
      originalSend.call(this, encrypted);
    };

    //  Decrypt request
    if (req.body && req.body.payload) {
      req.body = decryptRequest(req.body.payload);
    }

    next();
  } catch (e) {
    const encrypted = encryptResponse(e.message);
    res.status(500).json(encrypted);
  }
}
