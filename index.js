import bodyParser from "body-parser";
import express from "express";
import fileUpload from "express-fileupload";
import { createServer } from "http";
import moment from "moment";
import cron from "node-cron";
import { appConfig } from "./config/app.js";
import cronController from "./controllers/v1/cronController.js";
import dbConnection from "./database/connect.js";
import { settleHandshake } from "./lib/io-guards/encryption.js";
import corsMiddleware from "./middlewares/corsMiddleware.js";
import encryptResponseInterceptor from "./middlewares/encryptionMiddleware.js";
import loggerMiddleware from "./middlewares/loggerMiddleware.js";
import apiRoutes from "./routes/apiRoutes.js";
import { initSocket } from "./socket/index.js";

const app = express();
const server = createServer(app);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  fileUpload({
    safeFileNames: true,
    preserveExtension: true,
    parseNested: true,
  })
);

app.use(corsMiddleware);
app.use(loggerMiddleware);

app.use("/handshake", settleHandshake);

app.use("/api", encryptResponseInterceptor, apiRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Hello from CA Exchange API!",
    metadata: {
      utc_time: moment().utc().format("DD-MM-YYYY HH:mm:ss z"),
      server_time: moment().format("DD-MM-YYYY HH:mm:ss"),
    },
  });
});

dbConnection();

initSocket(server);

// Cron Job for sync market
cron.schedule("0 2 * * *", async function () {
  // For market sync data
  await cronController.syncDetail();
  await cronController.getActiveEvent();
});

// Cron Job for live event
cron.schedule("* * * * *", async function () {
  // For market sync data
  await cronController.getLiveEvent();
});

server.listen(appConfig.PORT, () => {
  console.log(`Server running on port: ${appConfig.PORT}`);
});
