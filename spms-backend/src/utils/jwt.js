import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signAccessToken(payload) {
  return jwt.sign({ ...payload, typ: "access" }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  });
}

export function signRefreshToken(payload) {
  return jwt.sign({ ...payload, typ: "refresh" }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });
}

export function verifyAccessToken(token) {
  const decoded = jwt.verify(token, env.jwt.accessSecret);
  if (decoded.typ !== "access") throw new Error("Wrong token type");
  return decoded;
}

export function verifyRefreshToken(token) {
  const decoded = jwt.verify(token, env.jwt.refreshSecret);
  if (decoded.typ !== "refresh") throw new Error("Wrong token type");
  return decoded;
}

/** Short-lived token that authorizes downloading one locally stored file. */

export function signFileToken(payload, ttlSeconds) {
  return jwt.sign({ ...payload, typ: "file" }, env.jwt.accessSecret, { expiresIn: ttlSeconds });
}

export function verifyFileToken(token) {
  const decoded = jwt.verify(token, env.jwt.accessSecret);
  if (decoded.typ !== "file") throw new Error("Wrong token type");
  return decoded;
}
