import mongoose from "mongoose";
import softDeletePlugin from "../plugins/soft-delete.js";
import timestampPlugin from "../plugins/timestamp.js";

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

  ifsc: { type: String },

  platformName: { type: String, enum: [...Object.values(PLATFORM_NAME), null] },

  platformDisplayName: { type: String },

  platformAddress: { type: String },

  depositLink: { type: String },

  isActive: { type: Boolean, default: true },
});

transferTypeSchema.plugin(timestampPlugin);
transferTypeSchema.plugin(softDeletePlugin);

const TransferType = mongoose.model("deposit_type", transferTypeSchema);

export default TransferType;
