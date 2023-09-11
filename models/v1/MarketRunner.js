import mongoose from "mongoose";
import softDeletePlugin from "../plugins/soft-delete.js";
import timestampPlugin from "../plugins/timestamp.js";

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

  selectionId: { type: Number },

  runnerName: { type: String, default: null },

  handicap: { type: Boolean, default: true },

  priority: { type: Number, default: 0 },

  status: { type: String, default: null },
});

marketRunnerSchema.plugin(timestampPlugin);
marketRunnerSchema.plugin(softDeletePlugin);

const MarketRunner = mongoose.model("market_runner", marketRunnerSchema);

export default MarketRunner;
