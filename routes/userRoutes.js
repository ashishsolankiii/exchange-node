import express from "express";
import userController from "../controllers/userController.js";
import { route } from "../lib/error-handling/routes-error-boundary.js";

const router = express.Router();

route(router, "post", "/getAllUsers", userController.getAllUser);
route(router, "post", "/getUserById", userController.getUserById);
route(router, "post", "/createUser", userController.createUser);
route(router, "post", "/updateUser", userController.updateUser);
route(router, "post", "/deleteUser", userController.deleteUser);
route(router, "post", "/updateUserStatus", userController.updateUserStatus);
route(router, "post", "/fetchUserBalance", userController.fetchUserBalance);

export default router;
