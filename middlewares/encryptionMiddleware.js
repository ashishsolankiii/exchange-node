import { decryptRequest, encryptResponse } from "../lib/helpers/io-encryption.js";

/**
 * Middleware function to encrypt response and decrypt request payload
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export default function encryptResponseInterceptor(req, res, next) {
  try {
    const isBypassed = req.get("X-Bypass-Res-Enc") === "true";
    const isBypassKeyValid = req.get("X-Res-Enc-Bypass-Key") === process.env.RESPONSE_AES_BYPASS_KEY;

    // Encrypt response
    const originalSend = res.json;
    res.json = function (data) {
      const responsePayload = isBypassed && isBypassKeyValid ? data : encryptResponse(data);
      originalSend.call(this, responsePayload);
    };

    // Decrypt request
    if (req.body?.payload) {
      req.body = decryptRequest(req.body.payload);
    }

    next();
  } catch (error) {
    const encryptedError = encryptResponse(error.message);
    res.status(500).json(encryptedError);
  }
}
