import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { appConfig } from "../../config/app.js";
import { s3Config } from "../../config/s3.js";

/**
 * A class for interacting with an S3 bucket.
 */
export class S3FileManager {
  /**
   * Creates a new instance of the `S3FileManager` class.
   */
  constructor() {
    /**
     * The S3 client instance.
     * @type {S3Client}
     */
    this.client = new S3Client(appConfig.AWS_S3_CONFIG);
  }

  /**
   * Uploads a file to the S3 bucket.
   * @param {Buffer} data - The file data to upload.
   * @param {string} fileName - The name of the file to upload.
   * @param {string} contentType - The content type of the file to upload.
   * @returns {Promise<PutObjectCommandOutput>} - A promise that resolves with the response from the S3 API.
   * @throws {Error} - Throws an error if the upload fails.
   */
  async uploadFile(data, filePath, contentType) {
    try {
      if (!(data && filePath && contentType)) {
        throw new Error("Missing required parameters.");
      }

      if (!Buffer.isBuffer(data)) {
        throw new Error("Invalid file data.");
      }

      const command = new PutObjectCommand({
        Bucket: appConfig.AWS_S3_BUCKET,
        Body: data,
        Key: filePath,
        ContentType: contentType,
      });

      const response = await this.client.send(command);

      return response;
    } catch (e) {
      throw new Error(e.message);
    }
  }

  /**
   * Gets a file from the S3 bucket.
   * @param {string} filePath - The path of the file to get.
   * @returns {Promise<Buffer>} - A promise that resolves with the file data as a buffer.
   * @throws {Error} - Throws an error if the file retrieval fails.
   */
  async getFile(filePath = "") {
    try {
      if (!filePath) {
        throw new Error("Missing required parameter.");
      }

      const command = new GetObjectCommand({
        Bucket: appConfig.AWS_S3_BUCKET,
        Key: filePath,
      });

      const response = await this.client.send(command);

      const byteArray = await response.Body.transformToByteArray();

      return byteArray;
    } catch (e) {
      throw new Error(e.message);
    }
  }

  /**
   * Returns a signed URL for the specified file path in AWS S3 bucket.
   * @async
   * @param {string} filePath - The file path in AWS S3 bucket.
   * @param {number} [minutesToExpire=s3Config.images.minutesToExpire] - The number of minutes until the signed URL expires.
   * @returns {Promise<string>} - A Promise that resolves with the signed URL.
   * @throws {Error} - If the required parameter is missing or if there's an error generating the signed URL.
   */
  async getFileSignedUrl(filePath, minutesToExpire = s3Config.images.minutesToExpire) {
    try {
      if (!filePath) {
        throw new Error("Missing required parameter.");
      }

      const command = new GetObjectCommand({
        Bucket: appConfig.AWS_S3_BUCKET,
        Key: filePath,
      });

      const signedUrl = await getSignedUrl(this.client, command, {
        expiresIn: minutesToExpire * 60,
      });

      return signedUrl;
    } catch (e) {
      throw new Error(e.message);
    }
  }

  /**
   * Deletes a file from the S3 bucket.
   * @param {string} filePath - The path of the file to delete.
   * @returns {Promise<DeleteObjectCommandOutput>} - A promise that resolves with the response from the S3 API.
   * @throws {Error} - Throws an error if the file deletion fails.
   */
  async deleteFile(filePath) {
    try {
      if (!filePath) {
        throw new Error("Missing required parameter.");
      }

      const command = new DeleteObjectCommand({
        Bucket: appConfig.AWS_S3_BUCKET,
        Key: filePath,
      });

      const response = await this.client.send(command);

      return response;
    } catch (e) {
      throw new Error(e.message);
    }
  }

  /**
   * Deletes multiple files from the S3 bucket.
   * @param {string[]} [filePaths=[]] - An array of file paths to delete.
   * @returns {Promise<string>} - A promise that resolves with a string containing the deleted file paths.
   * @throws {Error} - Throws an error if the file deletion fails.
   */
  async deleteMultipleFiles(filePaths = []) {
    try {
      if (!filePaths.length) {
        throw new Error("Missing required parameter.");
      }

      const command = new DeleteObjectsCommand({
        Bucket: appConfig.AWS_S3_BUCKET,
        Delete: {
          Objects: filePaths.map((filePath) => ({ Key: filePath })),
        },
      });

      const { Deleted } = await this.client.send(command);

      const deletedFiles = Deleted.map((d) => ` • ${d.Key}`).join(",");

      return deletedFiles;
    } catch (e) {
      throw new Error(e.message);
    }
  }
}
