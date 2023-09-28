import mongoose from "mongoose";
import softDeletePlugin from "../plugins/soft-delete.js";
import timestampPlugin from "../plugins/timestamp.js";

const competitionSchema = new mongoose.Schema({
  // Name of the competition
  name: { type: String, required: true },

  // Reference to the sport associated with this competition
  sportId: { type: mongoose.Schema.Types.ObjectId, ref: "sport", required: [true, "Sport is Required"], index: true },

  // API identifier for the sport (if applicable)
  apiSportId: { type: String, default: null, index: true },

  // API identifier for the competition (if applicable)
  apiCompetitionId: { type: String, default: null, index: true },

  // Date when the competition was created
  createdOn: { type: Date },

  // Start date of the competition
  startDate: { type: Date, default: null, index: true },

  // End date of the competition
  endDate: { type: Date, default: null, index: true },

  // Indicates if the competition is currently active or not
  isActive: { type: Boolean, default: false, index: true },

  // Indicates if the competition is manually created (as opposed to being imported from an external API)
  isManual: { type: Boolean, default: false, index: true },

  // Number of markets available for this competition (default is 0)
  marketCount: { type: Number, default: 0 },

  // Region or location associated with this competition
  competitionRegion: { type: String },

  //Max Stake
  maxStake: { type: Number, default: null },

  //Max Market
  maxMarket: { type: Number, default: null },

  //Add delay in bet
  betDelay: { type: Number, default: null },

  // Indicates if the competition is visible to the player or not
  visibleToPlayer: { type: Boolean, default: true },

  // Indicates if the competition is customised or not
  isCustomised: { type: Boolean, default: false },

  // Indicates if the event is completed
  completed: { type: Boolean, default: false, index: true },
});

competitionSchema.plugin(timestampPlugin);
competitionSchema.plugin(softDeletePlugin);

competitionSchema.index({ name: 1 });
competitionSchema.index({ sportId: 1 });
competitionSchema.index({ startDate: 1 });
competitionSchema.index({ endDate: 1 });
competitionSchema.index({ isActive: 1 });

const Competition = mongoose.model("competition", competitionSchema);

export default Competition;
