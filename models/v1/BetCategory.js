import mongoose from "mongoose";
import softDeletePlugin from "../plugins/soft-delete.js";
import timestampPlugin from "../plugins/timestamp.js";

export const BET_CATEGORIES = {
  MATCH_ODDS: "Match Odds",
  BOOKMAKER: "Bookmaker",
  FANCY: "Fancy",
  FANCY1: "Fancy1"
};

export const DEFAULT_CATEGORIES = [BET_CATEGORIES.MATCH_ODDS, BET_CATEGORIES.BOOKMAKER, BET_CATEGORIES.FANCY, BET_CATEGORIES.FANCY1];

const betCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
});

betCategorySchema.plugin(timestampPlugin);
betCategorySchema.plugin(softDeletePlugin);

const BetCategory = mongoose.model("bet_category", betCategorySchema);

export default BetCategory;
