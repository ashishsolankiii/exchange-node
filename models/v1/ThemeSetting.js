import mongoose from "mongoose";
import { appConfig } from "../../config/app.js";
import { IMAGE_SIZES, getImageUrlFromS3 } from "../../lib/files/image-upload.js";
import timestampPlugin from "../plugins/timestamp.js";

export const THEME_IMAGE_TYPES = {
  BANNER: "BANNER",
  WELCOME_MOBILE: "WELCOME_MOBILE",
  WELCOME_DESKTOP: "WELCOME_DESKTOP",
  LOGO: "LOGO",
};

export const THEME_IMAGE_SIZES = {
  [THEME_IMAGE_TYPES.BANNER]: {
    ...IMAGE_SIZES,
    // avg aspect ratio = 4.27:1
    DEFAULT: "400_94",
    THUMBNAIL: "200_47",
  },
  [THEME_IMAGE_TYPES.WELCOME_MOBILE]: {
    ...IMAGE_SIZES,
    // avg aspect ratio = 3:2
    DEFAULT: "400_267",
    THUMBNAIL: "200_133",
  },
  [THEME_IMAGE_TYPES.WELCOME_DESKTOP]: {
    ...IMAGE_SIZES,
    // avg aspect ratio = 3:2
    DEFAULT: "400_267",
    THUMBNAIL: "200_133",
  },
  [THEME_IMAGE_TYPES.LOGO]: {
    ...IMAGE_SIZES,
    // avg aspect ratio = 3:2
    DEFAULT: "400_267",
    THUMBNAIL: "200_133",
  },
};

const themeSettingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },

  facebookLink: { type: String, default: null },

  twitterLink: { type: String, default: null },

  instagramLink: { type: String, default: null },

  telegramLink: { type: String, default: null },

  youtubeLink: { type: String, default: null },

  whatsappLink: { type: String, default: null },

  blogLink: { type: String, default: null },

  footerMessage: { type: String, default: null },

  news: { type: String, default: null },

  supportNumber: { type: String, default: null },

  forgotPasswordLink: { type: String, default: null },

  depositePopupNumber: { type: String, default: null },

  welcomeMessage: { type: String, default: null },

  bannerImages: [{ type: String, required: true }],
});

themeSettingSchema.plugin(timestampPlugin);

// Generates Image path of image for storing/getting to/from s3
themeSettingSchema.methods.generateImagePath = function (type, size = IMAGE_SIZES.ORIGINAL, name = "") {
  let path = `theme_setting/${this._id.toString()}`;

  if (appConfig.NODE_ENV === "development") {
    path = `dev/${appConfig.DEV_USER}/${path}`;
  }

  switch (type) {
    case THEME_IMAGE_TYPES.BANNER:
      return `${path}/banner/${this._id.toString()}_${name}_${size}`;

    case THEME_IMAGE_TYPES.WELCOME_DESKTOP:
      return `${path}/welcome_desktop/${this._id.toString()}_${size}`;

    case THEME_IMAGE_TYPES.WELCOME_MOBILE:
      return `${path}/welcome_mobile/${this._id.toString()}_${size}`;

    case THEME_IMAGE_TYPES.LOGO:
      return `${path}/logo/${this._id.toString()}_${size}`;

    default:
      throw new Error("Unknown url path.");
  }
};

// Generates Image url for image stored in s3
themeSettingSchema.methods.getImageUrl = async function (type, size = IMAGE_SIZES.ORIGINAL, name = "") {
  switch (type) {
    case THEME_IMAGE_TYPES.BANNER:
      return await getImageUrlFromS3({
        path: this.generateImagePath(type, size, name),
        minutesToExpire: 10,
      });

    case THEME_IMAGE_TYPES.WELCOME_DESKTOP:
      return await getImageUrlFromS3({
        path: this.generateImagePath(type, size, name),
        minutesToExpire: 10,
      });

    case THEME_IMAGE_TYPES.WELCOME_MOBILE:
      return await getImageUrlFromS3({
        path: this.generateImagePath(type, size, name),
        minutesToExpire: 10,
      });

    case THEME_IMAGE_TYPES.LOGO:
      return await getImageUrlFromS3({
        path: this.generateImagePath(type, size, name),
        minutesToExpire: 10,
      });

    default:
      throw new Error("Unknown image type.");
  }
};

const ThemeSetting = mongoose.model("theme_setting", themeSettingSchema);

export default ThemeSetting;
