import mongoose from "mongoose";
import softDeletePlugin from "../plugins/soft-delete.js";
import timestampPlugin from "../plugins/timestamp.js";

const currencySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  countryName: { type: String, required: true, unique: true },
  multiplier: { type: Number, default: 1, required: true },
});

currencySchema.plugin(timestampPlugin);
currencySchema.plugin(softDeletePlugin);

const Currency = mongoose.model("currency", currencySchema);

export default Currency;
