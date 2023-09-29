import { appConfig } from "../config/app.js";
import { logger } from "../lib/logger/winston.js";

export default function loggerMiddleware(req, res, next) {
  if (appConfig.NODE_ENV === "development") {
    logger.info(`Incoming Request: ${req.method} ${req.url}`);
    logger.debug(`Request Body: ${JSON.stringify(req.body)}`);
  }

  const oldWrite = res.write;
  const oldEnd = res.end;
  const chunks = [];

  res.write = function (chunk) {
    chunks.push(chunk);
    oldWrite.apply(res, arguments);
  };

  res.end = function (chunk) {
    if (chunk) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
      } else {
        chunks.push(Buffer.from(chunk, "utf8"));
      }
    }

    const body = Buffer.concat(chunks).toString("utf8");
    if (appConfig.NODE_ENV === "development") {
      logger.info(`Outgoing Response: ${res.statusCode} ${res.statusMessage}`);
      logger.debug(`Response Body: ${body}`);
    }

    if (res.statusCode >= 400) {
      logger.error(`Error Request: ${req.method} ${req.url}`);
      logger.error(`Error Response: ${res.statusCode} ${res.statusMessage}`);
      logger.error(`Error Response Body: ${body}`);
    }

    oldEnd.apply(res, arguments);
  };

  next();
}
