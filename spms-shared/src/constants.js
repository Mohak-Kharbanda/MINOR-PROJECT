// Domain constants shared by the API and the web app. Keeping them in one
// place means a status added here shows up in validation, the database
// enum, and the UI labels at the same time.

export const ROLES = ["student", "faculty", "admin"];

export const PROJECT_STATUSES = ["draft", "pending_review", "approved", "rejected", "in_progress", "submitted", "evaluated"];

export const PROJECT_STATUS_LABELS = {
  draft: "Draft",
  pending_review: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  in_progress: "In Progress",
  submitted: "Submitted",
  evaluated: "Evaluated",
};

/** The happy-path order, used for the status timeline in the UI. */
export const PROJECT_LIFECYCLE = ["draft", "pending_review", "approved", "in_progress", "submitted", "evaluated"];

/** States in which the team may still edit the proposal itself. */
export const EDITABLE_PROPOSAL_STATUSES = ["draft", "pending_review", "rejected"];

/** States in which the team is actively building (tasks + files open). */
export const ACTIVE_WORK_STATUSES = ["approved", "in_progress"];

export const TASK_STATUSES = ["todo", "in_progress", "review", "done"];

export const TASK_STATUS_LABELS = {
  todo: "To do",
  in_progress: "In progress",
  review: "In review",
  done: "Done",
};

export const TASK_PRIORITIES = ["low", "medium", "high"];

export const FILE_KINDS = ["project_file", "final_submission"];

export const FILE_KIND_LABELS = {
  project_file: "Project file",
  final_submission: "Final submission",
};

export const FILE_REVIEW_STATUSES = ["pending", "needs_revision", "accepted"];

export const FILE_REVIEW_LABELS = {
  pending: "Awaiting review",
  needs_revision: "Needs revision",
  accepted: "Accepted",
};

export const FEEDBACK_KINDS = ["proposal", "progress", "submission", "general"];

export const MAX_FILE_SIZE_MB = 25;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/** Extension -> accepted MIME types. Both must match for an upload to pass. */
export const ALLOWED_FILE_TYPES = {
  pdf: ["application/pdf"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ppt: ["application/vnd.ms-powerpoint"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  xls: ["application/vnd.ms-excel"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  csv: ["text/csv", "application/vnd.ms-excel", "text/plain"],
  txt: ["text/plain"],
  md: ["text/markdown", "text/plain", "text/x-markdown"],
  zip: ["application/zip", "application/x-zip-compressed", "application/x-zip"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  webp: ["image/webp"],
  gif: ["image/gif"],
};

export const ALLOWED_EXTENSIONS = Object.keys(ALLOWED_FILE_TYPES);

export const DEFAULT_TEAM_MAX_MEMBERS = 5;
export const MARKS_MAX = 100;
