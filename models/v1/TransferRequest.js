import mongoose from "mongoose";
import softDeletePlugin from "../plugins/soft-delete.js";
import timestampPlugin from "../plugins/timestamp.js";

export const STATUS = {
  PENDING: "pending",
  APPROVE: "approve",
  REJECT: "reject",
};

const transferRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },

  parentUserId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },

  transferTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "transfer_type", required: true },

  withdrawGroupId: { type: mongoose.Schema.Types.ObjectId, ref: "withdraw_group" },

  amount: { type: Number, required: true },

  status: { type: String, enum: Object.values(STATUS), default: "pending" },

  message: { type: String },
});

transferRequestSchema.plugin(timestampPlugin);
transferRequestSchema.plugin(softDeletePlugin);

const TransferRequest = mongoose.model("transfer_request", transferRequestSchema);

export default TransferRequest;
