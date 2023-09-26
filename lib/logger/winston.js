import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { appConfig } from "../../config/app.js";
import { LOG_FORMAT, LOG_TRANSPORT, logConfig } from "../../config/log.js";

const logFormat = () => {
  const { combine, timestamp, printf, json } = format;
  const configFormat = appConfig?.LOG_FORMAT || logConfig.format;
  const currentFormat = () => {
    return configFormat === LOG_FORMAT.JSON
      ? json()
      : printf(({ timestamp, level, message }) => {
          return `[${timestamp}] ${level}: ${message}`;
        });
  };
  return combine(timestamp(), currentFormat());
};

const logTransports = {
  [LOG_TRANSPORT.CONSOLE]: new transports.Console(),

  [LOG_TRANSPORT.FILE]: new DailyRotateFile({
    filename: `${logConfig.path}/%DATE%-debug.log`,
    datePattern: logConfig.dateFormat,
    zippedArchive: true,
    maxSize: logConfig.maxFileSize,
    maxFiles: logConfig.maxRetention,
  }),
};

const options = {
  level: logConfig.level,
  format: logFormat(),
  transports: logConfig.transports
    .map((transport) => {
      return logTransports[transport];
    })
    .filter((transport) => !!transport),
};

export const logger = createLogger(options);
