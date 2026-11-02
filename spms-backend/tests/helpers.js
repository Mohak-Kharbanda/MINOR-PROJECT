import request from "supertest";
import { createApp } from "../src/app.js";
import { User } from "../src/models/User.js";
import { Department } from "../src/models/Department.js";
import { Team } from "../src/models/Team.js";
import { Project } from "../src/models/Project.js";
import { Task } from "../src/models/Task.js";
import { signAccessToken } from "../src/utils/jwt.js";
import { recomputeProjectProgress } from "../src/services/progress.js";

export const app = createApp();
export const api = () => request(app);
export const PASSWORD = "Password123";

let counter = 0;

export async function makeDepartment(code = `D${++counter}`) {
  return Department.create({ name: `Department ${code}`, code });
}

export async function makeUser(role, overrides = {}) {
  counter += 1;
  const user = new User({
    name: `${role} ${counter}`,
    email: `${role}${counter}@test.local`,
    role,
    usn: role === "student" ? `USN${counter}` : undefined,
    ...overrides,
  });
  await user.setPassword(PASSWORD);
  await user.save();
  const token = signAccessToken({ sub: user.id, role: user.role, tv: user.tokenVersion });
  return { user, token, auth: { Authorization: `Bearer ${token}` } };
}

export async function makeTeam(members, departmentId, maxMembers = 4) {
  counter += 1;
  return Team.create({
    name: `Team ${counter}`,
    joinCode: `T${String(counter).padStart(5, "0")}`.slice(0, 6).toUpperCase(),
    department: departmentId,
    members: members.map((m) => m._id),
    leader: members[0]._id,
    maxMembers,
  });
}

export async function makeProject(opts) {
  return Project.create({
    title: "Test Project",
    description: "A sufficiently long description for the test project.",
    department: opts.departmentId,
    academicTerm: "2026 Odd",
    team: opts.team._id,
    faculty: opts.faculty._id,
    status: opts.status ?? "pending_review",
    createdBy: opts.createdBy._id,
  });
}

/** A complete scenario: department, faculty guide, two-student team, project. */
export async function scenario(status = "in_progress") {
  const dept = await makeDepartment();
  const faculty = await makeUser("faculty", { department: dept._id });
  const otherFaculty = await makeUser("faculty", { department: dept._id });
  const s1 = await makeUser("student", { department: dept._id });
  const s2 = await makeUser("student", { department: dept._id });
  const outsider = await makeUser("student", { department: dept._id });
  const admin = await makeUser("admin");
  const team = await makeTeam([s1.user, s2.user], dept._id);
  const project = await makeProject({ team, faculty: faculty.user, departmentId: dept._id, createdBy: s1.user, status });
  return { dept, faculty, otherFaculty, s1, s2, outsider, admin, team, project };
}

export async function addTask(projectId, createdBy, data = {}) {
  const task = await Task.create({ project: projectId, title: "Task", createdBy, ...data });
  await recomputeProjectProgress(projectId);
  return task;
}

export const XHR = { "X-Requested-With": "XMLHttpRequest" };
