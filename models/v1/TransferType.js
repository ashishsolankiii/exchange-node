import mongoose from "mongoose";
import softDeletePlugin from "../plugins/soft-delete.js";
import timestampPlugin from "../plugins/timestamp.js";
import { IMAGE_SIZES, getImageUrlFromS3 } from "../../lib/files/image-upload.js";
import { appConfig } from "../../config/app.js";

export const DEPOSIT_TYPE = {
  CASH: "cash",
  BANK: "bank",
  PLATFORM: "platform",
  LINK: "link",
};

export const ACCOUNT_TYPE = {
  SAVINGS: "savings",
  CURRENT: "current",
};

export const PLATFORM_NAME = {
  UPI: "upi",
  PAYTM: "paytm",
  GPAY: "gpay",
  PHONEPE: "phonepe",
};

export const QR_IMAGE_TYPES = {
  QR_IMAGE: "QR_IMAGE",
};

export const QR_IMAGE_SIZES = {
  [QR_IMAGE_TYPES.QR_IMAGE]: {
    ...IMAGE_SIZES,
    // avg aspect ratio = 4.27:1
    DEFAULT: "500_500",
    THUMBNAIL: "200_133",
  },
};

export const TRANSFER_TYPE = {
  DEPOSIT: "deposit",
  WITHDRAWAL: "withdrawal"
};


const transferTypeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },

  parentUserId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },

  type: { type: String, enum: Object.values(DEPOSIT_TYPE), required: true },

  name: { type: String, required: true },

  minAmount: { type: Number, default: 0, required: true },

  maxAmount: { type: Number, default: 0, required: true },

  description: { type: String },

  mobileNumber: { type: String },

  accountHolderName: { type: String },

  bankName: { type: String },

  accountNumber: { type: String },

  accountType: { type: String, enum: [...Object.values(ACCOUNT_TYPE), null] },

  transferType: { type: String, enum: [...Object.values(TRANSFER_TYPE), null] },

  ifsc: { type: String },

  platformName: { type: String, enum: [...Object.values(PLATFORM_NAME), null] },

  platformDisplayName: { type: String },

  platformAddress: { type: String },

  depositLink: { type: String },

  isActive: { type: Boolean, default: true },
});

transferTypeSchema.plugin(timestampPlugin);
transferTypeSchema.plugin(softDeletePlugin);


// Generates Image path of image for storing/getting to/from s3
transferTypeSchema.methods.generateImagePath = function (type, size = IMAGE_SIZES.ORIGINAL, name = "") {
  let path = `transfer_type/${this._id.toString()}`;

  if (appConfig.NODE_ENV === "development") {
    path = `dev/${appConfig.DEV_USER}/${path}`;
  } else if (appConfig.NODE_ENV === "staging") {
    path = `staging/${path}`;
  }

  switch (type) {
    case QR_IMAGE_TYPES.QR_IMAGE:
      return `${path}/QR_IMAGE/${this._id.toString()}_${name}_${size}`;

    default:
      throw new Error("Unknown url path.");
  }
};

// Generates Image url for image stored in s3
transferTypeSchema.methods.getImageUrl = async function (type, size = IMAGE_SIZES.ORIGINAL, name = "") {
  switch (type) {
    case QR_IMAGE_TYPES.QR_IMAGE:
      return await getImageUrlFromS3({
        path: this.generateImagePath(type, size, name),
        minutesToExpire: 10,
      });

    default:
      throw new Error("Unknown image type.");
  }
};

const TransferType = mongoose.model("transfer_type", transferTypeSchema);

export default TransferType;
