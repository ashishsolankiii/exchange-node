import mongoose from "mongoose";
import { appConfig } from "../../config/app.js";
import { IMAGE_SIZES, getImageUrlFromS3 } from "../../lib/files/image-upload.js";
import softDeletePlugin from "../plugins/soft-delete.js";
import timestampPlugin from "../plugins/timestamp.js";

export const CASINO_IMAGE_TYPES = {
  CASINO_IMAGE: "CASINO_IMAGE",
};

export const CASINO_IMAGE_SIZES = {
  [CASINO_IMAGE_TYPES.CASINO_IMAGE]: {
    ...IMAGE_SIZES,
    // avg aspect ratio = 4.27:1
    DEFAULT: "400_220",
    THUMBNAIL: "200_50",
  },
};

const casinoSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  isVisible: {
    type: Boolean,
    default: true,
  },
});

casinoSchema.plugin(timestampPlugin);
casinoSchema.plugin(softDeletePlugin);

// Generates Image path of image for storing/getting to/from s3
casinoSchema.methods.generateImagePath = function (type, size = IMAGE_SIZES.ORIGINAL, name = "") {
  let path = `casino/${this._id.toString()}`;

  if (appConfig.NODE_ENV === "development") {
    path = `dev/${appConfig.DEV_USER}/${path}`;
  } else if (appConfig.NODE_ENV === "staging") {
    path = `staging/${path}`;
  }

  switch (type) {
    case CASINO_IMAGE_TYPES.CASINO_IMAGE:
      return `${path}/${this._id.toString()}_${name}_${size}`;

    default:
      throw new Error("Unknown url path.");
  }
};

// Generates Image url for image stored in s3
casinoSchema.methods.getImageUrl = async function (type, size = IMAGE_SIZES.ORIGINAL, name = "") {
  switch (type) {
    case CASINO_IMAGE_TYPES.CASINO_IMAGE:
      return await getImageUrlFromS3({
        path: this.generateImagePath(type, size, name),
        minutesToExpire: 10,
      });

    default:
      throw new Error("Unknown image type.");
  }
};

const Casino = mongoose.model("casino", casinoSchema);

export default Casino;
