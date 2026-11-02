import mongoose, { Schema } from "mongoose";
import { FILE_KINDS, FILE_REVIEW_STATUSES, ROLES } from "@edutrack/shared";

/**
 * One uploaded version of a deliverable. Re-uploads of "the same" file share
 * a lineageKey and get an incrementing version number, so the full history
 * (who uploaded what, with which note/comments) is kept.
 */

const commentSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorRole: { type: String, enum: ROLES, required: true },
    message: { type: String, required: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const fileSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    lineageKey: { type: String, required: true },
    version: { type: Number, required: true, min: 1 },
    isLatest: { type: Boolean, default: true },
    originalName: { type: String, required: true, maxlength: 255 },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    kind: { type: String, enum: FILE_KINDS, default: "project_file" },
    note: { type: String, default: "", maxlength: 2000 },
    storage: {
      driver: { type: String, enum: ["cloudinary", "s3", "local"], required: true },
      key: { type: String, required: true },
      resourceType: { type: String },
      format: { type: String },
    },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    uploaderRole: { type: String, enum: ROLES, required: true },
    reviewStatus: { type: String, enum: FILE_REVIEW_STATUSES, default: "pending" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    comments: [commentSchema],
  },
  { timestamps: true }
);

fileSchema.index({ project: 1, lineageKey: 1, version: 1 }, { unique: true });
fileSchema.index({ project: 1, isLatest: 1, createdAt: -1 });

export const ProjectFile = mongoose.model("ProjectFile", fileSchema);
