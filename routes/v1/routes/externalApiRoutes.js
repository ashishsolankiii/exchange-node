import express from "express";
import { route } from "../../../lib/error-handling/routes-error-boundary.js";
import externalApiController from "../../../controllers/v1/externalApiController.js";

const router = express.Router();

route(router, "post", "/userLogin", externalApiController.userlogin, false);
route(router, "post", "/createUser", externalApiController.createUser);
route(router, "post", "/fetchUserBalance", externalApiController.fetchUserBalance);
route(router, "post", "/createTransaction", externalApiController.createTransaction);
route(router, "post", "/changePassword", externalApiController.changePassword);
route(router, "post", "/getAllUser", externalApiController.getAllUser);

export default router;
