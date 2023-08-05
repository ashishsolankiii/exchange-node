import express from "express";
import userController from "../../../controllers/v1/userController.js";
import { route } from "../../../lib/error-handling/routes-error-boundary.js";

const router = express.Router();

route(router, "post", "/getAllUsers", userController.getAllUser);
route(router, "post", "/getUserById", userController.getUserById);
route(router, "post", "/createUser", userController.createUser);
route(router, "post", "/updateUser", userController.updateUser);
route(router, "post", "/deleteUser", userController.deleteUser);
route(router, "post", "/rehydrateUser", userController.getHydratedUser);

route(router, "post", "/updateUserStatus", userController.updateUserStatus);
route(router, "post", "/fetchUserBalance", userController.fetchUserBalance);
route(router, "post", "/createUserClone", userController.createUserClone);

route(router, "post", "/getUserTransactionCode", userController.getUserTransactionCode);
route(router, "post", "/getUserPermissions", userController.getUserPermissions);
route(router, "post", "/getAppModulesList", userController.getAppModulesList);

export default router;
