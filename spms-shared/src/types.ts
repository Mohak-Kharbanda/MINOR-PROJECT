// Response shapes returned by the API. Dates arrive as ISO strings over JSON.
import type {
  FeedbackKind,
  FileKind,
  FileReviewStatus,
  ProjectStatus,
  Role,
  TaskPriority,
  TaskStatus,
} from "./constants";
import type { TaskStats } from "./progress";

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
  pagination?: Pagination;
}

export interface ApiFailure {
  success: false;
  message: string;
  details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
}

export interface DepartmentRef {
  id: string;
  name: string;
  code: string;
}

export interface DepartmentDTO extends DepartmentRef {
  description?: string;
  userCount?: number;
  teamCount?: number;
  projectCount?: number;
  createdAt: string;
}

export interface UserRef {
  id: string;
  name: string;
  email: string;
  role?: Role;
  usn?: string;
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: Role;
  usn?: string;
  department?: DepartmentRef | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface PublicConfig {
  appName: string;
  allowStudentSignup: boolean;
  emailConfigured: boolean;
  storageDriver: "cloudinary" | "s3" | "local";
  maxFileSizeMb: number;
  allowedExtensions: string[];
  teamMaxMembers: number;
  demoMode: boolean;
}

export interface AuthPayload {
  accessToken: string;
  user: UserDTO;
}

export interface TeamDTO {
  id: string;
  name: string;
  joinCode?: string;
  department: DepartmentRef | null;
  members: UserRef[];
  leader: string;
  maxMembers: number;
  createdAt: string;
  project?: { id: string; title: string; status: ProjectStatus } | null;
}

export interface FeedbackEntry {
  id: string;
  author: UserRef | null;
  authorRole: Role;
  message: string;
  kind: FeedbackKind;
  createdAt: string;
}

export interface ReviewEntry {
  id: string;
  decision: "approved" | "rejected" | "returned";
  message: string;
  by: UserRef | null;
  at: string;
}

export interface EvaluationDTO {
  marks: number;
  maxMarks: number;
  notes: string;
  evaluatedBy: UserRef | null;
  evaluatedAt: string;
}

export interface SubmissionDTO {
  submittedAt: string;
  submittedBy: UserRef | null;
  note: string;
}

export interface ProjectDTO {
  id: string;
  title: string;
  description: string;
  objectives: string;
  techStack: string[];
  department: DepartmentRef | null;
  academicTerm: string;
  team: { id: string; name: string; members: UserRef[]; leader?: string } | null;
  faculty: UserRef | null;
  status: ProjectStatus;
  deadline: string | null;
  taskStats: TaskStats;
  progress: number;
  proposalSubmittedAt: string | null;
  submission: SubmissionDTO | null;
  evaluation: EvaluationDTO | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectPermissions {
  canEditProposal: boolean;
  canSubmitProposal: boolean;
  canReview: boolean;
  canGiveFeedback: boolean;
  canManageTasks: boolean;
  canUpload: boolean;
  canUploadFinal: boolean;
  canSubmitFinal: boolean;
  canReturnSubmission: boolean;
  canEvaluate: boolean;
  canReviewFiles: boolean;
  canAssignFaculty: boolean;
  canDelete: boolean;
}

export interface ProjectDetailDTO extends ProjectDTO {
  feedback: FeedbackEntry[];
  reviews: ReviewEntry[];
  permissions: ProjectPermissions;
  viewerRole: Role;
}

export interface TaskDTO {
  id: string;
  project: string;
  title: string;
  description: string;
  assignee: UserRef | null;
  dueDate: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  isOverdue: boolean;
  createdBy: UserRef | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FileCommentDTO {
  id: string;
  author: UserRef | null;
  authorRole: Role;
  message: string;
  createdAt: string;
}

export interface FileVersionDTO {
  id: string;
  project: string;
  lineageKey: string;
  version: number;
  originalName: string;
  mimeType: string;
  size: number;
  kind: FileKind;
  note: string;
  uploadedBy: UserRef | null;
  uploaderRole: Role;
  reviewStatus: FileReviewStatus;
  reviewedBy: UserRef | null;
  reviewedAt: string | null;
  comments: FileCommentDTO[];
  isLatest: boolean;
  createdAt: string;
}

export interface FileLineageDTO extends FileVersionDTO {
  versionCount: number;
  commentCount: number;
}

export interface SignedUrlDTO {
  url: string;
  expiresAt: string;
}

export interface ActivityDTO {
  id: string;
  actor: UserRef | null;
  actorRole: Role | null;
  action: string;
  summary: string;
  targetType: string;
  targetId: string | null;
  project: { id: string; title: string } | null;
  createdAt: string;
}

export interface TeamProgressRow {
  team: {
    id: string;
    name: string;
    department: DepartmentRef | null;
    members: UserRef[];
    memberCount: number;
  };
  project: {
    id: string;
    title: string;
    status: ProjectStatus;
    deadline: string | null;
    faculty: UserRef | null;
  } | null;
  progress: number;
  taskStats: TaskStats;
}

export interface MemberProgress {
  user: UserRef;
  assigned: number;
  done: number;
  overdue: number;
  progress: number;
}

export interface DeadlineItem {
  type: "task" | "project";
  id: string;
  title: string;
  dueDate: string;
  project: { id: string; title: string };
  assignee?: UserRef | null;
  status: string;
  isOverdue: boolean;
}

export interface StudentDashboardDTO {
  role: "student";
  team: TeamDTO | null;
  project: ProjectDTO | null;
  myTasks: TaskDTO[];
  memberProgress: MemberProgress[];
  deadlines: DeadlineItem[];
  activity: ActivityDTO[];
  counts: { myOpenTasks: number; myOverdue: number; files: number; daysToDeadline: number | null };
}

export interface FacultyDashboardDTO {
  role: "faculty";
  counts: {
    assigned: number;
    pendingReview: number;
    active: number;
    submitted: number;
    evaluated: number;
    averageProgress: number;
  };
  teams: TeamProgressRow[];
  pendingReview: ProjectDTO[];
  awaitingEvaluation: ProjectDTO[];
  deadlines: DeadlineItem[];
  activity: ActivityDTO[];
}

export interface AdminDashboardDTO {
  role: "admin";
  counts: {
    students: number;
    faculty: number;
    admins: number;
    departments: number;
    teams: number;
    projects: number;
    averageProgress: number;
    overdueTasks: number;
  };
  statusCounts: Partial<Record<ProjectStatus, number>>;
  topTeams: TeamProgressRow[];
  atRisk: TeamProgressRow[];
  activity: ActivityDTO[];
}

export type DashboardDTO = StudentDashboardDTO | FacultyDashboardDTO | AdminDashboardDTO;

export interface FacultyWorkloadRow {
  faculty: UserDTO;
  projectCount: number;
  activeCount: number;
  averageProgress: number;
}
