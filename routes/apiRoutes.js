import express from "express";
import encryptResponseInterceptor from "../middlewares/encryptionMiddleware.js";
import auraRoutes from "./auraRoutes.js";
import apiRoutesV1 from "./v1/apiRoutesV1.js";
import worldCasinoRoutes from "./worldCasinoRotes.js";

const app = express();

// Application v1 routes
app.use("/v1", encryptResponseInterceptor, apiRoutesV1);

// Aura Casino callback routes
app.use("/poker", auraRoutes);

// World Casino callback routes
app.use("/worldCasino", worldCasinoRoutes);

export default app;
