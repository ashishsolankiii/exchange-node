import mongoose from "mongoose";
import softDeletePlugin from "../plugins/soft-delete.js";
import timestampPlugin from "../plugins/timestamp.js";

const marketSchema = new mongoose.Schema({
  name: { type: String, required: true },

  // Type of the market, allowed values are "matchOdds", "bookMaker", and "fancy"
  typeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "bet_category",
    required: [true, "Bet Category Id is Required!"],
    index: true,
  },

  // Status of the market, represented as a number (0 by default)
  marketStatus: { type: Number, default: 0 },

  // Market ID, represented as a number (null by default)
  marketId: { type: String, default: null, index: true },

  // Reference to the event this market belongs to
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "event",
    required: [true, "Event Id is Required!"],
    index: true,
  },

  // API-based Event ID (null by default)
  apiEventId: { type: String, default: null, index: true },

  // Reference to the competition this market belongs to
  competitionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "competition",
    required: [true, "Competition Id is Required!"],
    index: true,
  },

  // API-based Competition ID (null by default)
  apiCompetitionId: { type: String, default: null, index: true },

  // Reference to the sport this market belongs to
  sportId: { type: mongoose.Schema.Types.ObjectId, ref: "sport", required: [true, "Sport is Required"], index: true },

  // API-based Sport ID (null by default)
  apiSportId: { type: String, default: null, index: true },

  // Indicates whether the market is manually managed (false by default)
  isManual: { type: Boolean, default: false },

  // Bet delay for the market (null by default)
  betDelay: { type: Number, default: 1 },

  // Indicates whether the market is visible to players (false by default)
  visibleToPlayer: { type: Boolean, default: false },

  // Position index of the market (0 by default)
  positionIndex: { type: Number, default: 0 },

  // Minimum stake allowed for the market (0 by default)
  minStake: { type: Number, default: 0 },

  // Maximum stake allowed for the market (0 by default)
  maxStake: { type: Number, default: 0 },

  // Maximum liability for a bet in this market (0 by default)
  maxBetLiability: { type: Number, default: 0 },

  // Maximum liability for the entire market (0 by default)
  maxMarketLiability: { type: Number, default: 0 },

  // Maximum possible profit for the entire market (0 by default)
  maxMarketProfit: { type: Number, default: 0 },

  startDate: Date,

  winnerRunnerId: { type: mongoose.Schema.Types.ObjectId, ref: "market_runner", index: true },
});

// Indexing for frequently queried fields
marketSchema.index({ name: 1 });
marketSchema.index({ type: 1 });
marketSchema.index({ marketStatus: 1 });
marketSchema.index({ eventId: 1 });
marketSchema.index({ apiEventId: 1 });
marketSchema.index({ competitionId: 1 });
marketSchema.index({ apiCompetitionId: 1 });
marketSchema.index({ sportId: 1 });
marketSchema.index({ apiSportId: 1 });
marketSchema.index({ typeId: 1 });

marketSchema.plugin(timestampPlugin);
marketSchema.plugin(softDeletePlugin);

const Market = mongoose.model("market", marketSchema);

export default Market;
