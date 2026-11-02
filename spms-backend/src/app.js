import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import routes from "./routes/index.js";
import { env } from "./config/env.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1); // correct client IPs / secure cookies behind Render, Railway, Fly, etc.

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "default-src": ["'self'"],
          "script-src": ["'self'"],
          "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
          "img-src": ["'self'", "data:", "blob:", "https:"],
          "connect-src": ["'self'"],
          "frame-src": ["'self'", "https:"],
          "object-src": ["'none'"],
          "frame-ancestors": ["'none'"],
          // HSTS covers HTTPS deployments; this would break plain-HTTP setups (e.g. local Docker).
          "upgrade-insecure-requests": null,
        },
      },
      crossOriginResourcePolicy: { policy: "same-site" },
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin(origin, cb) {
        // Same-origin and non-browser requests have no Origin header.
        if (!origin || env.clientOrigins.includes(origin)) return cb(null, true);
        cb(null, false);
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      maxAge: 600,
    })
  );

  app.use(compression());
  app.use(express.json({ limit: "200kb" }));
  app.use(express.urlencoded({ extended: false, limit: "200kb" }));
  app.use(cookieParser());
  if (!env.isTest) app.use(morgan(env.isProduction ? "combined" : "dev"));

  app.use("/api", apiLimiter, routes);
  app.use("/api", notFoundHandler);

  // Single-service deployment: serve the built React app from the same
  // origin as the API (no CORS, first-party refresh cookie).
  const indexHtml = path.join(env.clientDistDir, "index.html");
  if (env.serveClient && fs.existsSync(indexHtml)) {
    app.use(
      express.static(env.clientDistDir, {
        index: false,
        maxAge: "1h",
        setHeaders: (res, file) => {
          if (/[\\/]assets[\\/]/.test(file)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        },
      })
    );
    app.get("*", (_req, res) => res.sendFile(indexHtml));
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
