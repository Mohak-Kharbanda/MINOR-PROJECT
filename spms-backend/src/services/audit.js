import { AuditLog } from "../models/AuditLog.js";

/**
 * Records an audit/activity entry. The same collection powers the admin audit
 * trail and the per-project "recent activity" feeds. Logging failures never
 * break the request that triggered them.
 */
export async function audit(req, entry, actorOverride) {
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
