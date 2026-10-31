import crypto from "crypto";
import { env } from "../config/env";
import type { UserDoc } from "../models/User";

export const RESET_TOKEN_TTL_MINUTES = 60;

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a single-use reset token. Only its SHA-256 hash is stored, so a
 * database leak does not expose usable reset links. Caller must save the user.
 */
export function issueResetToken(user: UserDoc): { token: string; link: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
  user.passwordResetTokenHash = hashToken(token);
  user.passwordResetExpires = expiresAt;
  return { token, link: `${env.appUrl}/reset-password?token=${token}`, expiresAt };
}

export function generateTemporaryPassword(): string {
  // 12 url-safe chars plus a guaranteed digit/letter to satisfy the password policy.
  return `${crypto.randomBytes(9).toString("base64url")}a1`;
}
