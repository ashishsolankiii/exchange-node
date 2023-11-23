import { appConfig } from "../config/app.js";
import { encryptionConfig } from "../config/encryption.js";
import { decryptRequest, encryptResponse } from "../lib/io-guards/encryption.js";

/**
 * Middleware function to encrypt response and decrypt request payload
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export default function encryptResponseInterceptor(req, res, next) {
  try {
    // Split path for external api
    const breakPath = req.path.split("/");
    const findExternal = breakPath.filter((item) => item == 'external');
    if (findExternal.length == 0) {
      const isBypassed = req.get(encryptionConfig.encBypassHeader) === "true";
      const isBypassKeyValid = req.get(encryptionConfig.encBypassKeyHeader) === appConfig.RESPONSE_AES_BYPASS_KEY;

      // Encrypt response
      const originalSend = res.json;
      res.json = function (data) {
        const responsePayload = isBypassed && isBypassKeyValid ? data : encryptResponse(data);
        originalSend.call(this, responsePayload);
      };

      // Decrypt request
      if (encryptionConfig.requestKey in req.body) {
        req.body = decryptRequest(req.body[encryptionConfig.requestKey]);
      }
    }
    next();
  } catch (error) {
    const encryptedError = encryptResponse(error.message);
    res.status(500).json(encryptedError);
  }
}
