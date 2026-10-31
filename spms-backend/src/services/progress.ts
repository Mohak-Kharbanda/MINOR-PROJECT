import { Types } from "mongoose";
import { computeTaskStats, progressFromStats } from "@edutrack/shared";
import { Task } from "../models/Task";
import { Project } from "../models/Project";

/**
 * Recomputes the denormalized task statistics + progress percentage on a
 * project. Called after every task create/update/delete so dashboards can
 * sort and page by progress without scanning the task collection.
 */
export async function recomputeProjectProgress(projectId: Types.ObjectId | string) {
  const tasks = await Task.find({ project: projectId }).select("status dueDate").lean();
  const taskStats = computeTaskStats(tasks);
  const progress = progressFromStats(taskStats);
  await Project.updateOne({ _id: projectId }, { $set: { taskStats, progress } });
  return { taskStats, progress };
}

/**
 * Overdue counts depend on the clock, not just on task edits, so lists that
 * show them refresh the overdue figure from the tasks collection in one
 * aggregation instead of trusting the cached value.
 */
export async function overdueCounts(projectIds: Types.ObjectId[]): Promise<Map<string, number>> {
  if (!projectIds.length) return new Map();
  const rows = await Task.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { project: { $in: projectIds }, status: { $ne: "done" }, dueDate: { $ne: null, $lt: new Date() } } },
    { $group: { _id: "$project", count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id.toString(), r.count]));
}
