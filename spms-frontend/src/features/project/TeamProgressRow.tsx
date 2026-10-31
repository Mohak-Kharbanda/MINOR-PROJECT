import { Link } from "react-router";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowUpRight, UserRound } from "lucide-react";
import type { TeamProgressRow as Row } from "@edutrack/shared/types";
import { AvatarStack } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/Progress";
import { dueLabel } from "@/lib/format";
import { cn } from "@/lib/cn";

/** One team with its project and an animated progress bar. Used by faculty and admin views. */
export function TeamProgressRow({ row, index = 0, rank, showFaculty, compact }: { row: Row; index?: number; rank?: number; showFaculty?: boolean; compact?: boolean }) {
  const { team, project, progress, taskStats } = row;
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 10) * 0.04, type: "spring", stiffness: 260, damping: 26 }}
      className={cn("group grid items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-all", !compact && "sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] sm:p-5", project && "hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-lift")}
    >
      <div className="flex min-w-0 items-center gap-4">
        {rank !== undefined && (
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold", rank <= 3 ? "bg-brand-soft text-brand" : "bg-surface-2 text-ink-faint")}>{rank}</span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{team.name}</p>
            {project ? <StatusBadge status={project.status} /> : <span className="chip">No project yet</span>}
            {taskStats.overdue > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">
                <AlertTriangle className="h-3 w-3" /> {taskStats.overdue} overdue
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-ink-muted">{project?.title ?? `${team.department?.name ?? "Team"} · waiting for a proposal`}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-faint">
            <span className="flex items-center gap-2">
              <AvatarStack names={team.members.map((m) => m.name)} />
              {team.memberCount} member{team.memberCount === 1 ? "" : "s"}
            </span>
            {showFaculty && project?.faculty && (
              <span className="flex items-center gap-1">
                <UserRound className="h-3.5 w-3.5" /> {project.faculty.name}
              </span>
            )}
            {project?.deadline && !["submitted", "evaluated"].includes(project.status) && <span>{dueLabel(project.deadline)}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <ProgressBar value={progress} label={`${taskStats.done}/${taskStats.total} tasks done`} />
        </div>
        {project && <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-faint transition group-hover:text-brand" />}
      </div>
    </motion.div>
  );
  return project ? (
    <Link to={`/app/projects/${project.id}`} className="block rounded-2xl">
      {content}
    </Link>
  ) : (
    content
  );
}
