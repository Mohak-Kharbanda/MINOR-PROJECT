import crypto from "crypto";
import fs from "fs";
import { Types } from "mongoose";
import { FILE_REVIEW_LABELS } from "@edutrack/shared";
import { ProjectFile } from "../models/ProjectFile.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/http.js";
import { USER_REF_FIELDS } from "../utils/serialize.js";
import { verifyFileToken } from "../utils/jwt.js";
import { audit } from "../services/audit.js";
import { computePermissions, loadProjectContext, requirePermission } from "../services/access.js";
import { getStorage, storageFor, contentDisposition } from "../services/storage/index.js";
import { LocalStorage } from "../services/storage/local.js";
import { toFileDTO } from "../services/serializers.js";

const SIGNED_URL_TTL_SECONDS = 5 * 60;
const INLINE_SAFE = /^(application\/pdf|image\/(png|jpeg|webp|gif)|text\/plain)$/;

const FILE_POPULATE = [
  { path: "uploadedBy", select: USER_REF_FIELDS },
  { path: "reviewedBy", select: USER_REF_FIELDS },
  { path: "comments.author", select: USER_REF_FIELDS },
];

async function loadFileDTO(id) {
  const file = await ProjectFile.findById(id).populate(FILE_POPULATE).lean();
  return toFileDTO(file);
}

async function loadFileInProject(fileId, projectId) {
  const file = await ProjectFile.findOne({ _id: fileId, project: projectId });
  if (!file) throw ApiError.notFound("File not found.");
  return file;
}

/** Latest version of every deliverable, with version/comment counts. */
export const listFiles = asyncHandler(async (req, res) => {
  const ctx = await loadProjectContext(req.params.projectId, req.user);
  const filter = { project: ctx.project._id, isLatest: true };
  if (req.query.kind) filter.kind = req.query.kind;

  const [latest, counts] = await Promise.all([
    ProjectFile.find(filter).populate(FILE_POPULATE).sort({ createdAt: -1 }).lean(),
    ProjectFile.aggregate([
      { $match: { project: ctx.project._id } },
      { $group: { _id: "$lineageKey", versions: { $sum: 1 }, comments: { $sum: { $size: "$comments" } } } },
    ]),
  ]);
  const byLineage = new Map(counts.map((c) => [c._id, c]));
  const data = latest.map((f) => {
    const c = byLineage.get(f.lineageKey);
    // Upload notes count as part of the conversation too.
    return { ...toFileDTO(f), versionCount: c?.versions ?? 1, commentCount: c?.comments ?? 0 };
  });
  ok(res, data);
});

/** Every version of one deliverable, oldest first, each with its comments. */
export const lineageHistory = asyncHandler(async (req, res) => {
  const ctx = await loadProjectContext(req.params.projectId, req.user);
  const versions = await ProjectFile.find({ project: ctx.project._id, lineageKey: req.params.lineageKey }).populate(FILE_POPULATE).sort({ version: 1 }).lean();
  if (!versions.length) throw ApiError.notFound("File not found.");
  ok(res, versions.map(toFileDTO));
});

/**
 * Upload a new file, or a new version of an existing one (pass lineageKey).
 * Students upload project files and final deliverables; the assigned faculty
 * (and admins) can upload files too, and can re-upload an edited version of
 * a student's file — in which case a note explaining the changes is required.
 */
export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest("Choose a file to upload.");
  const ctx = await loadProjectContext(req.params.projectId, req.user);
  const { project } = ctx;
  const user = req.user;
  const { lineageKey: incomingKey, note } = req.body;
  let kind = req.body.kind;

  let version = 1;
  let lineageKey = incomingKey || "";
  let previous = null;

  if (lineageKey) {
    previous = await ProjectFile.findOne({ project: project._id, lineageKey, isLatest: true });
    if (!previous) throw ApiError.badRequest("The file you are trying to replace was not found in this project.");
    kind = previous.kind; // a new version keeps the deliverable's kind
    version = previous.version + 1;
  } else {
    lineageKey = crypto.randomUUID();
  }

  const perms = computePermissions(ctx);
  if (kind === "final_submission") {
    if (ctx.isMember) {
      if (!perms.canUploadFinal) throw ApiError.forbidden("Final deliverables can only be uploaded while the project is approved or in progress.");
    } else if (!previous || !perms.canUpload) {
      throw ApiError.forbidden("Only the team can add final deliverables.");
    }
  } else if (!perms.canUpload) {
    throw ApiError.forbidden(ctx.isMember ? "Files are locked after the final submission." : "You cannot upload files to this project right now.");
  }
  if (previous && !ctx.isMember && note.length < 3) {
    throw ApiError.badRequest("Add a short comment explaining what you changed in this version.");
  }

  const storage = getStorage();
  const stored = await storage.put({
    buffer: req.file.buffer,
    prefix: `projects/${project.id}`,
    filename: req.file.originalname,
    mimeType: req.file.mimetype,
  });

  let file;
  try {
    file = await ProjectFile.create({
      project: project._id,
      lineageKey,
      version,
      isLatest: true,
      originalName: req.file.originalname.slice(-255),
      mimeType: req.file.mimetype,
      size: req.file.size,
      kind,
      note,
      storage: stored,
      uploadedBy: user.id,
      uploaderRole: user.role,
    });
  } catch (err) {
    await storage.remove(stored).catch(() => undefined);
    if (err?.code === 11000) throw ApiError.conflict("Someone uploaded a newer version just now. Refresh and try again.");
    throw err;
  }
  if (previous) await ProjectFile.updateOne({ _id: previous._id }, { $set: { isLatest: false } });

  if (project.status === "approved" && ctx.isMember) {
    project.status = "in_progress";
    await project.save();
  }

  const who = ctx.isMember ? "" : user.role === "faculty" ? " (faculty revision)" : " (admin)";
  await audit(req, {
    action: previous ? "file.reupload" : "file.upload",
    summary: previous
      ? `Uploaded v${version} of ${req.file.originalname}${who}`
      : `Uploaded ${req.file.originalname}${kind === "final_submission" ? " as a final deliverable" : ""}`,
    targetType: "ProjectFile",
    targetId: file._id,
    project: project._id,
    meta: { version, kind, lineageKey },
  });
  created(res, await loadFileDTO(file._id), previous ? `Version ${version} uploaded.` : "File uploaded.");
});

export const commentOnFile = asyncHandler(async (req, res) => {
  const ctx = await loadProjectContext(req.params.projectId, req.user);
  requirePermission(ctx, "canGiveFeedback", "You cannot comment on this project's files.");
  const file = await loadFileInProject(req.params.fileId, ctx.project._id);
  file.comments.push({ author: new Types.ObjectId(req.user.id), authorRole: req.user.role, message: req.body.message, createdAt: new Date() });
  await file.save();
  await audit(req, {
    action: "file.comment",
    summary: `Commented on ${file.originalName} (v${file.version})`,
    targetType: "ProjectFile",
    targetId: file._id,
    project: ctx.project._id,
  });
  created(res, await loadFileDTO(file._id), "Comment added.");
});

export const reviewFile = asyncHandler(async (req, res) => {
  const ctx = await loadProjectContext(req.params.projectId, req.user);
  requirePermission(ctx, "canReviewFiles", "Only the assigned faculty guide or an admin can review files.");
  const file = await loadFileInProject(req.params.fileId, ctx.project._id);
  const { reviewStatus, message } = req.body;

  file.reviewStatus = reviewStatus;
  file.reviewedBy = new Types.ObjectId(req.user.id);
  file.reviewedAt = new Date();
  if (message) {
    file.comments.push({ author: new Types.ObjectId(req.user.id), authorRole: req.user.role, message, createdAt: new Date() });
  }
  await file.save();
  await audit(req, {
    action: "file.review",
    summary: `Marked ${file.originalName} (v${file.version}) as "${FILE_REVIEW_LABELS[reviewStatus]}"`,
    targetType: "ProjectFile",
    targetId: file._id,
    project: ctx.project._id,
    meta: { reviewStatus },
  });
  ok(res, await loadFileDTO(file._id), { message: "Review saved." });
});

/** Issues a short-lived signed URL after the access check. */
export const fileUrl = asyncHandler(async (req, res) => {
  const ctx = await loadProjectContext(req.params.projectId, req.user);
  const file = await loadFileInProject(req.params.fileId, ctx.project._id);
  const disposition = req.query.disposition === "inline" && INLINE_SAFE.test(file.mimeType) ? "inline" : "attachment";
  const url = await storageFor(file.storage).signedUrl({
    object: file.storage,
    filename: file.originalName,
    mimeType: file.mimeType,
    disposition,
    ttlSeconds: SIGNED_URL_TTL_SECONDS,
  });
  ok(res, { url, expiresAt: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString() });
});

export const deleteFile = asyncHandler(async (req, res) => {
  const ctx = await loadProjectContext(req.params.projectId, req.user);
  const file = await loadFileInProject(req.params.fileId, ctx.project._id);
  const isUploader = file.uploadedBy.toString() === req.user.id;

  if (!ctx.isAdmin) {
    if (!isUploader) throw ApiError.forbidden("You can only delete files you uploaded.");
    requirePermission(ctx, "canUpload", "Files are locked at this stage of the project.");
  }

  await storageFor(file.storage)
    .remove(file.storage)
    .catch(() => undefined);
  await file.deleteOne();
  if (file.isLatest) {
    const prev = await ProjectFile.findOne({ project: ctx.project._id, lineageKey: file.lineageKey }).sort({ version: -1 });
    if (prev) await ProjectFile.updateOne({ _id: prev._id }, { $set: { isLatest: true } });
  }
  await audit(req, {
    action: "file.delete",
    summary: `Deleted ${file.originalName} (v${file.version})`,
    targetType: "ProjectFile",
    targetId: file._id,
    project: ctx.project._id,
  });
  ok(res, null, { message: "File deleted." });
});

/** Streams a locally stored file; authorized by the short-lived token alone. */
export const localDownload = asyncHandler(async (req, res) => {
  let payload;
  try {
    payload = verifyFileToken(req.params.token);
  } catch {
    throw ApiError.forbidden("This download link is invalid or has expired.");
  }
  const storage = getStorage();
  const local = storage instanceof LocalStorage ? storage : new LocalStorage();
  const full = local.resolve(payload.key);
  if (!fs.existsSync(full)) throw ApiError.notFound("File no longer exists.");

  res.setHeader("Content-Type", payload.mime || "application/octet-stream");
  res.setHeader("Content-Disposition", contentDisposition(payload.disposition, payload.filename));
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Inline-rendered uploads get a sandboxed, scriptless origin. PDFs are
  // exempt because browsers refuse to render PDFs inside a CSP sandbox.
  res.setHeader(
    "Content-Security-Policy",
    payload.mime === "application/pdf"
      ? "frame-ancestors 'self'"
      : "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'self'"
  );
  res.setHeader("Cache-Control", "private, max-age=300");
  fs.createReadStream(full).pipe(res);
});
