import express from "express";
import casinoGameController from "../../../controllers/v1/casinoGameController.js";
import { route } from "../../../lib/error-handling/routes-error-boundary.js";

const router = express.Router();

route(router, "post", "/getAllCasinoGame", casinoGameController.getAllCasinoGame);
route(router, "post", "/getCasinoGameById", casinoGameController.getCasinoGameById);
route(router, "post", "/createCasinoGame", casinoGameController.createCasinoGame);
route(router, "post", "/updateCasinoGame", casinoGameController.updateCasinoGame);
route(router, "post", "/deleteCasinoGame", casinoGameController.deleteCasinoGame);
route(router, "post", "/updateCasinoGameStatus", casinoGameController.updateCasinoGameStatus);
route(router, "get", "/showFavouriteGame", casinoGameController.showFavouriteGame, false);
route(router, "post", "/showCasinoGame", casinoGameController.showCasinoGame, false);
route(router, "post", "/getCasinoGame", casinoGameController.getCasinoGame, false);

export default router;
