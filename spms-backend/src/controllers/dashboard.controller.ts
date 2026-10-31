import { Request, Response } from "express";
import { Types } from "mongoose";
import type {
  AdminDashboardDTO,
  DeadlineItem,
  FacultyDashboardDTO,
  StudentDashboardDTO,
} from "@edutrack/shared";
import { isTaskOverdue } from "@edutrack/shared";
import { Team } from "../models/Team";
import { Project } from "../models/Project";
import { Task } from "../models/Task";
import { User } from "../models/User";
import { Department } from "../models/Department";
import { ProjectFile } from "../models/ProjectFile";
import { AuditLog } from "../models/AuditLog";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/http";
import { USER_REF_FIELDS, userRef } from "../utils/serialize";
import { overdueCounts } from "../services/progress";
import { toActivityDTO, toProjectDTO, toTaskDTO, toTeamDTO, toTeamProgressRow } from "../services/serializers";
import { computeMemberProgress } from "./project.controller";

const DAY = 24 * 60 * 60 * 1000;
const PROJECT_POPULATE = [
  { path: "team", select: "name members leader department", populate: [{ path: "members", select: USER_REF_FIELDS }, { path: "department", select: "name code" }] },
  { path: "faculty", select: USER_REF_FIELDS },
  { path: "department", select: "name code" },
];

async function recentActivity(filter: Record<string, unknown>, limit = 12) {
  const items = await AuditLog.find(filter).populate("actor", USER_REF_FIELDS).populate("project", "title").sort({ createdAt: -1 }).limit(limit).lean();
  return items.map(toActivityDTO);
}

/** Task deadlines that are overdue or due within `days`, plus project deadlines. */
async function upcomingDeadlines(projects: any[], days = 14, extraTaskFilter: Record<string, unknown> = {}): Promise<DeadlineItem[]> {
  if (!projects.length) return [];
  const horizon = new Date(Date.now() + days * DAY);
  const titleById = new Map(projects.map((p) => [p._id.toString(), p.title]));
  const tasks = await Task.find({
    project: { $in: projects.map((p) => p._id) },
    status: { $ne: "done" },
    dueDate: { $ne: null, $lte: horizon },
    ...extraTaskFilter,
  })
    .populate("assignee", USER_REF_FIELDS)
    .sort({ dueDate: 1 })
    .limit(20)
    .lean();

  const items: DeadlineItem[] = tasks.map((t) => ({
    type: "task",
    id: t._id.toString(),
    title: t.title,
    dueDate: t.dueDate!.toISOString(),
    project: { id: t.project.toString(), title: titleById.get(t.project.toString()) ?? "" },
    assignee: userRef(t.assignee),
    status: t.status,
    isOverdue: isTaskOverdue(t.dueDate, t.status),
  }));
  for (const p of projects) {
    if (p.deadline && p.deadline <= horizon && !["submitted", "evaluated"].includes(p.status)) {
      items.push({
        type: "project",
        id: p._id.toString(),
        title: "Final submission due",
        dueDate: p.deadline.toISOString(),
        project: { id: p._id.toString(), title: p.title },
        status: p.status,
        isOverdue: p.deadline.getTime() < Date.now(),
      });
    }
  }
  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 20);
}

async function studentDashboard(req: Request): Promise<StudentDashboardDTO> {
  const userId = req.user!.id;
  const team = await Team.findOne({ members: userId }).populate("members", USER_REF_FIELDS).populate("department", "name code").lean();
  const empty: StudentDashboardDTO = {
    role: "student",
    team: team ? toTeamDTO(team, { includeJoinCode: true }) : null,
    project: null,
    myTasks: [],
    memberProgress: [],
    deadlines: [],
    activity: [],
    counts: { myOpenTasks: 0, myOverdue: 0, files: 0, daysToDeadline: null },
  };
  if (!team) return empty;

  const project = await Project.findOne({ team: team._id }).populate(PROJECT_POPULATE).lean();
  if (!project) return empty;

  const overdue = (await overdueCounts([project._id])).get(project._id.toString()) ?? 0;
  const [myTasks, memberProgress, deadlines, activity, files] = await Promise.all([
    Task.find({ project: project._id, assignee: userId, status: { $ne: "done" } }).populate("assignee", USER_REF_FIELDS).sort({ dueDate: 1 }).limit(20).lean(),
    computeMemberProgress(project._id, team.members.map((m: any) => m._id)),
    upcomingDeadlines([project]),
    recentActivity({ project: project._id }, 10),
    ProjectFile.countDocuments({ project: project._id, isLatest: true }),
  ]);
  const myTaskDTOs = myTasks.map(toTaskDTO);

  return {
    ...empty,
    team: toTeamDTO(team, { includeJoinCode: true, project: { id: project._id.toString(), title: project.title, status: project.status } }),
    project: toProjectDTO(project, overdue),
    myTasks: myTaskDTOs,
    memberProgress,
    deadlines,
    activity,
    counts: {
      myOpenTasks: myTaskDTOs.length,
      myOverdue: myTaskDTOs.filter((t) => t.isOverdue).length,
      files,
      daysToDeadline: project.deadline ? Math.ceil((project.deadline.getTime() - Date.now()) / DAY) : null,
    },
  };
}

async function facultyDashboard(req: Request): Promise<FacultyDashboardDTO> {
  const facultyId = new Types.ObjectId(req.user!.id);
  const projects = await Project.find({ faculty: facultyId, status: { $ne: "draft" } }).populate(PROJECT_POPULATE).sort({ updatedAt: -1 }).lean();
  const overdue = await overdueCounts(projects.map((p) => p._id));
  const dto = (p: any) => toProjectDTO(p, overdue.get(p._id.toString()) ?? 0);
  const active = projects.filter((p) => ["approved", "in_progress"].includes(p.status));
  const tracked = projects.filter((p) => !["rejected", "pending_review"].includes(p.status));

  const [deadlines, activity] = await Promise.all([
    upcomingDeadlines(active, 10),
    recentActivity({ project: { $in: projects.map((p) => p._id) } }, 12),
  ]);

  return {
    role: "faculty",
    counts: {
      assigned: projects.length,
      pendingReview: projects.filter((p) => p.status === "pending_review").length,
      active: active.length,
      submitted: projects.filter((p) => p.status === "submitted").length,
      evaluated: projects.filter((p) => p.status === "evaluated").length,
      averageProgress: tracked.length ? Math.round(tracked.reduce((s, p) => s + (p.progress || 0), 0) / tracked.length) : 0,
    },
    teams: projects
      .filter((p) => p.team)
      .map((p) => toTeamProgressRow(p.team, p, overdue.get(p._id.toString()) ?? 0))
      .sort((a, b) => b.progress - a.progress),
    pendingReview: projects.filter((p) => p.status === "pending_review").map(dto),
    awaitingEvaluation: projects.filter((p) => p.status === "submitted").map(dto),
    deadlines,
    activity,
  };
}

async function adminDashboard(): Promise<AdminDashboardDTO> {
  const [roleCounts, departments, teams, byStatus, avg, overdueTasks, activity] = await Promise.all([
    User.aggregate<{ _id: string; n: number }>([{ $match: { isActive: true } }, { $group: { _id: "$role", n: { $sum: 1 } } }]),
    Department.countDocuments(),
    Team.countDocuments(),
    Project.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    Project.aggregate<{ avg: number }>([{ $match: { status: { $in: ["approved", "in_progress", "submitted", "evaluated"] } } }, { $group: { _id: null, avg: { $avg: "$progress" } } }]),
    Task.countDocuments({ status: { $ne: "done" }, dueDate: { $ne: null, $lt: new Date() } }),
    recentActivity({}, 12),
  ]);
  const roles = Object.fromEntries(roleCounts.map((r) => [r._id, r.n]));
  const statusCounts = Object.fromEntries(byStatus.map((s) => [s._id, s.n]));

  const activeProjects = await Project.find({ status: { $in: ["approved", "in_progress", "submitted", "evaluated"] } })
    .populate(PROJECT_POPULATE)
    .sort({ progress: -1 })
    .limit(200)
    .lean();
  const overdue = await overdueCounts(activeProjects.map((p) => p._id));
  const rows = activeProjects.filter((p) => p.team).map((p) => ({ p, row: toTeamProgressRow(p.team, p, overdue.get(p._id.toString()) ?? 0) }));
  const soon = Date.now() + 10 * DAY;
  const atRisk = rows
    .filter(({ p, row }) => ["approved", "in_progress"].includes(p.status) && (row.taskStats.overdue > 0 || (p.deadline && p.deadline.getTime() < soon && row.progress < 60)))
    .sort((a, b) => b.row.taskStats.overdue - a.row.taskStats.overdue || a.row.progress - b.row.progress)
    .slice(0, 6)
    .map(({ row }) => row);

  return {
    role: "admin",
    counts: {
      students: roles.student ?? 0,
      faculty: roles.faculty ?? 0,
      admins: roles.admin ?? 0,
      departments,
      teams,
      projects: byStatus.reduce((s, r) => s + r.n, 0),
      averageProgress: Math.round(avg[0]?.avg ?? 0),
      overdueTasks,
    },
    statusCounts,
    topTeams: rows.slice(0, 6).map(({ row }) => row),
    atRisk,
    activity,
  };
}

export const dashboard = asyncHandler(async (req: Request, res: Response) => {
  const role = req.user!.role;
  const data = role === "student" ? await studentDashboard(req) : role === "faculty" ? await facultyDashboard(req) : await adminDashboard();
  ok(res, data);
});
