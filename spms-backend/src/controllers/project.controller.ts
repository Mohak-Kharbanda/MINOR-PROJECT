import { Request, Response } from "express";
import { Types } from "mongoose";
import { isTaskOverdue, type MemberProgress, type ProjectDetailDTO } from "@edutrack/shared";
import { Project } from "../models/Project";
import { Team } from "../models/Team";
import { Task } from "../models/Task";
import { User } from "../models/User";
import { Department } from "../models/Department";
import { ProjectFile } from "../models/ProjectFile";
import { AuditLog } from "../models/AuditLog";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { ok, created, paginate, searchRegex } from "../utils/http";
import { USER_REF_FIELDS, userRef } from "../utils/serialize";
import { audit } from "../services/audit";
import { computePermissions, loadProjectContext, requirePermission } from "../services/access";
import { overdueCounts } from "../services/progress";
import { toActivityDTO, toProjectDTO } from "../services/serializers";
import { storageFor } from "../services/storage";
import { parseDueDate } from "../utils/dates";

const LIST_POPULATE = [
  { path: "team", select: "name members leader", populate: { path: "members", select: USER_REF_FIELDS } },
  { path: "faculty", select: USER_REF_FIELDS },
  { path: "department", select: "name code" },
];

async function loadDetail(id: Types.ObjectId | string) {
  const project = await Project.findById(id)
    .populate(LIST_POPULATE)
    .populate("feedback.author", USER_REF_FIELDS)
    .populate("reviews.by", USER_REF_FIELDS)
    .populate("submission.submittedBy", USER_REF_FIELDS)
    .populate("evaluation.evaluatedBy", USER_REF_FIELDS)
    .lean();
  if (!project) throw ApiError.notFound("Project not found.");
  return project;
}

async function detailResponse(req: Request, projectId: string): Promise<ProjectDetailDTO> {
  const ctx = await loadProjectContext(projectId, req.user!);
  const project = await loadDetail(projectId);
  const overdue = (await overdueCounts([project._id])).get(project._id.toString()) ?? 0;
  return {
    ...toProjectDTO(project, overdue),
    feedback: (project.feedback || []).map((f: any) => ({
      id: f._id.toString(),
      author: userRef(f.author),
      authorRole: f.authorRole,
      message: f.message,
      kind: f.kind,
      createdAt: new Date(f.createdAt).toISOString(),
    })),
    reviews: (project.reviews || []).map((r: any) => ({
      id: r._id.toString(),
      decision: r.decision,
      message: r.message || "",
      by: userRef(r.by),
      at: new Date(r.at).toISOString(),
    })),
    permissions: computePermissions(ctx),
    viewerRole: req.user!.role,
  };
}

const SORTS: Record<string, Record<string, 1 | -1>> = {
  recent: { updatedAt: -1 },
  progress: { progress: -1, updatedAt: -1 },
  deadline: { deadline: 1, updatedAt: -1 },
  title: { title: 1 },
};

/** Role-scoped project list: students see their team's, faculty their assigned, admins all. */
export const listProjects = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, status, department, faculty, term, search, sort } = req.query as any;
  const user = req.user!;
  const filter: Record<string, any> = {};

  if (user.role === "student") {
    const team = await Team.findOne({ members: user.id }).select("_id").lean();
    if (!team) return ok(res, [], { pagination: paginate(page, limit, 0) });
    filter.team = team._id;
  } else if (user.role === "faculty") {
    filter.faculty = new Types.ObjectId(user.id);
    filter.status = { $ne: "draft" };
  } else if (faculty) {
    filter.faculty = new Types.ObjectId(faculty);
  }

  if (status) {
    if (user.role === "faculty" && status === "draft") return ok(res, [], { pagination: paginate(page, limit, 0) });
    filter.status = status;
  }
  if (department) filter.department = new Types.ObjectId(department);
  if (term) filter.academicTerm = searchRegex(term);
  if (search) filter.title = searchRegex(search);

  const [items, total] = await Promise.all([
    Project.find(filter)
      .populate(LIST_POPULATE)
      .sort(SORTS[sort] ?? SORTS.recent)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Project.countDocuments(filter),
  ]);
  const overdue = await overdueCounts(items.map((p) => p._id));
  ok(res, items.map((p) => toProjectDTO(p, overdue.get(p._id.toString()) ?? 0)), { pagination: paginate(page, limit, total) });
});

export const createProject = asyncHandler(async (req: Request, res: Response) => {
  const { title, description, objectives, techStack, department, academicTerm, faculty, deadline, submitForReview } = req.body;

  // The team is always the caller's own team — never taken from the request.
  const team = await Team.findOne({ members: req.user!.id });
  if (!team) throw ApiError.badRequest("Create or join a team before proposing a project.");
  if (await Project.exists({ team: team._id })) throw ApiError.conflict("Your team already has a project. Edit it instead.");
  if (!(await Department.exists({ _id: department }))) throw ApiError.badRequest("Department not found.");
  const guide = await User.findOne({ _id: faculty, role: "faculty", isActive: true }).select("name");
  if (!guide) throw ApiError.badRequest("Choose an active faculty member as your guide.");

  let project;
  try {
    project = await Project.create({
      title,
      description,
      objectives,
      techStack,
      department,
      academicTerm,
      faculty,
      deadline: parseDueDate(deadline),
      team: team._id,
      createdBy: req.user!.id,
      status: submitForReview ? "pending_review" : "draft",
      proposalSubmittedAt: submitForReview ? new Date() : null,
    });
  } catch (err: any) {
    if (err?.code === 11000) throw ApiError.conflict("Your team already has a project.");
    throw err;
  }

  await audit(req, {
    action: submitForReview ? "project.propose" : "project.create_draft",
    summary: submitForReview ? `Proposed "${title}" to ${guide.name} for review` : `Started a draft proposal "${title}"`,
    targetType: "Project",
    targetId: project._id,
    project: project._id,
  });
  created(res, await detailResponse(req, project.id), submitForReview ? "Proposal sent for review." : "Draft saved.");
});

export const getProject = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await detailResponse(req, req.params.projectId));
});

export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  const ctx = await loadProjectContext(req.params.projectId, req.user!);
  requirePermission(ctx, "canEditProposal", "This proposal can no longer be edited.");
  const { project } = ctx;
  const { title, description, objectives, techStack, academicTerm, deadline, faculty } = req.body;

  if (faculty && faculty !== project.faculty.toString()) {
    if (!ctx.isAdmin && project.status === "pending_review") {
      throw ApiError.badRequest("You can't change the guide while the proposal is under review.");
    }
    const guide = await User.exists({ _id: faculty, role: "faculty", isActive: true });
    if (!guide) throw ApiError.badRequest("Choose an active faculty member as your guide.");
    project.faculty = new Types.ObjectId(faculty);
  }
  if (title !== undefined) project.title = title;
  if (description !== undefined) project.description = description;
  if (objectives !== undefined) project.objectives = objectives;
  if (techStack !== undefined) project.techStack = techStack;
  if (academicTerm !== undefined) project.academicTerm = academicTerm;
  if (deadline !== undefined) project.deadline = parseDueDate(deadline);
  await project.save();

  await audit(req, { action: "project.update", summary: `Updated the proposal details`, targetType: "Project", targetId: project._id, project: project._id, meta: { fields: Object.keys(req.body) } });
  ok(res, await detailResponse(req, project.id), { message: "Project updated." });
});

export const submitProposal = asyncHandler(async (req: Request, res: Response) => {
  const ctx = await loadProjectContext(req.params.projectId, req.user!);
  requirePermission(ctx, "canSubmitProposal", "Only a draft or rejected proposal can be sent for review.");
  const { project } = ctx;
  const resubmission = project.status === "rejected";
  project.status = "pending_review";
  project.proposalSubmittedAt = new Date();
  await project.save();
  await audit(req, { action: resubmission ? "project.resubmit" : "project.propose", summary: resubmission ? "Resubmitted the revised proposal" : "Sent the proposal for review", targetType: "Project", targetId: project._id, project: project._id });
  ok(res, await detailResponse(req, project.id), { message: "Proposal sent for review." });
});

// Faculty: approve or reject. Only the assigned guide may act, and only on a
// proposal that is actually pending review.
export const reviewProject = asyncHandler(async (req: Request, res: Response) => {
  const ctx = await loadProjectContext(req.params.projectId, req.user!);
  if (!ctx.isAssignedFaculty) throw ApiError.forbidden("Only the assigned faculty guide can review this proposal.");
  requirePermission(ctx, "canReview", "Only proposals pending review can be approved or rejected.");
  const { project } = ctx;
  const { decision, message } = req.body;

  project.status = decision;
  project.reviews.push({ decision, message, by: new Types.ObjectId(req.user!.id), at: new Date() } as any);
  if (message) {
    project.feedback.push({ author: new Types.ObjectId(req.user!.id), authorRole: "faculty", message, kind: "proposal", createdAt: new Date() } as any);
  }
  await project.save();

  await audit(req, { action: `project.${decision}`, summary: decision === "approved" ? `Approved the proposal "${project.title}"` : `Rejected the proposal "${project.title}"`, targetType: "Project", targetId: project._id, project: project._id, meta: { message } });
  ok(res, await detailResponse(req, project.id), { message: decision === "approved" ? "Proposal approved." : "Proposal rejected with feedback." });
});

export const addFeedback = asyncHandler(async (req: Request, res: Response) => {
  const ctx = await loadProjectContext(req.params.projectId, req.user!);
  requirePermission(ctx, "canGiveFeedback", "You cannot comment on this project.");
  const { project } = ctx;
  project.feedback.push({ author: new Types.ObjectId(req.user!.id), authorRole: req.user!.role, message: req.body.message, kind: req.body.kind, createdAt: new Date() } as any);
  await project.save();
  await audit(req, { action: req.user!.role === "student" ? "project.comment" : "project.feedback", summary: req.user!.role === "student" ? "Replied in the feedback thread" : "Left feedback on the project", targetType: "Project", targetId: project._id, project: project._id });
  ok(res, await detailResponse(req, project.id), { status: 201, message: "Feedback posted." });
});

export const submitFinal = asyncHandler(async (req: Request, res: Response) => {
  const ctx = await loadProjectContext(req.params.projectId, req.user!);
  if (!ctx.isMember) throw ApiError.forbidden("Only team members can submit the project.");
  requirePermission(ctx, "canSubmitFinal", "Only an approved, in-progress project can be submitted.");
  const { project } = ctx;

  const finalFiles = await ProjectFile.countDocuments({ project: project._id, kind: "final_submission", isLatest: true });
  if (!finalFiles) throw ApiError.badRequest("Upload at least one final submission file before submitting.");

  project.status = "submitted";
  project.submission = { submittedAt: new Date(), submittedBy: new Types.ObjectId(req.user!.id), note: req.body.note || "" };
  await project.save();
  await audit(req, { action: "project.submit", summary: `Submitted the final project with ${finalFiles} deliverable${finalFiles > 1 ? "s" : ""}`, targetType: "Project", targetId: project._id, project: project._id });
  ok(res, await detailResponse(req, project.id), { message: "Final project submitted for evaluation." });
});

export const returnSubmission = asyncHandler(async (req: Request, res: Response) => {
  const ctx = await loadProjectContext(req.params.projectId, req.user!);
  if (!ctx.isAssignedFaculty) throw ApiError.forbidden("Only the assigned faculty guide can return a submission.");
  requirePermission(ctx, "canReturnSubmission", "Only a submitted project can be returned.");
  const { project } = ctx;
  project.status = "in_progress";
  project.reviews.push({ decision: "returned", message: req.body.message, by: new Types.ObjectId(req.user!.id), at: new Date() } as any);
  project.feedback.push({ author: new Types.ObjectId(req.user!.id), authorRole: "faculty", message: req.body.message, kind: "submission", createdAt: new Date() } as any);
  await project.save();
  await audit(req, { action: "project.return", summary: "Returned the submission for changes", targetType: "Project", targetId: project._id, project: project._id, meta: { message: req.body.message } });
  ok(res, await detailResponse(req, project.id), { message: "Submission returned to the team." });
});

export const evaluateProject = asyncHandler(async (req: Request, res: Response) => {
  const ctx = await loadProjectContext(req.params.projectId, req.user!);
  if (!ctx.isAssignedFaculty && !ctx.isAdmin) throw ApiError.forbidden("Only the assigned faculty guide can evaluate this project.");
  requirePermission(ctx, "canEvaluate", "Only a submitted project can be evaluated.");
  const { project } = ctx;
  const { marks, notes } = req.body;
  const previous = project.evaluation?.marks;

  project.evaluation = { marks, maxMarks: 100, notes, evaluatedBy: new Types.ObjectId(req.user!.id), evaluatedAt: new Date() };
  project.status = "evaluated";
  await project.save();
  await audit(req, {
    action: previous === undefined || previous === null ? "project.evaluate" : "project.re_evaluate",
    summary: previous === undefined || previous === null ? `Evaluated the project: ${marks}/100` : `Changed marks from ${previous} to ${marks}/100`,
    targetType: "Project",
    targetId: project._id,
    project: project._id,
    meta: { marks, previous },
  });
  ok(res, await detailResponse(req, project.id), { message: "Evaluation saved." });
});

export const assignFaculty = asyncHandler(async (req: Request, res: Response) => {
  const ctx = await loadProjectContext(req.params.projectId, req.user!);
  requirePermission(ctx, "canAssignFaculty", "Only admins can reassign faculty.");
  const guide = await User.findOne({ _id: req.body.faculty, role: "faculty", isActive: true }).select("name");
  if (!guide) throw ApiError.badRequest("Choose an active faculty member.");
  const { project } = ctx;
  project.faculty = guide._id;
  await project.save();
  await audit(req, { action: "admin.assign_faculty", summary: `Assigned ${guide.name} as guide for "${project.title}"`, targetType: "Project", targetId: project._id, project: project._id });
  ok(res, await detailResponse(req, project.id), { message: `${guide.name} is now the guide.` });
});

export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
  const ctx = await loadProjectContext(req.params.projectId, req.user!);
  requirePermission(ctx, "canDelete", "Only admins can delete projects.");
  const { project } = ctx;

  const files = await ProjectFile.find({ project: project._id }).select("storage").lean();
  await Promise.all(files.map((f) => storageFor(f.storage).remove(f.storage).catch(() => undefined)));
  await Promise.all([ProjectFile.deleteMany({ project: project._id }), Task.deleteMany({ project: project._id })]);
  await project.deleteOne();

  await audit(req, { action: "admin.delete_project", summary: `Deleted project "${project.title}" with ${files.length} file versions`, targetType: "Project", targetId: project._id });
  ok(res, null, { message: "Project deleted." });
});

export const projectActivity = asyncHandler(async (req: Request, res: Response) => {
  await loadProjectContext(req.params.projectId, req.user!);
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const items = await AuditLog.find({ project: req.params.projectId })
    .populate("actor", USER_REF_FIELDS)
    .populate("project", "title")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  ok(res, items.map(toActivityDTO));
});

export async function computeMemberProgress(projectId: Types.ObjectId, memberIds: Types.ObjectId[]): Promise<MemberProgress[]> {
  const [members, tasks] = await Promise.all([
    User.find({ _id: { $in: memberIds } }).select(USER_REF_FIELDS).lean(),
    Task.find({ project: projectId }).select("assignee status dueDate").lean(),
  ]);
  return members.map((m) => {
    const mine = tasks.filter((t) => t.assignee?.toString() === m._id.toString());
    const done = mine.filter((t) => t.status === "done").length;
    return {
      user: userRef(m)!,
      assigned: mine.length,
      done,
      overdue: mine.filter((t) => isTaskOverdue(t.dueDate, t.status)).length,
      progress: mine.length ? Math.round((done / mine.length) * 100) : 0,
    };
  });
}

export const memberProgress = asyncHandler(async (req: Request, res: Response) => {
  const ctx = await loadProjectContext(req.params.projectId, req.user!);
  ok(res, await computeMemberProgress(ctx.project._id, ctx.team.members));
});
