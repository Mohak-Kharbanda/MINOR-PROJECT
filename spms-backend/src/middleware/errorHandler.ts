import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";
import { MAX_FILE_SIZE_MB } from "@edutrack/shared";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Centralized error handler: every error leaves the API as
// { success: false, message, details? } with a sensible status code and
// without leaking stack traces or internals in production.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? `File is too large. The limit is ${MAX_FILE_SIZE_MB} MB.`
        : err.code === "LIMIT_UNEXPECTED_FILE"
          ? "Unexpected file field. Upload a single file in the 'file' field."
          : err.message;
    return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ success: false, message });
  }

  const anyErr = err as any;
  if (anyErr?.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Malformed JSON body." });
  }
  if (anyErr?.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "Request body is too large." });
  }
  if (anyErr?.code === 11000) {
    return res.status(409).json({ success: false, message: "A record with these details already exists." });
  }
  if (anyErr?.name === "ValidationError") {
    const first = Object.values(anyErr.errors || {})[0] as any;
    return res.status(400).json({ success: false, message: first?.message || "Validation failed." });
  }
  if (anyErr?.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid identifier supplied." });
  }

  // eslint-disable-next-line no-console
  if (!env.isTest) console.error("[unhandled error]", err);
  return res.status(500).json({
    success: false,
    message: "Something went wrong on our end. Please try again.",
    ...(env.isProduction || env.isTest ? {} : { stack: err instanceof Error ? err.stack : String(err) }),
  });
}
