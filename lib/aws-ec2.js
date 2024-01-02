import { EC2, DescribeSecurityGroupsCommand } from '@aws-sdk/client-ec2';
import { appConfig } from "../config/app.js";

// Configure AWS credentials and region
const awsConfig = appConfig.AWS_EC2_CONFIG;

// Create an EC2 client with the configured options
const ec2Client = new EC2(awsConfig);

export async function isIpWhitelisted(ipAddress) {
  try {
    const response = await ec2Client.send(new DescribeSecurityGroupsCommand({}));
    const allSecurityGroups = response.SecurityGroups;

    for (const securityGroup of allSecurityGroups) {
      const ipPermissions = securityGroup.IpPermissions;
      for (const permission of ipPermissions) {
        const ipRanges = permission.IpRanges;
        for (const ipRange of ipRanges) {
          if (ipRange.CidrIp === `${ipAddress}/32`) {
            return true; // IP address is whitelisted in this security group
          }
        }
      }
    }

    // If the loop completes without returning false, the IP address is not found in any security group
    return false;
  } catch (error) {
    console.error('Error checking IP in security groups:', error);
    throw error;
  }
}