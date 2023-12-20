import mongoose from "mongoose";
import softDeletePlugin from "../plugins/soft-delete.js";
import { IMAGE_SIZES, getImageUrlFromS3 } from "../../lib/files/image-upload.js";
import timestampPlugin from "../plugins/timestamp.js";
import { appConfig } from "../../config/app.js";

export const CASINO_GAME_IMAGE_TYPES = {
  CASINO_GAME_IMAGE: "CASINO_GAME_IMAGE",
};

export const CASINO_GAME_IMAGE_SIZES = {
  [CASINO_GAME_IMAGE_TYPES.CASINO_GAME_IMAGE]: {
    ...IMAGE_SIZES,
    // avg aspect ratio = 4.27:1
    DEFAULT: "400_220",
    THUMBNAIL: "200_50",
  },
}

const casinoGameSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  isVisible: {
    type: Boolean,
    default: true,
  },
  apiDistributorId: { type: mongoose.Schema.Types.ObjectId, ref: "api_provider", required: [true, "Api Distribution is Required"] },
  casinoId: { type: mongoose.Schema.Types.ObjectId, ref: "casino", required: [true, "Casino is Required"] },
  providerId: {
    type: String,
    default: null
  },
  providerImageUrl: {
    type: String,
    default: null
  },
  isFavourite: {
    type: Boolean,
    default: false,
  },
  orderIndex: { type: Number, default: null },
  metaData: {
    type: Object,
    default: null,
  },
});

casinoGameSchema.plugin(timestampPlugin);
casinoGameSchema.plugin(softDeletePlugin);

// Generates Image path of image for storing/getting to/from s3
casinoGameSchema.methods.generateImagePath = function (type, size = IMAGE_SIZES.ORIGINAL, name = "") {
  let path = `casinoGame/${this._id.toString()}`;

  if (appConfig.NODE_ENV === "development") {
    path = `dev/${appConfig.DEV_USER}/${path}`;
  }

  switch (type) {
    case CASINO_GAME_IMAGE_TYPES.CASINO_GAME_IMAGE:
      return `${path}/${this._id.toString()}_${name}_${size}`;

    default:
      throw new Error("Unknown url path.");
  }
};

// Generates Image url for image stored in s3
casinoGameSchema.methods.getImageUrl = async function (type, size = IMAGE_SIZES.ORIGINAL, name = "") {
  switch (type) {
    case CASINO_GAME_IMAGE_TYPES.CASINO_GAME_IMAGE:
      return await getImageUrlFromS3({
        path: this.generateImagePath(type, size, name),
        minutesToExpire: 10,
      });

    default:
      throw new Error("Unknown image type.");
  }
};

const CasinoGame = mongoose.model("casino_game", casinoGameSchema);

export default CasinoGame;
