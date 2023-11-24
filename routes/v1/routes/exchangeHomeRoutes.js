import express from "express";
import exchangeHomeController from "../../../controllers/v1/exchangeHomeController.js";
import { route } from "../../../lib/error-handling/routes-error-boundary.js";

const router = express.Router();

route(router, "get", "/sportsList", exchangeHomeController.getSportsList, false);
route(router, "post", "/sportWiseMatchList", exchangeHomeController.getSportWiseTodayEvent, false);
route(router, "post", "/getTransferType", exchangeHomeController.getTransferType);

export default router;