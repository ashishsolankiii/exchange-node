import express from "express";
import worldCasinoController from "../controllers/v1/worldCasinoController.js";
const router = express.Router();
import { route } from "../lib/error-handling/routes-error-boundary.js";

router.post("/Balance", worldCasinoController.balance);
router.post("/Credit", worldCasinoController.credit);
router.post("/debit", worldCasinoController.debit);
route(router, "post", "/getLaunchUrl", worldCasinoController.getLaunchUrl);

export default router;
