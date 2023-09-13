import express from "express";
import sportsBetCategoryController from "../../../controllers/v1/sportsBetCategoryController.js";
import { route } from "../../../lib/error-handling/routes-error-boundary.js";

const router = express.Router();

route(router, "post", "/getAllSportsBetCategory", sportsBetCategoryController.getAllSportsBetCategory);
route(router, "post", "/getSportsBetCategoryById", sportsBetCategoryController.getSportsBetCategoryById);
route(router, "post", "/createSportsBetCategory", sportsBetCategoryController.createSportsBetCategory);
route(router, "post", "/updateSportsBetCategory", sportsBetCategoryController.updateSportsBetCategory);
route(router, "post", "/deleteSportsBetCategory", sportsBetCategoryController.deleteSportsBetCategory);

export default router;
