import express from "express";
import scriptController from "../../../controllers/v1/scriptController.js";
import { route } from "../../../lib/error-handling/routes-error-boundary.js";
import cronController from "../../../controllers/v1/cronController.js";

const router = express.Router();

route(router, "post", "/getMatchOdds", scriptController.getMatchOdds, false);
route(router, "post", "/getFencyPrice", scriptController.getFencyPrice, false);
route(router, "post", "/getBookmakerPrice", scriptController.getBookmakerPrice, false);
route(router, "post", "/getLiveScore", scriptController.getLiveScore, false);
route(router, "post", "/importExcel", scriptController.importExcelSheet, false);
route(router, "get", "/updateBetType", scriptController.updateBetType, false);

export default router;