import mongoose, { Schema } from "mongoose";
import { ROLES } from "@edutrack/shared";

const auditSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actorRole: { type: String, enum: [...ROLES, null], default: null },
    action: { type: String, required: true },
    summary: { type: String, default: "" },
    targetType: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId, default: null },
    project: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    meta: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditSchema.index({ createdAt: -1 });
auditSchema.index({ project: 1, createdAt: -1 });
auditSchema.index({ action: 1, createdAt: -1 });
auditSchema.index({ actor: 1, createdAt: -1 });

export const AuditLog = mongoose.model("AuditLog", auditSchema);
