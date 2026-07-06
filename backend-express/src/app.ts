import express, { type Express, type ErrorRequestHandler } from "express";
import morgan from "morgan";
import { serve as swaggerServe, setup as swaggerSetup } from "swagger-ui-express";
import { corsMiddleware } from "./middleware/cors.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
import { swaggerApiKeyGuard } from "./middleware/swaggerAuth.js";
import v1 from "./routes/v1/index.js";
import openapiSpec from "./docs/openapi.js";

const isTest = process.env["NODE_ENV"] === "test";
const app: Express = express();
const nombaWebhookPath = "/api/v1/payments/nomba-webhook";

if (!isTest) {
  app.use(morgan("dev"));
}

app.use(corsMiddleware);

// Body parsing — the webhook path must receive the raw Buffer so our HMAC
// verification works. All other routes get JSON. The raw parser is registered
// FIRST (no path guard) with a custom `type` function so it ONLY activates for
// the webhook; the JSON parser then runs for everything else.
app.use(express.raw({
  // express.raw's type callback receives a raw IncomingMessage — use req.url.
  // req.url at the app level is the full path e.g. "/api/v1/payments/nomba-webhook".
  type: (_req) => (_req.url === nombaWebhookPath || _req.url?.split("?")[0] === nombaWebhookPath),
  limit: "1mb",
}));
app.use((req, res, next) => {
  if (Buffer.isBuffer(req.body)) {
    // Already parsed as raw Buffer (webhook path) — skip JSON parsing.
    next();
    return;
  }
  express.json()(req, res, next);
});
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/docs", swaggerApiKeyGuard, ...swaggerServe, swaggerSetup(openapiSpec));

app.use("/api/v1", v1);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error("[error]", err?.message ?? err);
  if (err?.cause) console.error("[cause]", err.cause);
  if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
};

app.use(errorHandler);

export default app;
