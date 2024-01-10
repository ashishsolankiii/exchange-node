import express from "express";
import worldCasinoController from "../controllers/v1/worldCasinoController.js";
const router = express.Router();

router.post("/balance", worldCasinoController.balance);
router.post("/credit", worldCasinoController.credit);
router.post("/debit", worldCasinoController.debit);

export default router;
