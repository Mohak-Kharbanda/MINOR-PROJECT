import jwt, { SignOptions } from "jsonwebtoken";
import type { Role } from "@edutrack/shared";
import { env } from "../config/env";

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  tv: number; // token version — bumped to revoke every outstanding token
}

export interface RefreshTokenPayload {
  sub: string;
  tv: number;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign({ ...payload, typ: "access" }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  } as SignOptions);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign({ ...payload, typ: "refresh" }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload & { typ?: string };
  if (decoded.typ !== "access") throw new Error("Wrong token type");
  return decoded;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, env.jwt.refreshSecret) as RefreshTokenPayload & { typ?: string };
  if (decoded.typ !== "refresh") throw new Error("Wrong token type");
  return decoded;
}

/** Short-lived token that authorizes downloading one locally stored file. */
export interface FileTokenPayload {
  key: string;
  disposition: "inline" | "attachment";
  filename: string;
  mime: string;
}

export function signFileToken(payload: FileTokenPayload, ttlSeconds: number): string {
  return jwt.sign({ ...payload, typ: "file" }, env.jwt.accessSecret, { expiresIn: ttlSeconds });
}

export function verifyFileToken(token: string): FileTokenPayload {
  const decoded = jwt.verify(token, env.jwt.accessSecret) as FileTokenPayload & { typ?: string };
  if (decoded.typ !== "file") throw new Error("Wrong token type");
  return decoded;
}
