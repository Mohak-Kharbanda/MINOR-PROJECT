import { Request, Response } from "express";
import mongoose from "mongoose";
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE_MB, type PublicConfig } from "@edutrack/shared";
import { env } from "../config/env";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/http";

export const health = (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  res.status(dbState === 1 ? 200 : 503).json({
    success: dbState === 1,
    message: dbState === 1 ? "EduTrack API is running." : "Database is not connected.",
    data: { uptime: Math.round(process.uptime()), db: dbState === 1 ? "connected" : "disconnected" },
  });
};

/** Public, non-sensitive configuration the web app needs before sign-in. */
export const publicConfig = asyncHandler(async (_req: Request, res: Response) => {
  const config: PublicConfig = {
    appName: "EduTrack",
    allowStudentSignup: env.allowStudentSignup,
    emailConfigured: env.mail.configured,
    storageDriver: env.storage.driver,
    maxFileSizeMb: MAX_FILE_SIZE_MB,
    allowedExtensions: ALLOWED_EXTENSIONS,
    teamMaxMembers: env.teamMaxMembers,
    demoMode: env.demoMode,
  };
  ok(res, config);
});
