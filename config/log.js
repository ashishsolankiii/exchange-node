import { appConfig } from "./app.js";

export const LOG_FORMAT = {
  JSON: "json",
  PRINT: "print",
  SIMPLE: "simple",
};

export const LOG_LEVEL = {
  DEBUG: "debug",
  ERROR: "error",
  INFO: "info",
  WARN: "warn",
};

export const LOG_TRANSPORT = {
  CONSOLE: "console",
  FILE: "file",
};

export const logConfig = {
  path: appConfig.LOG_PATH || "logs",

  format: appConfig.NODE_ENV === "production" ? LOG_FORMAT.SIMPLE : LOG_FORMAT.PRINT,

  level: appConfig.NODE_ENV === "production" ? LOG_LEVEL.WARN : LOG_LEVEL.DEBUG,

  transports: [
    // LOG_TRANSPORT.CONSOLE,
    LOG_TRANSPORT.FILE,
  ],

  maxFileSize: appConfig.LOG_MAX_FILE_SIZE || "20m",

  maxHistory: appConfig.LOG_MAX_HISTORY || "14d",

  dateFormat: "DD-MM-YYYY",
};
