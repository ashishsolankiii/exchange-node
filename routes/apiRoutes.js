import express from "express";
import auraRoutes from "./auraRoutes.js";
import apiRoutesV1 from "./v1/apiRoutesV1.js";

const app = express();

// Application v1 routes
app.use("/v1", apiRoutesV1);

// Aura Casino callback routes
app.use("/poker", auraRoutes);

export default app;
