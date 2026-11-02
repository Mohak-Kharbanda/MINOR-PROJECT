import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

/** Strict limit for credential endpoints (login, register, password reset). */
export const authLimiter = rateLimit({
  windowMs: env.authRateLimit.windowMin * 60 * 1000,
  limit: env.authRateLimit.max,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please wait a few minutes and try again." },
  skip: () => env.isTest,
});

/** Looser limit for token refreshes (the SPA refreshes on load and on expiry). */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
  skip: () => env.isTest,
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1500,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
  skip: () => env.isTest,
});
