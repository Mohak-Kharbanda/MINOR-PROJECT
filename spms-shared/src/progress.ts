import type { TaskStatus } from "./constants";

export interface TaskStats {
  total: number;
  todo: number;
  inProgress: number;
  review: number;
  done: number;
  overdue: number;
}

export const EMPTY_TASK_STATS: TaskStats = { total: 0, todo: 0, inProgress: 0, review: 0, done: 0, overdue: 0 };

/** Progress is the share of tasks marked done, as a whole percentage. */
export function progressFromStats(stats: Pick<TaskStats, "total" | "done">): number {
  if (!stats.total) return 0;
  return Math.round((stats.done / stats.total) * 100);
}

export function isTaskOverdue(dueDate: Date | string | null | undefined, status: TaskStatus, now = Date.now()): boolean {
  if (!dueDate || status === "done") return false;
  return new Date(dueDate).getTime() < now;
}

export function computeTaskStats(
  tasks: Array<{ status: TaskStatus; dueDate?: Date | string | null }>,
  now = Date.now()
): TaskStats {
  const stats: TaskStats = { ...EMPTY_TASK_STATS };
  for (const t of tasks) {
    stats.total += 1;
    if (t.status === "todo") stats.todo += 1;
    else if (t.status === "in_progress") stats.inProgress += 1;
    else if (t.status === "review") stats.review += 1;
    else if (t.status === "done") stats.done += 1;
    if (isTaskOverdue(t.dueDate, t.status, now)) stats.overdue += 1;
  }
  return stats;
}
