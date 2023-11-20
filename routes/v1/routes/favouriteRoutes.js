import express from "express";
import favouriteController from "../../../controllers/v1/favouriteController.js";
import { route } from "../../../lib/error-handling/routes-error-boundary.js";

const router = express.Router();

route(router, "post", "/addRemoveFavourite", favouriteController.addRemoveFavourite);

export default router;
