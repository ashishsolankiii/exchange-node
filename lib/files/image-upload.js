import sharp from "sharp";
import { s3Config } from "../../config/s3.js";
import { S3FileManager } from "../aws-s3/s3-file-manager.js";

export const IMAGE_FORMATS = s3Config.images.supportedFormats;

export const IMAGE_MIMES = {
  [IMAGE_FORMATS.JPEG]: "image/jpeg",
  [IMAGE_FORMATS.PNG]: "image/png",
  [IMAGE_FORMATS.GIF]: "image/gif",
  [IMAGE_FORMATS.SVG]: "image/svg+xml",
};

export const IMAGE_SIZES = {
  ORIGINAL: "ORIGINAL",
  DEFAULT: "400_400",
  THUMBNAIL: "150_150",
};

const validateImageUploadRequest = ({ image, path, size, format }) => {
  if (!(image && image.data && image.mimetype)) {
    throw new Error("Invalid or corrupted file.");
  }

  if (!Object.values(IMAGE_MIMES).includes(image.mimetype)) {
    throw new Error("File format not supported.");
  }

  if (!Buffer.isBuffer(image.data)) {
    throw new Error("Invalid file data.");
  }

  if (!path) {
    throw new Error("Invalid file path.");
  }

  if (size !== IMAGE_SIZES.ORIGINAL && size.indexOf("_") === -1) {
    throw new Error("Invalid image size.");
  }

  if (!Object.values(IMAGE_FORMATS).includes(format)) {
    throw new Error("Invalid image format.");
  }
};

const processImageAndUploadToS3 = async ({ image, path, size, format }) => {
  if (size !== IMAGE_SIZES.ORIGINAL) {
    const [x, y] = size.split("_");

    const resizeOptions = {
      width: parseInt(x),
      height: parseInt(y),
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    };

    image.data = await sharp(image.data).resize(resizeOptions).toFormat(format).toBuffer();
    image.mimetype = IMAGE_MIMES[format];
  }

  const s3 = new S3FileManager();

  return await s3.uploadFile(image.data, path, image.mimetype);
};

export const uploadImageToS3 = async ({ image, path, size = IMAGE_SIZES.ORIGINAL, format = IMAGE_FORMATS.JPEG }) => {
  validateImageUploadRequest({ image, path, size, format });

  return await processImageAndUploadToS3({ image, path, size, format });
};

export const getImageFromS3 = async ({ path }) => {
  if (!path) {
    throw new Error("Invalid file path.");
  }

  const s3 = new S3FileManager();

  return await s3.getFile(path);
};

export const getImageUrlFromS3 = async ({ path, minutesToExpire = 10 }) => {
  if (!path) {
    throw new Error("Invalid file path.");
  }

  const s3 = new S3FileManager();

  return await s3.getFileSignedUrl(path, minutesToExpire);
};

export const deleteImageFromS3 = async ({ path }) => {
  if (!path) {
    throw new Error("Invalid file path.");
  }

  const s3 = new S3FileManager();

  return await s3.deleteFile(path);
};

export const deleteMultipleImagesFromS3 = async ({ paths }) => {
  if (!paths || !paths.length) {
    throw new Error("Invalid file paths.");
  }

  const s3 = new S3FileManager();

  return await s3.deleteMultipleFiles(paths);
};

export const replaceImageInS3 = async ({ image, oldPath, newPath, size = IMAGE_SIZES.ORIGINAL }) => {
  validateImageUploadRequest({ image, path: oldPath, size });

  if (!newPath) {
    throw new Error("Invalid file path.");
  }

  await deleteImageFromS3({ path: oldPath });

  return await processImageAndUploadToS3({ image, path: newPath, size });
};
