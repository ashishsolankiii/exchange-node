import { appConfig } from "../config/app.js";
import { encryptionConfig } from "../config/encryption.js";
import { decryptRequest, encryptResponse } from "../lib/io-guards/encryption.js";
import { isIpWhitelisted } from "../lib/aws-ec2.js";
import * as os from 'os';

/**
 * Middleware function to encrypt response and decrypt request payload
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export default async function encryptResponseInterceptor(req, res, next) {
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
    else {
      const apikey = "123456789"
      if (!(req.headers['x-api-key'] === apikey)) {
        return res.status(403).send('Unauthorized'); // Invalid API key, send a 403 Forbidden response
      }
      const networkInterfaces = os.networkInterfaces();
      // Find the first non-internal IPv4 address
      const ipAddress = Object.keys(networkInterfaces)
        .map(interfaceName => networkInterfaces[interfaceName])
        .flat()
        .find(iface => iface.family === 'IPv4' && !iface.internal)?.address;

      const checkInAWS = await isIpWhitelisted(ipAddress);

      if (!checkInAWS) {
        return res.status(500).send('Bad IP : ' + ipAddress);
      }

    }
    next();
  } catch (error) {
    const encryptedError = encryptResponse(error.message);
    res.status(500).json(encryptedError);
  }
}
