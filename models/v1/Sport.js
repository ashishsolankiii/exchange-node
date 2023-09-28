import mongoose from "mongoose";
import softDeletePlugin from "../plugins/soft-delete.js";
import timestampPlugin from "../plugins/timestamp.js";

const sportSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },

  apiSportId: { type: String, default: null, index: true },

  isActive: { type: Boolean, default: true, index: true },

  marketCount: { type: Number, default: 0 },

  // Position index of the sport (0 by default)
  positionIndex: {
    type: Number,
    default: null,
  },
});

sportSchema.plugin(timestampPlugin);
sportSchema.plugin(softDeletePlugin);

const Sport = mongoose.model("sport", sportSchema);

export default Sport;
