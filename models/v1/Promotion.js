import mongoose from "mongoose";
import softDeletePlugin from "../plugins/soft-delete.js";
import timestampPlugin from "../plugins/timestamp.js";

const promotionSchema = new mongoose.Schema({

  title: { type: String, required: true },

  description: { type: String, default: "" },

  rules: { type: String, default: "" },

  termsConditions: { type: String, default: "" },

  isActive: { type: Boolean, default: true },

});

promotionSchema.plugin(timestampPlugin);
promotionSchema.plugin(softDeletePlugin);

const Promotion = mongoose.model("promotion", promotionSchema);

export default Promotion;
