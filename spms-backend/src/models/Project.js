import mongoose, { Schema } from "mongoose";
import { FEEDBACK_KINDS, PROJECT_STATUSES, ROLES } from "@edutrack/shared";

const feedbackSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorRole: { type: String, enum: ROLES, required: true },
    message: { type: String, required: true, maxlength: 2000 },
    kind: { type: String, enum: FEEDBACK_KINDS, default: "general" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const reviewSchema = new Schema(
  {
    decision: { type: String, enum: ["approved", "rejected", "returned"], required: true },
    message: { type: String, default: "", maxlength: 2000 },
    by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: true }
);

const taskStatsSchema = new Schema(
  {
    total: { type: Number, default: 0 },
    todo: { type: Number, default: 0 },
    inProgress: { type: Number, default: 0 },
    review: { type: Number, default: 0 },
    done: { type: Number, default: 0 },
    overdue: { type: Number, default: 0 },
  },
  { _id: false }
);

const projectSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, maxlength: 5000 },
    objectives: { type: String, default: "", maxlength: 3000 },
    techStack: { type: [String], default: [] },
    department: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    academicTerm: { type: String, required: true, trim: true, maxlength: 40 },
    // One project per team; a rejected proposal is revised and resubmitted.
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true, unique: true },
    faculty: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: PROJECT_STATUSES, default: "draft" },
    deadline: { type: Date, default: null },
    // Denormalized from the task collection (see services/progress.js) so
    // progress lists can be sorted and paginated in the database.
    taskStats: { type: taskStatsSchema, default: () => ({}) },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    feedback: [feedbackSchema],
    reviews: [reviewSchema],
    proposalSubmittedAt: { type: Date, default: null },
    submission: {
      type: new Schema(
        {
          submittedAt: { type: Date, required: true },
          submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
          note: { type: String, default: "", maxlength: 2000 },
        },
        { _id: false }
      ),
      default: null,
    },
    evaluation: {
      type: new Schema(
        {
          marks: { type: Number, required: true, min: 0, max: 100 },
          maxMarks: { type: Number, default: 100 },
          notes: { type: String, default: "", maxlength: 3000 },
          evaluatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
          evaluatedAt: { type: Date, required: true },
        },
        { _id: false }
      ),
      default: null,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

projectSchema.index({ faculty: 1, status: 1 });
projectSchema.index({ department: 1, status: 1 });
projectSchema.index({ status: 1, updatedAt: -1 });
projectSchema.index({ progress: -1 });

export const Project = mongoose.model("Project", projectSchema);
