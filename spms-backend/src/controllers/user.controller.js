import { Types } from "mongoose";
import { User } from "../models/User.js";
import { Team } from "../models/Team.js";
import { Project } from "../models/Project.js";
import { Department } from "../models/Department.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created, paginate, searchRegex } from "../utils/http.js";
import { audit } from "../services/audit.js";
import { toUserDTO } from "../services/serializers.js";
import { generateTemporaryPassword, issueResetToken } from "../services/passwordReset.js";

async function loadUser(id) {
  const user = await User.findById(id).populate("department", "name code");
  if (!user) throw ApiError.notFound("User not found.");
  return user;
}

async function assertNotLastAdmin(userId) {
  const otherAdmins = await User.countDocuments({ role: "admin", isActive: true, _id: { $ne: userId } });
  if (otherAdmins === 0) throw ApiError.badRequest("This is the last active admin account; it cannot be demoted or deactivated.");
}

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, search, role, department, status } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (department) filter.department = department;
  if (status) filter.isActive = status === "active";
  if (search) {
    const rx = searchRegex(search);
    filter.$or = [{ name: rx }, { email: rx }, { usn: rx }];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .populate("department", "name code")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  ok(res, items.map(toUserDTO), { pagination: paginate(page, limit, total) });
});

// Admin-provisioned accounts ("invitation" style). If no password is given
// the server generates a temporary one that is shown once to the admin.
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, role, password, usn, department } = req.body;

  if (await User.exists({ email })) throw ApiError.conflict("A user with this email already exists.");
  if (usn && (await User.exists({ usn }))) throw ApiError.conflict("A user with this student ID already exists.");
  if (role === "student" && !usn) throw ApiError.badRequest("Student accounts need a student ID (USN).");
  if (role !== "admin" && !department) throw ApiError.badRequest("Students and faculty must belong to a department.");
  if (department && !(await Department.exists({ _id: department }))) throw ApiError.badRequest("Department not found.");

  const temporaryPassword = password ? null : generateTemporaryPassword();
  const user = new User({ name, email, role, usn: usn || undefined, department: department || null });
  await user.setPassword(password || temporaryPassword);
  await user.save();
  await user.populate("department", "name code");

  await audit(req, { action: "admin.create_user", summary: `Created ${role} account for ${email}`, targetType: "User", targetId: user._id, meta: { role } });
  created(
    res,
    { user: toUserDTO(user), temporaryPassword },
    temporaryPassword ? "Account created. Share the temporary password securely." : "Account created."
  );
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await loadUser(req.params.id);
  ok(res, { user: toUserDTO(user) });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await loadUser(req.params.id);
  const { name, usn, department, role } = req.body;
  const changes = {};

  if (role && role !== user.role) {
    if (user.id === req.user.id) throw ApiError.badRequest("You cannot change your own role.");
    if (user.role === "admin") await assertNotLastAdmin(user.id);
    if (user.role === "student" && (await Team.exists({ members: user._id }))) {
      throw ApiError.conflict("Remove this student from their team before changing their role.");
    }
    if (user.role === "faculty" && (await Project.exists({ faculty: user._id }))) {
      throw ApiError.conflict("Reassign this faculty member's projects before changing their role.");
    }
    changes.role = { from: user.role, to: role };
    user.role = role;
    user.tokenVersion += 1;
  }
  if (name !== undefined) user.name = name;
  if (usn !== undefined) {
    if (usn && (await User.exists({ usn, _id: { $ne: user._id } }))) throw ApiError.conflict("Another user already has this student ID.");
    user.usn = usn || undefined;
  }
  if (department !== undefined) {
    if (department && !(await Department.exists({ _id: department }))) throw ApiError.badRequest("Department not found.");
    user.department = department ? new Types.ObjectId(department) : null;
  }

  await user.save();
  await user.populate("department", "name code");
  await audit(req, {
    action: "admin.update_user",
    summary: `Updated account ${user.email}`,
    targetType: "User",
    targetId: user._id,
    meta: { fields: Object.keys(req.body), ...changes },
  });
  ok(res, { user: toUserDTO(user) }, { message: "User updated." });
});

// Accounts are deactivated rather than deleted so historical projects,
// evaluations and audit entries keep pointing at a real user.
export const deactivateUser = asyncHandler(async (req, res) => {
  const user = await loadUser(req.params.id);
  if (user.id === req.user.id) throw ApiError.badRequest("You cannot deactivate your own account.");
  if (user.role === "admin") await assertNotLastAdmin(user.id);

  user.isActive = false;
  user.tokenVersion += 1;
  await user.save();
  await audit(req, { action: "admin.deactivate_user", summary: `Deactivated ${user.email}`, targetType: "User", targetId: user._id });
  ok(res, { user: toUserDTO(user) }, { message: "User deactivated." });
});

export const reactivateUser = asyncHandler(async (req, res) => {
  const user = await loadUser(req.params.id);
  user.isActive = true;
  await user.save();
  await audit(req, { action: "admin.reactivate_user", summary: `Reactivated ${user.email}`, targetType: "User", targetId: user._id });
  ok(res, { user: toUserDTO(user) }, { message: "User reactivated." });
});

// Safe alternative to email-based reset when SMTP is not configured: the
// admin sets a temporary password and shares it through a trusted channel.
export const setTemporaryPassword = asyncHandler(async (req, res) => {
  const user = await loadUser(req.params.id);
  const temporaryPassword = req.body.newPassword || generateTemporaryPassword();
  await user.setPassword(temporaryPassword);
  user.tokenVersion += 1;
  await user.save();
  await audit(req, { action: "admin.reset_password", summary: `Set a temporary password for ${user.email}`, targetType: "User", targetId: user._id });
  ok(res, { temporaryPassword }, { message: "Password reset. Share it through a trusted channel; the user's sessions were signed out." });
});

/** Admin generates a one-time reset link (valid 60 minutes) to send to the user. */
export const createResetLink = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound("User not found.");
  if (!user.isActive) throw ApiError.badRequest("Reactivate this account before issuing a reset link.");
  const { link, expiresAt } = issueResetToken(user);
  await user.save();
  await audit(req, { action: "admin.reset_link", summary: `Generated a password reset link for ${user.email}`, targetType: "User", targetId: user._id });
  ok(res, { link, expiresAt: expiresAt.toISOString() }, { message: "Reset link generated." });
});

/** Directory of active faculty for pickers (any signed-in user). */
export const facultyDirectory = asyncHandler(async (req, res) => {
  const filter = { role: "faculty", isActive: true };
  if (typeof req.query.department === "string" && Types.ObjectId.isValid(req.query.department)) {
    filter.department = req.query.department;
  }
  const faculty = await User.find(filter).select("name email role department").populate("department", "name code").sort({ name: 1 }).limit(300).lean();
  ok(res, faculty.map(toUserDTO));
});

export const facultyWorkload = asyncHandler(async (_req, res) => {
  const faculty = await User.find({ role: "faculty", isActive: true }).populate("department", "name code").sort({ name: 1 }).lean();
  const stats = await Project.aggregate([
    {
      $group: {
        _id: "$faculty",
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $in: ["$status", ["pending_review", "approved", "in_progress", "submitted"]] }, 1, 0] } },
        avg: { $avg: "$progress" },
      },
    },
  ]);
  const byId = new Map(stats.map((s) => [s._id.toString(), s]));
  const rows = faculty.map((f) => {
    const s = byId.get(f._id.toString());
    return { faculty: toUserDTO(f), projectCount: s?.total ?? 0, activeCount: s?.active ?? 0, averageProgress: Math.round(s?.avg ?? 0) };
  });
  ok(res, rows);
});
