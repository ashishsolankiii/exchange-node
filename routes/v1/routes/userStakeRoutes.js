import express from "express";
import userStakeController from "../../../controllers/v1/userStakeController.js";
import { route } from "../../../lib/error-handling/routes-error-boundary.js";

const router = express.Router();

route(router, "post", "/getStakeById", userStakeController.getStakeById);
route(router, "post", "/createStake", userStakeController.createStake);
route(router, "post", "/updateStake", userStakeController.updateStake);
route(router, "post", "/getUserStakes", userStakeController.getUserStakes);

export default router;
