import { ACTIVE_WORK_STATUSES, EDITABLE_PROPOSAL_STATUSES } from "@edutrack/shared";
import { Project } from "../models/Project.js";
import { Team } from "../models/Team.js";
import { ApiError } from "../utils/ApiError.js";

export async function loadProject(projectId) {
  const project = await Project.findById(projectId);
  if (!project) throw ApiError.notFound("Project not found.");
  return project;
}

export function isTeamMember(team, userId) {
  return team.members.some((m) => m.toString() === userId);
}

/**
 * Loads a project and decides whether the current user may see it at all:
 * students must be on the project's team, faculty must be the assigned guide
 * (and only once the proposal has been sent for review), admins see all.
 * Every project-scoped endpoint goes through here.
 */
export async function loadProjectContext(projectId, user) {
  const project = await loadProject(projectId);
  const team = await Team.findById(project.team);
  if (!team) throw ApiError.notFound("Project team not found.");

  const isAdmin = user.role === "admin";
  const isMember = user.role === "student" && isTeamMember(team, user.id);
  const isAssignedFaculty = user.role === "faculty" && project.faculty.toString() === user.id && project.status !== "draft";

  if (!isAdmin && !isMember && !isAssignedFaculty) {
    throw ApiError.forbidden("You do not have access to this project.");
  }
  return { project, team, user, isMember, isAssignedFaculty, isAdmin };
}

export function computePermissions(ctx) {
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
    canUpload: (isMember && s !== "submitted" && !locked) || ((isAssignedFaculty || isAdmin) && !locked && s !== "draft"),
    canUploadFinal: isMember && activeWork,
    canSubmitFinal: isMember && activeWork,
    canReturnSubmission: isAssignedFaculty && s === "submitted",
    canEvaluate: (isAssignedFaculty || isAdmin) && (s === "submitted" || s === "evaluated"),
    canReviewFiles: isAssignedFaculty || isAdmin,
    canAssignFaculty: isAdmin,
    canDelete: isAdmin,
  };
}

export function requirePermission(ctx, perm, message) {
  if (!computePermissions(ctx)[perm]) throw ApiError.forbidden(message);
}
