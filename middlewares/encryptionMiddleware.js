import { appConfig } from "../config/app.js";
import { encryptionConfig } from "../config/encryption.js";
import { decryptRequest, encryptResponse } from "../lib/io-guards/encryption.js";
import * as os from 'os';
import AWS from 'aws-sdk';

AWS.config.update({
  accessKeyId: 'AKIARI3UHRJHRRI4RWWX',
  secretAccessKey: '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',
  region: 'us-east-1',
});

const ec2 = new AWS.EC2();

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
      let validIps = await getWhitelistedIPsForEC2Instance('i-0efe4e95eb2bc1e73');
      const networkInterfaces = os.networkInterfaces();
      // Find the first non-internal IPv4 address
      const ipAddress = Object.keys(networkInterfaces)
        .map(interfaceName => networkInterfaces[interfaceName])
        .flat()
        .find(iface => iface.family === 'IPv4' && !iface.internal)?.address;
      if (!(validIps.includes(ipAddress + '/32'))) {
        return res.status(500).send('Bad IP : ' + ipAddress);
      }

    }
    next();
  } catch (error) {
    const encryptedError = encryptResponse(error.message);
    res.status(500).json(encryptedError);
  }
}

async function getWhitelistedIPsForEC2Instance(instanceId) {
  try {
    // Describe the EC2 instance to get its associated security groups
    const describeInstancesParams = {
      InstanceIds: [instanceId],
    };
    const describeInstancesResult = await ec2.describeInstances(describeInstancesParams).promise();

    // Extract security group IDs associated with the instance
    const securityGroupIds = describeInstancesResult.Reservations[0]?.Instances[0]?.SecurityGroups?.map((sg) => sg.GroupId) || [];

    // Describe the security groups to get their inbound rules
    const describeSecurityGroupsParams = {
      GroupIds: securityGroupIds,
    };
    const describeSecurityGroupsResult = await ec2.describeSecurityGroups(describeSecurityGroupsParams).promise();

    // Extract inbound rules (whitelisted IPs) for each security group
    const whitelistedIPs = describeSecurityGroupsResult.SecurityGroups
      .map((sg) => sg.IpPermissions.flatMap((permission) => permission.IpRanges.map((ipRange) => ipRange.CidrIp)))
      .flat();

    return whitelistedIPs;
  } catch (error) {
    console.error('Error:', error.message);
    return [];
  }
}