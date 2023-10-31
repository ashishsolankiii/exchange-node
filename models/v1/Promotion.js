import mongoose from "mongoose";
import softDeletePlugin from "../plugins/soft-delete.js";
import timestampPlugin from "../plugins/timestamp.js";

export const PROMOTION_TYPE = {
  SPORT: "sport",
  CASINO: "casino"
};

const promotionSchema = new mongoose.Schema({

  title: { type: String, required: true },

  description: { type: String, default: "" },

  rules: { type: String, default: "" },

  termsConditions: { type: String, default: "" },

  isActive: { type: Boolean, default: true },

  promotionType: {
    type: String, enum: Object.values(PROMOTION_TYPE), required: true
  }
});

promotionSchema.plugin(timestampPlugin);
promotionSchema.plugin(softDeletePlugin);

const Promotion = mongoose.model("promotion", promotionSchema);

export default Promotion;
