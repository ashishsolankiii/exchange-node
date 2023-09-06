import { decryptRequest, encryptResponse } from "../lib/helpers/io-encryption.js";

/**
 * Middleware for encrypting response data and decrypting request data.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 * @throws {Error} If there's an issue with encryption or decryption.
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
