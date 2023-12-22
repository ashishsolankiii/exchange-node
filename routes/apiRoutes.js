import express from "express";
import auraRoutes from "./auraRoutes.js";
import apiRoutesV1 from "./v1/apiRoutesV1.js";

const app = express();

app.use("/v1", apiRoutesV1);
app.use("/poker", auraRoutes);

export default app;
