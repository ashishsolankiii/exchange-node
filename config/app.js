import dotenv from "dotenv";

dotenv.config();

const { env } = process;

/**
 * Application configuration object.
 *
 * Add all the .env variables to this object.
 * This will help with autocomplete suggestions.
 *
 * @type {object}
 *
 * @property {string} NODE_ENV - The application environment.
 * @property {number} PORT - The application port.
 * @property {string} DEV_USER - The development user.
 * @property {string} ADMIN_CLIENT_URL - The admin client URL.
 * @property {string} USER_CLIENT_URL - The user client URL.
 * @property {string} THEME_PANEL_CLIENT_URL - The theme panel client URL.
 * @property {string} TRANSACTION_PANEL_CLIENT_URL - The transaction panel client URL.
 * @property {array} CORS_ALLOWED_ORIGINS - The CORS allowed origins.
 * @property {number} SALT_ROUNDS - The salt rounds for password hashing.
 * @property {string} JWT_TOKEN_PREFIX - The JWT token prefix.
 * @property {string} JWT_SECRET - The JWT secret.
 * @property {string} JWT_EXPIRY - The JWT expiry.
 * @property {string} TRANSACTION_AES_SECRET - The transaction AES secret.
 * @property {string} PERMISSIONS_AES_SECRET - The permissions AES secret.
 * @property {string} RESPONSE_AES_SECRET - The response AES secret.
 * @property {string} RESPONSE_AES_BYPASS_KEY - The response AES bypass key.
 * @property {string} MONGO_URL - The MongoDB URL.
 * @property {string} BASE_URL - The base URL.
 * @property {string} AWS_S3_BUCKET - The AWS S3 bucket.
 * @property {object} AWS_S3_CONFIG - The AWS S3 config.
 * @property {boolean} LOG_ENABLED - The log enabled.
 * @property {string} LOG_PATH - The log path.
 * @property {number} LOG_MAX_FILE_SIZE - The log max file size.
 * @property {number} LOG_MAX_HISTORY - The log max history.
 * @property {string} LOG_DATE_FORMAT - The log date format.
 * @property {string} AURA_OPERATOR_ID - Operater ID for Aura.
 * @property {string} AURA_WHITELISTED_DOMAIN - Whitelisted domain for Aura.
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
  RESPONSE_AES_BYPASS_KEY: env.RESPONSE_AES_BYPASS_KEY,

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

  LOG_ENABLED: env.LOG_ENABLED,
  LOG_PATH: env.LOG_PATH,
  LOG_MAX_FILE_SIZE: env.LOG_MAX_FILE_SIZE,
  LOG_MAX_HISTORY: env.LOG_MAX_HISTORY,
  LOG_DATE_FORMAT: env.LOG_DATE_FORMAT,

  AURA_OPERATOR_ID: env.AURA_OPERATOR_ID,
  AURA_WHITELISTED_DOMAIN: env.AURA_WHITELISTED_DOMAIN,
};
