import { rateLimit } from "express-rate-limit";

const isTest = process.env["NODE_ENV"] === "test";

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => isTest,
  message: { error: "Too many requests, please try again later." },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => isTest,
  message: { error: "Too many auth attempts, please try again later." },
});
