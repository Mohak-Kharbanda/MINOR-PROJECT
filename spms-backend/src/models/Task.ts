import mongoose, { Schema, Types } from "mongoose";
import { TASK_PRIORITIES, TASK_STATUSES, type TaskPriority, type TaskStatus } from "@edutrack/shared";

export interface ITask {
  _id: Types.ObjectId;
  project: Types.ObjectId;
  title: string;
  description: string;
  assignee: Types.ObjectId | null;
  dueDate: Date | null;
  status: TaskStatus;
  priority: TaskPriority;
  createdBy: Types.ObjectId;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: "", maxlength: 2000 },
    assignee: { type: Schema.Types.ObjectId, ref: "User", default: null },
    dueDate: { type: Date, default: null },
    status: { type: String, enum: TASK_STATUSES, default: "todo" },
    priority: { type: String, enum: TASK_PRIORITIES, default: "medium" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ project: 1, dueDate: 1 });
taskSchema.index({ assignee: 1, status: 1, dueDate: 1 });

export const Task = mongoose.model<ITask>("Task", taskSchema);
