import { Request, Response } from "express";
import { AuditLog } from "../models/AuditLog";
import { asyncHandler } from "../utils/asyncHandler";
import { ok, paginate, escapeRegex } from "../utils/http";
import { USER_REF_FIELDS } from "../utils/serialize";
import { toActivityDTO } from "../services/serializers";

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, action, targetType } = req.query as any;
  const filter: Record<string, unknown> = {};
  if (action) filter.action = new RegExp(`^${escapeRegex(action)}`);
  if (targetType) filter.targetType = targetType;

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .populate("actor", USER_REF_FIELDS)
      .populate("project", "title")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);
  ok(res, items.map(toActivityDTO), { pagination: paginate(page, limit, total) });
});
