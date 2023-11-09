import express from "express";
import { route } from "../../../lib/error-handling/routes-error-boundary.js";
import oauthController from "../../../controllers/v1/externalApiController.js";
import userController from "../../../controllers/v1/userController.js";

const router = express.Router();

route(router, "post", "/userLogin", oauthController.userlogin, false);
route(router, "post", "/createUser", oauthController.createUser);
route(router, "post", "/fetchUserBalance", oauthController.fetchUserBalance);
route(router, "post", "/createTransaction", oauthController.createTransaction);
route(router, "post", "/changePassword", oauthController.changePassword);

export default router;
