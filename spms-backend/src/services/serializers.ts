import {
  EMPTY_TASK_STATS,
  isTaskOverdue,
  type ActivityDTO,
  type FileVersionDTO,
  type ProjectDTO,
  type TaskDTO,
  type TeamDTO,
  type TeamProgressRow,
  type UserDTO,
} from "@edutrack/shared";
import { departmentRef, idOf, iso, userRef } from "../utils/serialize";

// Serializers turn (lean or hydrated, possibly populated) documents into the
// DTO shapes from @edutrack/shared. They never include secrets or storage keys.

export function toUserDTO(u: any): UserDTO {
  return {
    id: idOf(u)!,
    name: u.name,
    email: u.email,
    role: u.role,
    usn: u.usn || undefined,
    department: departmentRef(u.department),
    isActive: u.isActive !== false,
    lastLoginAt: iso(u.lastLoginAt),
    createdAt: iso(u.createdAt)!,
  };
}

export function toTeamDTO(t: any, opts: { includeJoinCode?: boolean; project?: TeamDTO["project"] } = {}): TeamDTO {
  return {
    id: idOf(t)!,
    name: t.name,
    joinCode: opts.includeJoinCode ? t.joinCode : undefined,
    department: departmentRef(t.department),
    members: (t.members || []).map(userRef).filter(Boolean),
    leader: idOf(t.leader)!,
    maxMembers: t.maxMembers,
    createdAt: iso(t.createdAt)!,
    project: opts.project ?? null,
  };
}

export function toProjectDTO(p: any, overdue?: number): ProjectDTO {
  const stats = { ...EMPTY_TASK_STATS, ...(p.taskStats?.toObject?.() ?? p.taskStats ?? {}) };
  if (overdue !== undefined) stats.overdue = overdue;
  const team = p.team && p.team._id ? p.team : null;
  return {
    id: idOf(p)!,
    title: p.title,
    description: p.description,
    objectives: p.objectives || "",
    techStack: p.techStack ? [...p.techStack] : [],
    department: departmentRef(p.department),
    academicTerm: p.academicTerm,
    team: team
      ? {
          id: idOf(team)!,
          name: team.name,
          members: (team.members || []).map(userRef).filter(Boolean),
          leader: idOf(team.leader) ?? undefined,
        }
      : null,
    faculty: userRef(p.faculty),
    status: p.status,
    deadline: iso(p.deadline),
    taskStats: stats,
    progress: p.progress ?? 0,
    proposalSubmittedAt: iso(p.proposalSubmittedAt),
    submission: p.submission
      ? {
          submittedAt: iso(p.submission.submittedAt)!,
          submittedBy: userRef(p.submission.submittedBy),
          note: p.submission.note || "",
        }
      : null,
    evaluation: p.evaluation
      ? {
          marks: p.evaluation.marks,
          maxMarks: p.evaluation.maxMarks ?? 100,
          notes: p.evaluation.notes || "",
          evaluatedBy: userRef(p.evaluation.evaluatedBy),
          evaluatedAt: iso(p.evaluation.evaluatedAt)!,
        }
      : null,
    createdAt: iso(p.createdAt)!,
    updatedAt: iso(p.updatedAt)!,
  };
}

export function toTaskDTO(t: any): TaskDTO {
  return {
    id: idOf(t)!,
    project: idOf(t.project)!,
    title: t.title,
    description: t.description || "",
    assignee: userRef(t.assignee),
    dueDate: iso(t.dueDate),
    status: t.status,
    priority: t.priority,
    isOverdue: isTaskOverdue(t.dueDate, t.status),
    createdBy: userRef(t.createdBy),
    completedAt: iso(t.completedAt),
    createdAt: iso(t.createdAt)!,
    updatedAt: iso(t.updatedAt)!,
  };
}

export function toFileDTO(f: any): FileVersionDTO {
  return {
    id: idOf(f)!,
    project: idOf(f.project)!,
    lineageKey: f.lineageKey,
    version: f.version,
    originalName: f.originalName,
    mimeType: f.mimeType,
    size: f.size,
    kind: f.kind,
    note: f.note || "",
    uploadedBy: userRef(f.uploadedBy),
    uploaderRole: f.uploaderRole,
    reviewStatus: f.reviewStatus,
    reviewedBy: userRef(f.reviewedBy),
    reviewedAt: iso(f.reviewedAt),
    comments: (f.comments || []).map((c: any) => ({
      id: idOf(c)!,
      author: userRef(c.author),
      authorRole: c.authorRole,
      message: c.message,
      createdAt: iso(c.createdAt)!,
    })),
    isLatest: Boolean(f.isLatest),
    createdAt: iso(f.createdAt)!,
  };
}

export function toActivityDTO(a: any): ActivityDTO {
  const project = a.project && a.project._id ? { id: idOf(a.project)!, title: a.project.title } : null;
  return {
    id: idOf(a)!,
    actor: userRef(a.actor),
    actorRole: a.actorRole ?? null,
    action: a.action,
    summary: a.summary || a.action,
    targetType: a.targetType,
    targetId: idOf(a.targetId),
    project,
    createdAt: iso(a.createdAt)!,
  };
}

export function toTeamProgressRow(team: any, project: any | null, overdue?: number): TeamProgressRow {
  const p = project ? toProjectDTO(project, overdue) : null;
  return {
    team: {
      id: idOf(team)!,
      name: team.name,
      department: departmentRef(team.department),
      members: (team.members || []).map(userRef).filter(Boolean),
      memberCount: (team.members || []).length,
    },
    project: p
      ? { id: p.id, title: p.title, status: p.status, deadline: p.deadline, faculty: p.faculty }
      : null,
    progress: p?.progress ?? 0,
    taskStats: p?.taskStats ?? { ...EMPTY_TASK_STATS },
  };
}
