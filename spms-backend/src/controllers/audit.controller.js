import { AuditLog } from "../models/AuditLog.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, paginate, escapeRegex } from "../utils/http.js";
import { USER_REF_FIELDS } from "../utils/serialize.js";
import { toActivityDTO } from "../services/serializers.js";

export const listAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, action, targetType } = req.query;
  const filter = {};
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
