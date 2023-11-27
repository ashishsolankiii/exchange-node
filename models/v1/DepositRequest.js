import mongoose from "mongoose";
import softDeletePlugin from "../plugins/soft-delete.js";
import timestampPlugin from "../plugins/timestamp.js";
import { IMAGE_SIZES, getImageUrlFromS3 } from "../../lib/files/image-upload.js";
import { appConfig } from "../../config/app.js";

export const STATUS = {
  PENDING: "pending",
  APPROVE: "approve",
  REJECT: "reject",
};

export const DEPOSIT_SCREENSHOT_IMAGE_TYPES = {
  DEPOSIT_SCREENSHOT: "DEPOSIT_SCREENSHOT",
};

export const DEPOSIT_SCREENSHOT_IMAGE_SIZES = {
  [DEPOSIT_SCREENSHOT_IMAGE_TYPES.DEPOSIT_SCREENSHOT]: {
    ...IMAGE_SIZES,
    // avg aspect ratio = 4.27:1
    DEFAULT: "400_94",
    THUMBNAIL: "200_47",
  },
};

const depositRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },

  transferTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "transfer_type", required: true },

  amount: { type: Number, required: true },

  utrTransactionId: { type: String, required: true },

  status: { type: String, enum: Object.values(STATUS), default: "pending" },
});

depositRequestSchema.plugin(timestampPlugin);
depositRequestSchema.plugin(softDeletePlugin);

// Generates Image path of image for storing/getting to/from s3
depositRequestSchema.methods.generateImagePath = function (type, size = IMAGE_SIZES.ORIGINAL, name = "") {
  let path = `deposit_request/${this._id.toString()}`;

  if (appConfig.NODE_ENV === "development") {
    path = `dev/${appConfig.DEV_USER}/${path}`;
  } else if (appConfig.NODE_ENV === "staging") {
    path = `staging/${path}`;
  }

  switch (type) {
    case DEPOSIT_SCREENSHOT_IMAGE_TYPES.DEPOSIT_SCREENSHOT:
      return `${path}/deposit_screenshot/${this._id.toString()}_${name}_${size}`;

    default:
      throw new Error("Unknown url path.");
  }
};

// Generates Image url for image stored in s3
depositRequestSchema.methods.getImageUrl = async function (type, size = IMAGE_SIZES.ORIGINAL, name = "") {
  switch (type) {
    case DEPOSIT_SCREENSHOT_IMAGE_TYPES.DEPOSIT_SCREENSHOT:
      return await getImageUrlFromS3({
        path: this.generateImagePath(type, size, name),
        minutesToExpire: 10,
      });

    default:
      throw new Error("Unknown image type.");
  }
};

const depositRequest = mongoose.model("deposit_request", depositRequestSchema);

export default depositRequest;
