// Request schemas. The API validates every body/query against these, and the
// web app uses the inferred types for its payloads, so the two cannot drift.
import { z } from "zod";
import {
  FEEDBACK_KINDS,
  FILE_KINDS,
  FILE_REVIEW_STATUSES,
  MARKS_MAX,
  PROJECT_STATUSES,
  ROLES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "./constants";

export const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid identifier.");

const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(160);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(100, "Password must be at most 100 characters.")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Password must contain at least one letter and one number.");

const dateString = z
  .string()
  .trim()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date.");

const optionalDate = z.union([dateString, z.literal(""), z.null()]).optional();

const pageQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

// ---------- Auth ----------

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(120),
  email,
  password: passwordSchema,
  usn: z.string().trim().min(2, "Student ID is required.").max(40),
  department: objectId,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required.").max(100),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: passwordSchema,
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(20).max(200),
  newPassword: passwordSchema,
});

// ---------- Departments ----------

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z
    .string()
    .trim()
    .min(2)
    .max(10)
    .regex(/^[A-Za-z0-9-]+$/, "Code may only contain letters, numbers and dashes."),
  description: z.string().trim().max(500).optional(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

// ---------- Users (admin) ----------

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email,
  role: z.enum(ROLES),
  // Leave blank to have the server generate a temporary password.
  password: z.union([passwordSchema, z.literal("")]).optional(),
  usn: z.string().trim().max(40).optional(),
  department: objectId.optional().or(z.literal("")),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  usn: z.string().trim().max(40).optional(),
  department: objectId.nullable().optional().or(z.literal("")),
  role: z.enum(ROLES).optional(),
});

export const adminSetPasswordSchema = z.object({
  newPassword: z.union([passwordSchema, z.literal("")]).optional(),
});

export const listUsersQuerySchema = z.object({
  ...pageQuery,
  search: z.string().trim().max(120).optional(),
  role: z.enum(ROLES).optional(),
  department: objectId.optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

// ---------- Teams ----------

export const createTeamSchema = z.object({
  name: z.string().trim().min(2, "Team name must be at least 2 characters.").max(80),
  department: objectId,
});

export const updateTeamSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const joinTeamSchema = z.object({
  joinCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6}$/, "Join codes are 6 letters or numbers."),
});

export const addMemberSchema = z.object({ email });

// ---------- Projects ----------

const techStack = z.array(z.string().trim().min(1).max(30)).max(12).default([]);

export const createProjectSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(160),
  description: z.string().trim().min(20, "Describe the project in at least 20 characters.").max(5000),
  objectives: z.string().trim().max(3000).optional().default(""),
  techStack,
  department: objectId,
  academicTerm: z.string().trim().min(2).max(40),
  faculty: objectId,
  deadline: optionalDate,
  submitForReview: z.boolean().optional().default(true),
});

export const updateProjectSchema = z.object({
  title: z.string().trim().min(3).max(160).optional(),
  description: z.string().trim().min(20).max(5000).optional(),
  objectives: z.string().trim().max(3000).optional(),
  techStack: z.array(z.string().trim().min(1).max(30)).max(12).optional(),
  academicTerm: z.string().trim().min(2).max(40).optional(),
  deadline: optionalDate,
  faculty: objectId.optional(),
});

export const reviewProjectSchema = z
  .object({
    decision: z.enum(["approved", "rejected"]),
    message: z.string().trim().max(2000).optional().default(""),
  })
  .refine((v) => v.decision === "approved" || v.message.length >= 5, {
    message: "Explain why the proposal is rejected (at least 5 characters).",
    path: ["message"],
  });

export const feedbackSchema = z.object({
  message: z.string().trim().min(1, "Feedback cannot be empty.").max(2000),
  kind: z.enum(FEEDBACK_KINDS).optional().default("general"),
});

export const submitProjectSchema = z.object({
  note: z.string().trim().max(2000).optional().default(""),
});

export const returnSubmissionSchema = z.object({
  message: z.string().trim().min(5, "Tell the team what to change (at least 5 characters).").max(2000),
});

export const evaluateProjectSchema = z.object({
  marks: z.coerce.number().min(0).max(MARKS_MAX),
  notes: z.string().trim().max(3000).optional().default(""),
});

export const assignFacultySchema = z.object({ faculty: objectId });

export const listProjectsQuerySchema = z.object({
  ...pageQuery,
  status: z.enum(PROJECT_STATUSES).optional(),
  department: objectId.optional(),
  faculty: objectId.optional(),
  term: z.string().trim().max(40).optional(),
  search: z.string().trim().max(120).optional(),
  sort: z.enum(["recent", "progress", "deadline", "title"]).optional().default("recent"),
});

// ---------- Tasks ----------

export const createTaskSchema = z.object({
  title: z.string().trim().min(2, "Task title must be at least 2 characters.").max(160),
  description: z.string().trim().max(2000).optional().default(""),
  assignee: objectId.nullable().optional().or(z.literal("")),
  dueDate: optionalDate,
  priority: z.enum(TASK_PRIORITIES).optional().default("medium"),
  status: z.enum(TASK_STATUSES).optional().default("todo"),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  assignee: objectId.nullable().optional().or(z.literal("")),
  dueDate: optionalDate,
  priority: z.enum(TASK_PRIORITIES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
});

export const listTasksQuerySchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  assignee: objectId.optional(),
  overdue: z.enum(["true", "false"]).optional(),
});

// ---------- Files ----------

export const uploadFileFieldsSchema = z.object({
  kind: z.enum(FILE_KINDS).optional().default("project_file"),
  lineageKey: z.string().uuid().optional().or(z.literal("")),
  note: z.string().trim().max(2000).optional().default(""),
});

export const fileCommentSchema = z.object({
  message: z.string().trim().min(1, "Comment cannot be empty.").max(2000),
});

export const fileReviewSchema = z.object({
  reviewStatus: z.enum(FILE_REVIEW_STATUSES),
  message: z.string().trim().max(2000).optional().default(""),
});

export const fileUrlQuerySchema = z.object({
  disposition: z.enum(["inline", "attachment"]).optional().default("attachment"),
});

export const listFilesQuerySchema = z.object({
  kind: z.enum(FILE_KINDS).optional(),
});

// ---------- Admin ----------

export const teamsProgressQuerySchema = z.object({
  ...pageQuery,
  search: z.string().trim().max(120).optional(),
  department: objectId.optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  sort: z.enum(["progress_desc", "progress_asc", "name", "recent"]).optional().default("progress_desc"),
});

export const auditQuerySchema = z.object({
  ...pageQuery,
  action: z.string().trim().max(80).optional(),
  targetType: z.string().trim().max(40).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type CreateProjectInput = z.input<typeof createProjectSchema>;
export type UpdateProjectInput = z.input<typeof updateProjectSchema>;
export type CreateTaskInput = z.input<typeof createTaskSchema>;
export type UpdateTaskInput = z.input<typeof updateTaskSchema>;
export type EvaluateProjectInput = z.input<typeof evaluateProjectSchema>;
