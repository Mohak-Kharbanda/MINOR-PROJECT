import { Request } from "express";
import { Types } from "mongoose";
import { AuditLog } from "../models/AuditLog";

export interface AuditEntry {
  action: string;
  summary: string;
  targetType: string;
  targetId?: Types.ObjectId | string | null;
  project?: Types.ObjectId | string | null;
  meta?: Record<string, unknown>;
}

/**
 * Records an audit/activity entry. The same collection powers the admin audit
 * trail and the per-project "recent activity" feeds. Logging failures never
 * break the request that triggered them.
 */
export async function audit(req: Request | null, entry: AuditEntry, actorOverride?: { id: string; role: any }) {
  const actor = actorOverride ?? req?.user ?? null;
  try {
    await AuditLog.create({
      actor: actor?.id ?? null,
      actorRole: actor?.role ?? null,
      action: entry.action,
      summary: entry.summary,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      project: entry.project ?? null,
      meta: entry.meta ?? {},
      ip: req?.ip,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV !== "test") console.warn("[audit] failed to record entry", err);
  }
}
