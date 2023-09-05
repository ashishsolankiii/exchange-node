import dotenv from "dotenv";

dotenv.config();

const { env } = process;

/**
 * Application configuration object.
 *
 * Add all the .env variables to this object.
 * This will help with autocomplete suggestions.
 */
export const appConfig = {
  NODE_ENV: env.NODE_ENV,
  PORT: env.PORT,

  DEV_USER: env.DEV_USER,

  ADMIN_CLIENT_URL: env.ADMIN_CLIENT_URL,
  USER_CLIENT_URL: env.USER_CLIENT_URL,
  THEME_PANEL_CLIENT_URL: env.THEME_PANEL_CLIENT_URL,
  TRANSACTION_PANEL_CLIENT_URL: env.TRANSACTION_PANEL_CLIENT_URL,

  CORS_ALLOWED_ORIGINS: [
    env.USER_CLIENT_URL,
    env.ADMIN_CLIENT_URL,
    env.THEME_PANEL_CLIENT_URL,
    env.TRANSACTION_PANEL_CLIENT_URL,
  ],

  SALT_ROUNDS: parseInt(env.SALT_ROUNDS, 10),
  JWT_TOKEN_PREFIX: env.JWT_TOKEN_PREFIX,
  JWT_SECRET: env.JWT_SECRET,
  JWT_EXPIRY: env.JWT_EXPIRY,

  TRANSACTION_AES_SECRET: env.TRANSACTION_AES_SECRET,
  PERMISSIONS_AES_SECRET: env.PERMISSIONS_AES_SECRET,
  RESPONSE_AES_SECRET: env.RESPONSE_AES_SECRET,

  MONGO_URL: env.MONGO_URL,
  BASE_URL: env.BASE_URL,

  AWS_S3_BUCKET: env.AWS_S3_BUCKET,
  AWS_S3_CONFIG: {
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_S3_ACCESS_KEY,
      secretAccessKey: env.AWS_S3_SECRET,
    },
  },
};
