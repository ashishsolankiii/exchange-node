import mongoose from "mongoose";
import softDeletePlugin from "../plugins/soft-delete.js";
import timestampPlugin from "../plugins/timestamp.js";

export const RUNNER_STATUS = { ACTIVE: "Active", IN_ACTIVE: "In Active" };

const marketRunnerSchema = new mongoose.Schema({
  // Reference to the market this market belongs to
  marketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "market",
    required: [true, "Market Id is Required!"],
    index: true,
  },

  // Market ID, represented as a number (null by default)
  // Indexing recommended if queried frequently
  apiMarketId: { type: String, default: null, index: true },

  selectionId: { type: Number, index: true },

  runnerName: { type: String, default: null },

  handicap: { type: String, default: true },

  priority: { type: Number, default: 0 },

  status: { type: String, default: RUNNER_STATUS.ACTIVE },

  minStake: { type: Number, default: 0 },

  maxStake: { type: Number, default: 0 },

  betDelay: { type: Number, default: 1 },

  winScore: { type: Number, default: null },

  metaData: {
    type: Object,
    default: null,
  },
});

marketRunnerSchema.plugin(timestampPlugin);
marketRunnerSchema.plugin(softDeletePlugin);

const MarketRunner = mongoose.model("market_runner", marketRunnerSchema);

export default MarketRunner;
