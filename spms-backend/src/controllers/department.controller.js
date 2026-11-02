import { Department } from "../models/Department.js";
import { User } from "../models/User.js";
import { Team } from "../models/Team.js";
import { Project } from "../models/Project.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/http.js";
import { audit } from "../services/audit.js";

function toDTO(d, counts) {
  return {
    id: d._id.toString(),
    name: d.name,
    code: d.code,
    description: d.description || "",
    createdAt: new Date(d.createdAt).toISOString(),
    ...(counts ? { userCount: counts.users, teamCount: counts.teams, projectCount: counts.projects } : {}),
  };
}

async function countBy(model, field) {
  const rows = await model.aggregate([{ $match: { [field]: { $ne: null } } }, { $group: { _id: `$${field}`, n: { $sum: 1 } } }]);
  return new Map(rows.map((r) => [r._id?.toString(), r.n]));
}

// Unauthenticated: the registration form needs the department list.
export const listPublic = asyncHandler(async (_req, res) => {
  const departments = await Department.find().sort({ name: 1 }).lean();
  ok(
    res,
    departments.map((d) => toDTO(d))
  );
});

export const list = asyncHandler(async (req, res) => {
  const departments = await Department.find().sort({ name: 1 }).lean();
  if (req.user.role !== "admin")
    return ok(
      res,
      departments.map((d) => toDTO(d))
    );

  const [users, teams, projects] = await Promise.all([countBy(User, "department"), countBy(Team, "department"), countBy(Project, "department")]);
  ok(
    res,
    departments.map((d) => {
      const id = d._id.toString();
      return toDTO(d, { users: users.get(id) ?? 0, teams: teams.get(id) ?? 0, projects: projects.get(id) ?? 0 });
    })
  );
});

export const create = asyncHandler(async (req, res) => {
  const dept = await Department.create(req.body);
  await audit(req, {
    action: "admin.create_department",
    summary: `Created department ${dept.name} (${dept.code})`,
    targetType: "Department",
    targetId: dept._id,
  });
  created(res, toDTO(dept), "Department created.");
});

export const update = asyncHandler(async (req, res) => {
  const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!dept) throw ApiError.notFound("Department not found.");
  await audit(req, { action: "admin.update_department", summary: `Updated department ${dept.name}`, targetType: "Department", targetId: dept._id });
  ok(res, toDTO(dept), { message: "Department updated." });
});

export const remove = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const [users, teams, projects] = await Promise.all([
    User.countDocuments({ department: id }),
    Team.countDocuments({ department: id }),
    Project.countDocuments({ department: id }),
  ]);
  if (users || teams || projects) {
    throw ApiError.conflict(`This department is still in use (${users} users, ${teams} teams, ${projects} projects). Move them first.`);
  }
  const dept = await Department.findByIdAndDelete(id);
  if (!dept) throw ApiError.notFound("Department not found.");
  await audit(req, { action: "admin.delete_department", summary: `Deleted department ${dept.name}`, targetType: "Department", targetId: dept._id });
  ok(res, null, { message: "Department deleted." });
});
