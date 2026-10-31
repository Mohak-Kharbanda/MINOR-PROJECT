import { HydratedDocument, Types } from "mongoose";
import {
  ACTIVE_WORK_STATUSES,
  EDITABLE_PROPOSAL_STATUSES,
  type ProjectPermissions,
} from "@edutrack/shared";
import { Project } from "../models/Project";
import { Team, type ITeam } from "../models/Team";
import { ApiError } from "../utils/ApiError";
import type { AuthUser } from "../middleware/auth";

export async function loadProject(projectId: string) {
  const project = await Project.findById(projectId);
  if (!project) throw ApiError.notFound("Project not found.");
  return project;
}

export type ProjectDoc = Awaited<ReturnType<typeof loadProject>>;

export interface ProjectContext {
  project: ProjectDoc;
  team: HydratedDocument<ITeam>;
  user: AuthUser;
  isMember: boolean;
  isAssignedFaculty: boolean;
  isAdmin: boolean;
}

export function isTeamMember(team: { members: Types.ObjectId[] }, userId: string) {
  return team.members.some((m) => m.toString() === userId);
}

/**
 * Loads a project and decides whether the current user may see it at all:
 * students must be on the project's team, faculty must be the assigned guide
 * (and only once the proposal has been sent for review), admins see all.
 * Every project-scoped endpoint goes through here.
 */
export async function loadProjectContext(projectId: string, user: AuthUser): Promise<ProjectContext> {
  const project = await loadProject(projectId);
  const team = await Team.findById(project.team);
  if (!team) throw ApiError.notFound("Project team not found.");

  const isAdmin = user.role === "admin";
  const isMember = user.role === "student" && isTeamMember(team, user.id);
  const isAssignedFaculty =
    user.role === "faculty" && project.faculty.toString() === user.id && project.status !== "draft";

  if (!isAdmin && !isMember && !isAssignedFaculty) {
    throw ApiError.forbidden("You do not have access to this project.");
  }
  return { project, team, user, isMember, isAssignedFaculty, isAdmin };
}

export function computePermissions(ctx: ProjectContext): ProjectPermissions {
  const { project, isMember, isAssignedFaculty, isAdmin } = ctx;
  const s = project.status;
  const activeWork = ACTIVE_WORK_STATUSES.includes(s);
  const locked = s === "evaluated";

  return {
    canEditProposal: (isMember && EDITABLE_PROPOSAL_STATUSES.includes(s)) || (isAdmin && !locked),
    canSubmitProposal: isMember && (s === "draft" || s === "rejected"),
    canReview: isAssignedFaculty && s === "pending_review",
    canGiveFeedback: isMember || isAssignedFaculty || isAdmin,
    canManageTasks: isMember && activeWork,
    canUpload:
      (isMember && s !== "submitted" && !locked) || ((isAssignedFaculty || isAdmin) && !locked && s !== "draft"),
    canUploadFinal: isMember && activeWork,
    canSubmitFinal: isMember && activeWork,
    canReturnSubmission: isAssignedFaculty && s === "submitted",
    canEvaluate: (isAssignedFaculty || isAdmin) && (s === "submitted" || s === "evaluated"),
    canReviewFiles: isAssignedFaculty || isAdmin,
    canAssignFaculty: isAdmin,
    canDelete: isAdmin,
  };
}

export function requirePermission(ctx: ProjectContext, perm: keyof ProjectPermissions, message: string) {
  if (!computePermissions(ctx)[perm]) throw ApiError.forbidden(message);
}
