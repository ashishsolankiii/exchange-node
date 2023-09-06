import mongoose from "mongoose";
import softDeletePlugin from "../plugins/soft-delete.js";
import timestampPlugin from "../plugins/timestamp.js";

const eventSchema = new mongoose.Schema({
  // Name of the event
  name: { type: String, require: true },

  // Reference to the sport associated with this event
  sportId: { type: mongoose.Schema.Types.ObjectId, ref: "sport", required: [true, "Sport is Required!"] },

  // API identifier for the sport (if applicable)
  apiSportId: { type: String, default: null },

  // Reference to the competition associated with this event
  competitionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "competition",
    required: [true, "Competition is Required!"],
  },

  betDelay: { type: Number, default: 1 },

  // API identifier for the competition (if applicable)
  apiCompetitionId: { type: String, default: null },

  // API identifier for the specific match of the event (if applicable)
  apiEventId: { type: String, default: null },

  // Date of the match
  matchDate: { type: Date, default: null },

  // Time of the match
  matchTime: { type: String, default: null },

  // Number of markets available for this event (default is 0)
  marketCount: { type: Number, default: 0 },

  // Limit for the odds (default is 0, which could mean no limit)
  oddsLimit: { type: Number, default: 0 },

  // Limit for the total volume of bets (default is 0, which could mean no limit)
  volumeLimit: { type: Number, default: 0 },

  // Minimum stake allowed for bets (default is 0, which could mean no minimum)
  minStake: { type: Number, default: 0 },

  // Minimum stake allowed for session bets (default is 0, which could mean no minimum)
  minStakeSession: { type: Number, default: 0 },

  // Maximum stake allowed for bets (default is 0, which could mean no maximum)
  maxStake: { type: Number, default: 0 },

  // Maximum stake allowed for session bets (default is 0, which could mean no maximum)
  maxStakeSession: { type: Number, default: 0 },

  // Scoreboard data for the event (stored as a flexible, unstructured object)
  scoreboard: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Runner data for the event (stored as a flexible, unstructured object)
  runner: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Indicates if a bet associated with this event is deleted
  betDeleted: { type: Boolean, default: false },

  // Indicates if the event is completed
  completed: { type: Boolean, default: false },

  // Indicates if the event is active
  isActive: { type: Boolean, default: false },

  // Indicates if the event is manually created (as opposed to being imported from an external API)
  isManual: { type: Boolean, default: false },

  // Indicates if the event is settled or not
  isSettled: { type: Boolean, default: false },

  // Indicates the time of event settlement
  settledTime: { type: Date, default: null },

  // Indicates if the event is visible to players
  betLock: { type: Boolean, default: false },

  // Indicates if any favourite event
  isFavourite: { type: Boolean, default: false },

  // Check event is live
  isLive: { type: Boolean, default: false },
});

eventSchema.plugin(timestampPlugin);
eventSchema.plugin(softDeletePlugin);

const Competition = mongoose.model("event", eventSchema);

export default Competition;
