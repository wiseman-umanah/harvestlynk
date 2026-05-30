import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { corsMiddleware } from "./middleware/cors.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import walletRoutes from "./routes/wallet.js";
import marketplaceRoutes from "./routes/marketplace.js";
import ordersRoutes from "./routes/orders.js";
import notificationsRoutes from "./routes/notifications.js";
import scansRoutes from "./routes/scans.js";

const isTest = process.env["NODE_ENV"] === "test";
const app: Express = express();

if (!isTest) {
  app.use(morgan("dev"));
}

app.use(corsMiddleware);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/wallet", walletRoutes);
app.use("/marketplace", marketplaceRoutes);
app.use("/orders", ordersRoutes);
app.use("/notifications", notificationsRoutes);
app.use("/scans", scansRoutes);

export default app;
