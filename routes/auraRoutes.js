import express from "express";
import auraCasinoController from "../controllers/v1/auraCasinoController.js";
import { authenticateOperator, authenticateToken } from "../middlewares/auraCasinoMiddleware.js"
const router = express.Router();

router.post("/auth", authenticateOperator, authenticateToken, auraCasinoController.getUserData);

export default router;
