import express from "express";
import { rateLimit } from "express-rate-limit";

const app = express();

const minutesToCheck = 1;
const maxRequestsPerMinute = 100;

const limiter = rateLimit({
  windowMs: minutesToCheck * 60 * 1000,
  max: maxRequestsPerMinute,
  message: "You have exceeded the Request limit. Please try after some time.",
  standardHeaders: "draft-7",
  legacyHeaders: false,
  statusCode: 429,
});

app.use(limiter);

// If you are behind a reverse proxy
// Or using external load balancers
// Set the number of proxies between your server and the user
const numberOfProxies = 1;

app.set("trust proxy", numberOfProxies);

export default app;
