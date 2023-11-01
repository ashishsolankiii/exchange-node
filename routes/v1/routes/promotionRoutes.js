import express from "express";
import promotionController from "../../../controllers/v1/promotionController.js";
import { route } from "../../../lib/error-handling/routes-error-boundary.js";

const router = express.Router();

route(router, "post", "/getAllPromotion", promotionController.getAllPromotion);
route(router, "post", "/getPromotionById", promotionController.getPromotionById);
route(router, "post", "/createPromotion", promotionController.createPromotion);
route(router, "post", "/updatePromotion", promotionController.updatePromotion);
route(router, "post", "/deletePromotion", promotionController.deletePromotion);
route(router, "post", "/updatePromotionStatus", promotionController.updatePromotionStatus);
route(router, "post", "/allPromotion", promotionController.allPromotion, false);

export default router;
