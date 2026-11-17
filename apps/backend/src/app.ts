import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { env } from "./config/env";
import { interviews } from "./routes/interviews";
import { logger } from "./lib/logger";
import { MAX_REQUEST_BODY_BYTES } from "./config/env";

export const app = express();
// Trust only loopback proxies (the local Nginx in production) for req.ip/protocol.
app.set("trust proxy", "loopback");
app.use(cors({ origin: env.FRONTEND_ORIGIN }));
app.use(express.json({ limit: MAX_REQUEST_BODY_BYTES }));
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});
app.use("/api", interviews);
app.use(((error, req, res, _next) => {
  logger.error("api", req.path, error);
  res.status(502).json({ error: "The request could not be completed" });
}) satisfies ErrorRequestHandler);
