import { NextFunction, Request, Response } from "express";
import type { Role } from "@edutrack/shared";
import { ApiError } from "../utils/ApiError";
import { verifyAccessToken } from "../utils/jwt";
import { User } from "../models/User";

export interface AuthUser {
  id: string;
  role: Role;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) return header.slice(7).trim() || null;
  return null;
}

/**
 * Verifies the access token and loads the user. The role comes from the
 * database, not the token, so a role change or deactivation takes effect on
 * the very next request; tokenVersion lets us revoke all outstanding tokens.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearer(req);
  if (!token) return next(ApiError.unauthorized("Authentication required."));

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(ApiError.unauthorized("Your session has expired. Please sign in again."));
  }

  try {
    const user = await User.findById(payload.sub).select("name role isActive tokenVersion").lean();
    if (!user || !user.isActive) return next(ApiError.unauthorized("Account not found or deactivated."));
    if (user.tokenVersion !== payload.tv) {
      return next(ApiError.unauthorized("Your session has expired. Please sign in again."));
    }
    req.user = { id: user._id.toString(), role: user.role, name: user.name };
    next();
  } catch (err) {
    next(err);
  }
}

/** Restricts a route to one or more roles. Use after `authenticate`. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden("You do not have permission to perform this action."));
    }
    next();
  };
}
