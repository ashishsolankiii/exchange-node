import express from "express";
import worldCasinoController from "../controllers/v1/worldCasinoController.js";
import encryptResponseInterceptor from "../middlewares/encryptionMiddleware.js";
import passportJwtMiddleware from "../middlewares/passportJwtMiddleware.js";
const router = express.Router();

router.post("/Balance", worldCasinoController.balance);
router.post("/Credit", worldCasinoController.credit);
router.post("/debit", worldCasinoController.debit);
router.post("/getLaunchUrl", [encryptResponseInterceptor, passportJwtMiddleware], worldCasinoController.getLaunchUrl);

export default router;
