import crypto from "crypto";
import { Types } from "mongoose";
import { Team } from "../models/Team.js";
import { User } from "../models/User.js";
import { Department } from "../models/Department.js";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/http.js";
import { env } from "../config/env.js";
import { audit } from "../services/audit.js";
import { isTeamMember } from "../services/access.js";
import { recomputeProjectProgress } from "../services/progress.js";
import { toTeamDTO } from "../services/serializers.js";
import { USER_REF_FIELDS } from "../utils/serialize.js";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

function generateJoinCode() {
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

async function uniqueJoinCode() {
  for (let i = 0; i < 10; i++) {
    const code = generateJoinCode();
    if (!(await Team.exists({ joinCode: code }))) return code;
  }
  throw new Error("Could not generate a unique join code");
}

/** Membership is frozen once the final project has been submitted. */
async function assertMembershipOpen(teamId) {
  const project = await Project.findOne({ team: teamId }).select("status").lean();
  if (project && (project.status === "submitted" || project.status === "evaluated")) {
    throw ApiError.conflict("Team membership is locked after the final submission.");
  }
  return project;
}

function isDuplicateMembership(err) {
  return err?.code === 11000 && JSON.stringify(err.keyPattern || {}).includes("members");
}

async function serializeTeam(teamId, includeJoinCode) {
  const team = await Team.findById(teamId).populate("members", USER_REF_FIELDS).populate("department", "name code").lean();
  if (!team) throw ApiError.notFound("Team not found.");
  const project = await Project.findOne({ team: team._id }).select("title status").lean();
  return toTeamDTO(team, {
    includeJoinCode,
    project: project ? { id: project._id.toString(), title: project.title, status: project.status } : null,
  });
}

async function loadTeamForMember(teamId, userId) {
  const team = await Team.findById(teamId);
  if (!team) throw ApiError.notFound("Team not found.");
  if (!isTeamMember(team, userId)) throw ApiError.forbidden("Only members of this team can do that.");
  return team;
}

export const myTeam = asyncHandler(async (req, res) => {
  const team = await Team.findOne({ members: req.user.id }).select("_id").lean();
  ok(res, team ? await serializeTeam(team._id, true) : null);
});

export const createTeam = asyncHandler(async (req, res) => {
  const { name, department } = req.body;
  if (await Team.exists({ members: req.user.id })) throw ApiError.conflict("You are already a member of a team.");
  if (!(await Department.exists({ _id: department }))) throw ApiError.badRequest("Department not found.");

  let team;
  try {
    team = await Team.create({
      name,
      department,
      joinCode: await uniqueJoinCode(),
      members: [req.user.id],
      leader: req.user.id,
      maxMembers: env.teamMaxMembers,
    });
  } catch (err) {
    if (isDuplicateMembership(err)) throw ApiError.conflict("You are already a member of a team.");
    throw err;
  }
  await audit(req, { action: "team.create", summary: `Created team ${name}`, targetType: "Team", targetId: team._id });
  created(res, await serializeTeam(team._id, true), "Team created. Share the join code with your teammates.");
});

export const joinTeam = asyncHandler(async (req, res) => {
  const userId = new Types.ObjectId(req.user.id);
  if (await Team.exists({ members: userId })) throw ApiError.conflict("You are already a member of a team.");

  const team = await Team.findOne({ joinCode: req.body.joinCode });
  if (!team) throw ApiError.notFound("No team found with that join code.");
  if (team.members.length >= team.maxMembers) throw ApiError.conflict(`This team is full (${team.maxMembers} members max).`);
  await assertMembershipOpen(team._id);

  // Atomic capacity check: only push if the slot at index maxMembers-1 is free.
  let updated;
  try {
    updated = await Team.findOneAndUpdate(
      { _id: team._id, members: { $ne: userId }, [`members.${team.maxMembers - 1}`]: { $exists: false } },
      { $push: { members: userId } },
      { new: true }
    );
  } catch (err) {
    if (isDuplicateMembership(err)) throw ApiError.conflict("You are already a member of a team.");
    throw err;
  }
  if (!updated) throw ApiError.conflict("This team just filled up. Ask the team to check its size.");

  const project = await Project.findOne({ team: team._id }).select("_id").lean();
  await audit(req, { action: "team.join", summary: `Joined team ${team.name}`, targetType: "Team", targetId: team._id, project: project?._id });
  ok(res, await serializeTeam(team._id, true), { message: `Welcome to ${team.name}!` });
});

export const addMember = asyncHandler(async (req, res) => {
  const team = await loadTeamForMember(req.params.id, req.user.id);
  if (team.members.length >= team.maxMembers) throw ApiError.conflict(`This team is full (${team.maxMembers} members max).`);
  await assertMembershipOpen(team._id);

  const candidate = await User.findOne({ email: req.body.email, role: "student", isActive: true });
  if (!candidate) throw ApiError.notFound("No active student account uses that email.");
  if (await Team.exists({ members: candidate._id })) throw ApiError.conflict(`${candidate.name} is already on a team.`);

  let updated;
  try {
    updated = await Team.findOneAndUpdate(
      { _id: team._id, members: { $ne: candidate._id }, [`members.${team.maxMembers - 1}`]: { $exists: false } },
      { $push: { members: candidate._id } },
      { new: true }
    );
  } catch (err) {
    if (isDuplicateMembership(err)) throw ApiError.conflict(`${candidate.name} is already on a team.`);
    throw err;
  }
  if (!updated) throw ApiError.conflict("The team is full.");

  const project = await Project.findOne({ team: team._id }).select("_id").lean();
  await audit(req, {
    action: "team.add_member",
    summary: `Added ${candidate.name} to ${team.name}`,
    targetType: "Team",
    targetId: team._id,
    project: project?._id,
  });
  ok(res, await serializeTeam(team._id, true), { message: `${candidate.name} added to the team.` });
});

async function detachMember(teamId, userId) {
  const project = await Project.findOne({ team: teamId }).select("_id");
  if (project) {
    await Task.updateMany({ project: project._id, assignee: userId }, { $set: { assignee: null } });
    await recomputeProjectProgress(project._id);
  }
  return project;
}

export const removeMember = asyncHandler(async (req, res) => {
  const team = await loadTeamForMember(req.params.id, req.user.id);
  if (team.leader.toString() !== req.user.id) throw ApiError.forbidden("Only the team leader can remove members.");
  if (req.params.userId === req.user.id) throw ApiError.badRequest("Use 'Leave team' to remove yourself.");
  if (!isTeamMember(team, req.params.userId)) throw ApiError.notFound("That student is not on this team.");
  await assertMembershipOpen(team._id);

  await Team.updateOne({ _id: team._id }, { $pull: { members: new Types.ObjectId(req.params.userId) } });
  const project = await detachMember(team._id, req.params.userId);
  const removed = await User.findById(req.params.userId).select("name").lean();
  await audit(req, {
    action: "team.remove_member",
    summary: `Removed ${removed?.name ?? "a member"} from ${team.name}`,
    targetType: "Team",
    targetId: team._id,
    project: project?._id,
  });
  ok(res, await serializeTeam(team._id, true), { message: "Member removed." });
});

export const leaveTeam = asyncHandler(async (req, res) => {
  const team = await loadTeamForMember(req.params.id, req.user.id);
  const project = await assertMembershipOpen(team._id);

  if (team.members.length === 1) {
    if (project) throw ApiError.conflict("You are the last member and the team has a project. Ask an admin to remove the project first.");
    await team.deleteOne();
    await audit(req, { action: "team.delete", summary: `Left and closed team ${team.name}`, targetType: "Team", targetId: team._id });
    return ok(res, null, { message: "You left the team. It had no other members, so it was closed." });
  }

  const remaining = team.members.filter((m) => m.toString() !== req.user.id);
  const update = { $pull: { members: new Types.ObjectId(req.user.id) } };
  if (team.leader.toString() === req.user.id) update.$set = { leader: remaining[0] };
  await Team.updateOne({ _id: team._id }, update);
  await detachMember(team._id, req.user.id);
  await audit(req, { action: "team.leave", summary: `Left team ${team.name}`, targetType: "Team", targetId: team._id, project: project?._id });
  ok(res, null, { message: "You left the team." });
});

export const updateTeam = asyncHandler(async (req, res) => {
  const team = await loadTeamForMember(req.params.id, req.user.id);
  if (team.leader.toString() !== req.user.id) throw ApiError.forbidden("Only the team leader can rename the team.");
  team.name = req.body.name;
  await team.save();
  ok(res, await serializeTeam(team._id, true), { message: "Team renamed." });
});

export const regenerateCode = asyncHandler(async (req, res) => {
  const team = await loadTeamForMember(req.params.id, req.user.id);
  if (team.leader.toString() !== req.user.id) throw ApiError.forbidden("Only the team leader can change the join code.");
  team.joinCode = await uniqueJoinCode();
  await team.save();
  ok(res, await serializeTeam(team._id, true), { message: "New join code generated. The old one no longer works." });
});

export const getTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id).select("members").lean();
  if (!team) throw ApiError.notFound("Team not found.");
  const user = req.user;
  const isMember = isTeamMember(team, user.id);
  if (user.role === "student" && !isMember) throw ApiError.forbidden("You are not a member of this team.");
  if (user.role === "faculty") {
    const guides = await Project.exists({ team: team._id, faculty: user.id, status: { $ne: "draft" } });
    if (!guides) throw ApiError.forbidden("You do not guide this team.");
  }
  ok(res, await serializeTeam(team._id, isMember || user.role === "admin"));
});
