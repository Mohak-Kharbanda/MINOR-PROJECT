import { Types } from "mongoose";
import { TASK_STATUS_LABELS } from "@edutrack/shared";
import { Task } from "../models/Task.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/http.js";
import { USER_REF_FIELDS } from "../utils/serialize.js";
import { audit } from "../services/audit.js";
import { isTeamMember, loadProjectContext, requirePermission } from "../services/access.js";
import { recomputeProjectProgress } from "../services/progress.js";
import { toTaskDTO } from "../services/serializers.js";
import { parseDueDate } from "../utils/dates.js";

function assertAssignable(ctx, assignee) {
  if (assignee && !isTeamMember(ctx.team, assignee)) {
    throw ApiError.badRequest("Tasks can only be assigned to members of this project's team.");
  }
}

async function loadTaskDTO(id) {
  const task = await Task.findById(id).populate("assignee", USER_REF_FIELDS).populate("createdBy", USER_REF_FIELDS).lean();
  return toTaskDTO(task);
}

export const listTasks = asyncHandler(async (req, res) => {
  const ctx = await loadProjectContext(req.params.projectId, req.user);
  const { status, assignee, overdue } = req.query;
  const filter = { project: ctx.project._id };
  if (status) filter.status = status;
  if (assignee) filter.assignee = assignee;
  if (overdue === "true") Object.assign(filter, { status: { $ne: "done" }, dueDate: { $ne: null, $lt: new Date() } });

  const tasks = await Task.find(filter)
    .populate("assignee", USER_REF_FIELDS)
    .populate("createdBy", USER_REF_FIELDS)
    .sort({ dueDate: 1, createdAt: -1 })
    .limit(500)
    .lean();
  ok(res, tasks.map(toTaskDTO));
});

export const createTask = asyncHandler(async (req, res) => {
  const ctx = await loadProjectContext(req.params.projectId, req.user);
  if (!ctx.isMember) throw ApiError.forbidden("Only team members can create tasks.");
  requirePermission(ctx, "canManageTasks", "Tasks can only be added while the project is approved or in progress.");

  const { title, description, assignee, dueDate, priority, status } = req.body;
  assertAssignable(ctx, assignee);

  const task = await Task.create({
    project: ctx.project._id,
    title,
    description,
    assignee: assignee || null,
    dueDate: parseDueDate(dueDate),
    priority,
    status,
    completedAt: status === "done" ? new Date() : null,
    createdBy: req.user.id,
  });

  // The first task moves an approved project into "in progress".
  if (ctx.project.status === "approved") {
    ctx.project.status = "in_progress";
    await ctx.project.save();
  }
  await recomputeProjectProgress(ctx.project._id);
  await audit(req, { action: "task.create", summary: `Created task "${title}"`, targetType: "Task", targetId: task._id, project: ctx.project._id });
  created(res, await loadTaskDTO(task._id), "Task created.");
});

export const updateTask = asyncHandler(async (req, res) => {
  const ctx = await loadProjectContext(req.params.projectId, req.user);
  if (!ctx.isMember) throw ApiError.forbidden("Only team members can update tasks.");
  requirePermission(ctx, "canManageTasks", "Tasks are locked once the project has been submitted.");

  const task = await Task.findOne({ _id: req.params.taskId, project: ctx.project._id });
  if (!task) throw ApiError.notFound("Task not found.");

  const { title, description, assignee, dueDate, priority, status } = req.body;
  if (assignee !== undefined) {
    assertAssignable(ctx, assignee);
    task.assignee = assignee ? new Types.ObjectId(assignee) : null;
  }
  const previousStatus = task.status;
  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (dueDate !== undefined) task.dueDate = parseDueDate(dueDate);
  if (priority !== undefined) task.priority = priority;
  if (status !== undefined) {
    task.status = status;
    task.completedAt = status === "done" ? (task.completedAt ?? new Date()) : null;
  }
  await task.save();
  await recomputeProjectProgress(ctx.project._id);

  if (status && status !== previousStatus) {
    await audit(req, {
      action: status === "done" ? "task.complete" : "task.status",
      summary: status === "done" ? `Completed task "${task.title}"` : `Moved "${task.title}" to ${TASK_STATUS_LABELS[status]}`,
      targetType: "Task",
      targetId: task._id,
      project: ctx.project._id,
    });
  }
  ok(res, await loadTaskDTO(task._id), { message: "Task updated." });
});

export const deleteTask = asyncHandler(async (req, res) => {
  const ctx = await loadProjectContext(req.params.projectId, req.user);
  if (!ctx.isMember) throw ApiError.forbidden("Only team members can delete tasks.");
  requirePermission(ctx, "canManageTasks", "Tasks are locked once the project has been submitted.");

  const task = await Task.findOneAndDelete({ _id: req.params.taskId, project: ctx.project._id });
  if (!task) throw ApiError.notFound("Task not found.");
  await recomputeProjectProgress(ctx.project._id);
  await audit(req, { action: "task.delete", summary: `Deleted task "${task.title}"`, targetType: "Task", targetId: task._id, project: ctx.project._id });
  ok(res, null, { message: "Task deleted." });
});
