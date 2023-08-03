import express from "express";
import cronController from "../../../controllers/v1/cronController.js";
import { route } from "../../../lib/error-handling/routes-error-boundary.js";

const router = express.Router();

route(router, "post", "/syncData", cronController.syncDetail, false);
route(router, "post", "/marketSync", cronController.marketSync, false);
route(router, "post", "/getMatchOdds", cronController.getMatchOdds, false);

export default router;
