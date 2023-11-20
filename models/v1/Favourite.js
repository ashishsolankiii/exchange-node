import mongoose from "mongoose";
import timestampPlugin from "../plugins/timestamp.js";

const favouriteSchema = new mongoose.Schema({

  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },

  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "event",
    required: true
  },

});

favouriteSchema.plugin(timestampPlugin);

const favourite = mongoose.model("favourite", favouriteSchema);

export default favourite;
