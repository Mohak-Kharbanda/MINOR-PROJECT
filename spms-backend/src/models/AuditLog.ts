import mongoose, { Schema, Types } from "mongoose";
import { ROLES, type Role } from "@edutrack/shared";

export interface IAuditLog {
  _id: Types.ObjectId;
  actor: Types.ObjectId | null;
  actorRole: Role | null;
  action: string;
  summary: string;
  targetType: string;
  targetId: Types.ObjectId | null;
  project: Types.ObjectId | null;
  meta: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
}

const auditSchema = new Schema<IAuditLog>(
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

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", auditSchema);
