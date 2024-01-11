import express from "express";
import worldCasinoController from "../controllers/v1/worldCasinoController.js";
const router = express.Router();

router.post("/Balance", worldCasinoController.balance);
router.post("/Credit", worldCasinoController.credit);
router.post("/debit", worldCasinoController.debit);

export default router;
