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
  path: "logs",

  format: appConfig.NODE_ENV === "production" ? LOG_FORMAT.SIMPLE : LOG_FORMAT.PRINT,

  level: appConfig.NODE_ENV === "production" ? LOG_LEVEL.WARN : LOG_LEVEL.DEBUG,

  transports: [
    // LOG_TRANSPORT.CONSOLE,
    LOG_TRANSPORT.FILE,
  ],

  maxFileSize: "20m",

  maxRetention: "14d",

  dateFormat: "DD-MM-YYYY",
};
