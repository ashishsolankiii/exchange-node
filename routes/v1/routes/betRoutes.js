import express from "express";
import betController from "../../../controllers/v1/betController.js";
import { route } from "../../../lib/error-handling/routes-error-boundary.js";

const router = express.Router();

route(router, "post", "/createBet", betController.createBet);
route(router, "post", "/getAllBet", betController.getAllBet);
route(router, "post", "/getUserEventBets", betController.getUserEventBets);
route(router, "post", "/betComplete", betController.betComplete);
route(router, "post", "/betCompleteFancy", betController.betCompleteFancy);
route(router, "post", "/settlement", betController.settlement);
route(router, "post", "/getChildUserData", betController.getChildUserData);
route(router, "post", "/getRunnerPls", betController.getRunnerPls);
route(router, "post", "/getCurrentBetsUserwise", betController.getCurrentBetsUserwise);

export default router;
