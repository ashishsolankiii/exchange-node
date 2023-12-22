import mongoose from "mongoose";
import softDeletePlugin from "../plugins/soft-delete.js";
import timestampPlugin from "../plugins/timestamp.js";

const loggedInUserSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null, index: true },
  token: { type: String, default: null },
  ipAddress: { type: String, default: null },
  platform: { type: String, default: null, index: true },
});

loggedInUserSchema.plugin(timestampPlugin);
loggedInUserSchema.plugin(softDeletePlugin);

const LoggedInUser = mongoose.model("logged_in_user", loggedInUserSchema);

export default LoggedInUser;
