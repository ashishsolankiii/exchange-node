import mongoose from "mongoose";
import softDeletePlugin from "../plugins/soft-delete.js";
import timestampPlugin from "../plugins/timestamp.js";

export const PROVIDER_TYPE = {
  SPORT: "sport",
  CASINO: "casino",
  EGAME: "e_game"
};

const apiProvidersSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },

  isActive: { type: Boolean, default: true, index: true },

  type: {
    type: String, enum: Object.values(PROVIDER_TYPE), required: true
  },

  metaData: {
    type: Object,
    default: null,
  },
});

apiProvidersSchema.plugin(timestampPlugin);
apiProvidersSchema.plugin(softDeletePlugin);

const ApiProvider = mongoose.model("api_provider", apiProvidersSchema);

export default ApiProvider;
