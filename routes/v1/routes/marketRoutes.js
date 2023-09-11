import express from "express";
import marketController from "../../../controllers/v1/marketController.js";
import { route } from "../../../lib/error-handling/routes-error-boundary.js";

const router = express.Router();

route(router, "post", "/createMarket", marketController.createMarket);
route(router, "post", "/updateMarket", marketController.updateMarket);
route(router, "post", "/syncMarketByEvent", marketController.syncMarketByEvent);

export default router;
