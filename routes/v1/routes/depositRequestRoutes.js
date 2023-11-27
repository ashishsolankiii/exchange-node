import express from "express";
import depositRequestController from "../../../controllers/v1/depositRequestController.js";
import { route } from "../../../lib/error-handling/routes-error-boundary.js";

const router = express.Router();

route(router, "post", "/getAllDepositRequest", depositRequestController.getAllDepositRequest);
route(router, "post", "/getDepositRequestById", depositRequestController.getDepositRequestById);
route(router, "post", "/createDepositRequest", depositRequestController.createDepositRequest);
route(router, "post", "/updateDepositRequest", depositRequestController.updateDepositRequest);
route(router, "post", "/deleteDepositRequest", depositRequestController.deleteDepositRequest);
route(router, "post", "/updateDepositRequestStatus", depositRequestController.updateDepositRequestStatus);

export default router;
