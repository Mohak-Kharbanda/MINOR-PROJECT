import { Link } from "react-router";
import { motion } from "framer-motion";
import { CalendarClock, UserRound } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { AvatarStack } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/Progress";
import { dueLabel } from "@/lib/format";

export function ProjectCard({ project, index = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 8) * 0.05 }}>
      <Link to={`/app/projects/${project.id}`} className="card card-hover flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <StatusBadge status={project.status} />
          {project.evaluation && <span className="font-mono text-sm font-semibold text-success">{project.evaluation.marks}/100</span>}
        </div>
        <h3 className="mt-3 line-clamp-2 text-lg font-semibold leading-snug">{project.title}</h3>
        <p className="mt-1 text-sm text-ink-muted">
          {project.team?.name} · {project.department?.code} · {project.academicTerm}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-faint">
          {project.team && <AvatarStack names={project.team.members.map((m) => m.name)} />}
          {project.faculty && (
            <span className="flex items-center gap-1">
              <UserRound className="h-3.5 w-3.5" /> {project.faculty.name}
            </span>
          )}
          {project.deadline && (
            <span className="flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" /> {dueLabel(project.deadline, ["submitted", "evaluated"].includes(project.status))}
            </span>
          )}
        </div>
        <div className="mt-auto pt-5">
          <ProgressBar value={project.progress} size="sm" label={`${project.taskStats.done}/${project.taskStats.total} tasks`} />
        </div>
      </Link>
    </motion.div>
  );
}
