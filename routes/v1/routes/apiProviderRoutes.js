import express from "express";
import apiProviderController from "../../../controllers/v1/apiProviderController.js";
import { route } from "../../../lib/error-handling/routes-error-boundary.js";

const router = express.Router();

route(router, "post", "/getAllApiProvider", apiProviderController.getAllApiProvider);
route(router, "post", "/getApiProviderById", apiProviderController.getApiProviderById);
route(router, "post", "/createApiProvider", apiProviderController.createApiProvider);
route(router, "post", "/updateApiProvider", apiProviderController.updateApiProvider);
route(router, "post", "/deleteApiProvider", apiProviderController.deleteApiProvider);
route(router, "post", "/updateApiProviderStatus", apiProviderController.updateApiProviderStatus);

export default router;
