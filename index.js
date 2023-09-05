import bodyParser from "body-parser";
import express from "express";
import fileUpload from "express-fileupload";
import { createServer } from "http";
import moment from "moment";
import { appConfig } from "./config/app.js";
import dbConnection from "./database/connect.js";
import corsMiddleware from "./middlewares/corsMiddleware.js";
import encryptResponseInterceptor from "./middlewares/encryptionMiddleware.js";
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
app.use(encryptResponseInterceptor);

app.use("/api", apiRoutes);

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

server.listen(appConfig.PORT, () => {
  console.log(`Server running on port: ${appConfig.PORT}`);
});
