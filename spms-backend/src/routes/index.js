import { Router } from "express";
import {
  addMemberSchema,
  adminSetPasswordSchema,
  assignFacultySchema,
  auditQuerySchema,
  changePasswordSchema,
  createDepartmentSchema,
  createProjectSchema,
  createTaskSchema,
  createTeamSchema,
  createUserSchema,
  evaluateProjectSchema,
  feedbackSchema,
  fileCommentSchema,
  fileReviewSchema,
  fileUrlQuerySchema,
  forgotPasswordSchema,
  joinTeamSchema,
  listFilesQuerySchema,
  listProjectsQuerySchema,
  listTasksQuerySchema,
  listUsersQuerySchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  returnSubmissionSchema,
  reviewProjectSchema,
  submitProjectSchema,
  teamsProgressQuerySchema,
  updateDepartmentSchema,
  updateProfileSchema,
  updateProjectSchema,
  updateTaskSchema,
  updateTeamSchema,
  updateUserSchema,
  uploadFileFieldsSchema,
} from "@edutrack/shared";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validate, validateIds } from "../middleware/validate.js";
import { authLimiter, refreshLimiter } from "../middleware/rateLimit.js";
import { upload } from "../middleware/upload.js";
import { ApiError } from "../utils/ApiError.js";
import * as auth from "../controllers/auth.controller.js";
import * as meta from "../controllers/meta.controller.js";
import * as users from "../controllers/user.controller.js";
import * as departments from "../controllers/department.controller.js";
import * as teams from "../controllers/team.controller.js";
import * as projects from "../controllers/project.controller.js";
import * as tasks from "../controllers/task.controller.js";
import * as files from "../controllers/file.controller.js";
import * as progress from "../controllers/progress.controller.js";
import * as dashboard from "../controllers/dashboard.controller.js";
import * as auditLog from "../controllers/audit.controller.js";

/**
 * Cookie-authenticated endpoints (refresh/logout) require a custom header.
 * Browsers cannot attach custom headers to cross-site requests without a
 * CORS preflight, which our CORS policy only allows for trusted origins.
 */
function requireXhrHeader(req, _res, next) {
  if (req.get("X-Requested-With") !== "XMLHttpRequest") {
    return next(ApiError.forbidden("Missing X-Requested-With header."));
  }
  next();
}

const router = Router();

// ---------- Public ----------
router.get("/health", meta.health);
router.get("/meta", meta.publicConfig);
router.get("/storage/local/:token", files.localDownload);
router.get("/departments/public", departments.listPublic);

// ---------- Auth ----------
router.post("/auth/register", authLimiter, validate(registerSchema), auth.register);
router.post("/auth/login", authLimiter, validate(loginSchema), auth.login);
router.post("/auth/refresh", refreshLimiter, requireXhrHeader, auth.refresh);
router.post("/auth/logout", requireXhrHeader, auth.logout);
router.post("/auth/forgot-password", authLimiter, validate(forgotPasswordSchema), auth.forgotPassword);
router.post("/auth/reset-password", authLimiter, validate(resetPasswordSchema), auth.resetPassword);
router.get("/auth/me", authenticate, auth.me);
router.patch("/auth/me", authenticate, validate(updateProfileSchema), auth.updateProfile);
router.post("/auth/change-password", authenticate, authLimiter, validate(changePasswordSchema), auth.changePassword);
router.post("/auth/logout-all", authenticate, auth.logoutAll);

// Everything below requires a signed-in user.
router.use(authenticate);

router.get("/dashboard", dashboard.dashboard);

// ---------- Departments ----------
router.get("/departments", departments.list);
router.post("/departments", requireRole("admin"), validate(createDepartmentSchema), departments.create);
router.patch("/departments/:id", requireRole("admin"), validateIds("id"), validate(updateDepartmentSchema), departments.update);
router.delete("/departments/:id", requireRole("admin"), validateIds("id"), departments.remove);

// ---------- Users ----------
router.get("/users/faculty", users.facultyDirectory);
router.get("/users/faculty-workload", requireRole("admin"), users.facultyWorkload);
router.get("/users", requireRole("admin"), validate(listUsersQuerySchema, "query"), users.listUsers);
router.post("/users", requireRole("admin"), validate(createUserSchema), users.createUser);
router.get("/users/:id", requireRole("admin"), validateIds("id"), users.getUser);
router.patch("/users/:id", requireRole("admin"), validateIds("id"), validate(updateUserSchema), users.updateUser);
router.post("/users/:id/deactivate", requireRole("admin"), validateIds("id"), users.deactivateUser);
router.post("/users/:id/reactivate", requireRole("admin"), validateIds("id"), users.reactivateUser);
router.post("/users/:id/temporary-password", requireRole("admin"), validateIds("id"), validate(adminSetPasswordSchema), users.setTemporaryPassword);
router.post("/users/:id/reset-link", requireRole("admin"), validateIds("id"), users.createResetLink);

// ---------- Teams ----------
router.get("/teams/mine", requireRole("student"), teams.myTeam);
router.get("/teams/progress", requireRole("faculty", "admin"), validate(teamsProgressQuerySchema, "query"), progress.teamsProgress);
router.post("/teams", requireRole("student"), validate(createTeamSchema), teams.createTeam);
router.post("/teams/join", requireRole("student"), validate(joinTeamSchema), teams.joinTeam);
router.get("/teams/:id", validateIds("id"), teams.getTeam);
router.patch("/teams/:id", requireRole("student"), validateIds("id"), validate(updateTeamSchema), teams.updateTeam);
router.post("/teams/:id/members", requireRole("student"), validateIds("id"), validate(addMemberSchema), teams.addMember);
router.delete("/teams/:id/members/:userId", requireRole("student"), validateIds("id", "userId"), teams.removeMember);
router.post("/teams/:id/leave", requireRole("student"), validateIds("id"), teams.leaveTeam);
router.post("/teams/:id/join-code", requireRole("student"), validateIds("id"), teams.regenerateCode);

// ---------- Projects ----------
router.get("/projects", validate(listProjectsQuerySchema, "query"), projects.listProjects);
router.post("/projects", requireRole("student"), validate(createProjectSchema), projects.createProject);

const project = Router({ mergeParams: true });
router.use("/projects/:projectId", validateIds("projectId"), project);

project.get("/", projects.getProject);
project.patch("/", validate(updateProjectSchema), projects.updateProject);
project.delete("/", requireRole("admin"), projects.deleteProject);
project.post("/submit-proposal", requireRole("student"), projects.submitProposal);
project.post("/review", requireRole("faculty"), validate(reviewProjectSchema), projects.reviewProject);
project.post("/feedback", validate(feedbackSchema), projects.addFeedback);
project.post("/submit", requireRole("student"), validate(submitProjectSchema), projects.submitFinal);
project.post("/return", requireRole("faculty"), validate(returnSubmissionSchema), projects.returnSubmission);
project.post("/evaluate", requireRole("faculty", "admin"), validate(evaluateProjectSchema), projects.evaluateProject);
project.patch("/faculty", requireRole("admin"), validate(assignFacultySchema), projects.assignFaculty);
project.get("/activity", projects.projectActivity);
project.get("/member-progress", projects.memberProgress);

// Tasks
project.get("/tasks", validate(listTasksQuerySchema, "query"), tasks.listTasks);
project.post("/tasks", requireRole("student"), validate(createTaskSchema), tasks.createTask);
project.patch("/tasks/:taskId", requireRole("student"), validateIds("taskId"), validate(updateTaskSchema), tasks.updateTask);
project.delete("/tasks/:taskId", requireRole("student"), validateIds("taskId"), tasks.deleteTask);

// Files
project.get("/files", validate(listFilesQuerySchema, "query"), files.listFiles);
project.get("/files/lineage/:lineageKey", files.lineageHistory);
project.post("/files", upload.single("file"), validate(uploadFileFieldsSchema), files.uploadFile);
project.post("/files/:fileId/comments", validateIds("fileId"), validate(fileCommentSchema), files.commentOnFile);
project.patch("/files/:fileId/review", requireRole("faculty", "admin"), validateIds("fileId"), validate(fileReviewSchema), files.reviewFile);
project.get("/files/:fileId/url", validateIds("fileId"), validate(fileUrlQuerySchema, "query"), files.fileUrl);
project.delete("/files/:fileId", validateIds("fileId"), files.deleteFile);

// ---------- Admin ----------
router.get("/admin/audit-logs", requireRole("admin"), validate(auditQuerySchema, "query"), auditLog.listAuditLogs);

export default router;
