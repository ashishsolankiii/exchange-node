import mongoose from "mongoose";
import softDeletePlugin from "../plugins/soft-delete.js";
import timestampPlugin from "../plugins/timestamp.js";

const withdrawGroupSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },

  parentUserId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },

  type: { type: String, required: true },

  remark: { type: String },

  commission: { type: Number, default: 0 },

  minAmount: { type: Number, default: 0 },

  maxAmount: { type: Number, default: 0 },

  isActive: { type: Boolean, default: true },
});

withdrawGroupSchema.plugin(timestampPlugin);
withdrawGroupSchema.plugin(softDeletePlugin);

const WithdrawGroup = mongoose.model("withdraw_group", withdrawGroupSchema);

export default WithdrawGroup;
