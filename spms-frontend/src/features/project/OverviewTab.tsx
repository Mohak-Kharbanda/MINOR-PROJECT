import { motion } from "framer-motion";
import { Check, CheckCircle2, Clock3, Crown, RotateCcw, Trophy, XCircle } from "lucide-react";
import { PROJECT_LIFECYCLE, PROJECT_STATUS_LABELS } from "@edutrack/shared/constants";
import type { ProjectDetailDTO } from "@edutrack/shared/types";
import { useMemberProgress } from "@/hooks/api";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/Progress";
import { Skeleton } from "@/components/ui/States";
import { formatDate, formatDateTime, formatDay, timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";

function Lifecycle({ project }: { project: ProjectDetailDTO }) {
  const rejected = project.status === "rejected";
  const currentIdx = rejected ? 1 : PROJECT_LIFECYCLE.indexOf(project.status);
  return (
    <div className="card p-6">
      <h3 className="mb-6 text-lg font-semibold">Project journey</h3>
      <ol className="relative grid grid-cols-6 gap-1">
        <div className="absolute left-[8%] right-[8%] top-[15px] h-0.5 bg-surface-3" aria-hidden />
        <motion.div
          className="absolute left-[8%] top-[15px] h-0.5 origin-left bg-gradient-to-r from-brand to-accent"
          initial={{ width: 0 }}
          animate={{ width: `${(Math.max(0, currentIdx) / (PROJECT_LIFECYCLE.length - 1)) * 84}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden
        />
        {PROJECT_LIFECYCLE.map((s, i) => {
          const done = i < currentIdx || project.status === "evaluated";
          const current = i === currentIdx && project.status !== "evaluated";
          const isRejectedStep = rejected && i === 1;
          return (
            <li key={s} className="relative flex flex-col items-center text-center">
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className={cn(
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold",
                  isRejectedStep ? "border-danger bg-danger text-white" : done ? "border-transparent bg-brand text-brand-ink" : current ? "border-brand bg-surface text-brand" : "border-line bg-surface text-ink-faint"
                )}
              >
                {isRejectedStep ? <XCircle className="h-4 w-4" /> : done ? <Check className="h-4 w-4" /> : i + 1}
                {current && <span className="absolute inset-0 animate-pulse-ring rounded-full border-2 border-brand" />}
              </motion.span>
              <span className={cn("mt-2 text-[11px] font-medium leading-tight sm:text-xs", current || isRejectedStep ? "text-ink" : "text-ink-faint")}>
                {isRejectedStep ? "Rejected" : PROJECT_STATUS_LABELS[s]}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function OverviewTab({ project }: { project: ProjectDetailDTO }) {
  const { data: members, isLoading } = useMemberProgress(project.id);
  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-6">
        <Lifecycle project={project} />

        {project.evaluation && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card relative overflow-hidden p-6">
            <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-success/20 blur-3xl" />
            <div className="relative flex flex-wrap items-center gap-6">
              <div className="flex h-24 w-24 flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-success to-[rgb(var(--lime))] text-black">
                <Trophy className="h-5 w-5" />
                <span className="font-display text-3xl font-bold leading-none">{project.evaluation.marks}</span>
                <span className="text-[11px] font-semibold">/ {project.evaluation.maxMarks}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold">Evaluation</h3>
                <p className="text-sm text-ink-faint">
                  By {project.evaluation.evaluatedBy?.name ?? "—"} · {formatDateTime(project.evaluation.evaluatedAt)}
                </p>
                {project.evaluation.notes && <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed">{project.evaluation.notes}</p>}
              </div>
            </div>
          </motion.div>
        )}

        <section className="card p-6">
          <h3 className="text-lg font-semibold">About this project</h3>
          <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-muted">{project.description}</p>
          {project.objectives && (
            <>
              <h4 className="mt-6 text-sm font-semibold uppercase tracking-wider text-ink-faint">Objectives</h4>
              <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed">{project.objectives}</p>
            </>
          )}
          {project.techStack.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {project.techStack.map((t) => (
                <span key={t} className="rounded-lg border border-brand/20 bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
                  {t}
                </span>
              ))}
            </div>
          )}
        </section>

        {project.reviews.length > 0 && (
          <section className="card p-6">
            <h3 className="mb-4 text-lg font-semibold">Review history</h3>
            <ol className="space-y-3">
              {[...project.reviews].reverse().map((r) => (
                <li key={r.id} className="flex gap-3 rounded-xl border border-line p-3">
                  {r.decision === "approved" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /> : r.decision === "returned" ? <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-warning" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />}
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold">{r.by?.name}</span>{" "}
                      <span className="text-ink-muted">{r.decision === "approved" ? "approved the proposal" : r.decision === "returned" ? "returned the submission" : "rejected the proposal"}</span>
                      <span className="text-ink-faint"> · {timeAgo(r.at)}</span>
                    </p>
                    {r.message && <p className="mt-1 whitespace-pre-line text-sm text-ink-muted">“{r.message}”</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <div className="space-y-6">
        <section className="card p-6">
          <h3 className="text-lg font-semibold">Overall progress</h3>
          <ProgressBar className="mt-4" value={project.progress} size="lg" label={`${project.taskStats.done} of ${project.taskStats.total} tasks done`} />
          <div className="mt-5 grid grid-cols-4 gap-2 text-center">
            {[
              ["To do", project.taskStats.todo, "text-ink-muted"],
              ["Doing", project.taskStats.inProgress, "text-brand"],
              ["Review", project.taskStats.review, "text-warning"],
              ["Done", project.taskStats.done, "text-success"],
            ].map(([l, n, c]) => (
              <div key={l as string} className="rounded-xl bg-surface-2/70 py-2.5">
                <p className={cn("font-display text-xl font-bold", c as string)}>{n}</p>
                <p className="text-[11px] text-ink-faint">{l}</p>
              </div>
            ))}
          </div>
          {project.taskStats.overdue > 0 && <p className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">{project.taskStats.overdue} overdue task{project.taskStats.overdue > 1 ? "s" : ""}</p>}
        </section>

        <section className="card p-6">
          <h3 className="mb-1 text-lg font-semibold">Team contribution</h3>
          <p className="mb-5 text-sm text-ink-muted">Share of assigned tasks each member has completed.</p>
          {isLoading ? (
            <Skeleton className="h-32" />
          ) : (
            <div className="space-y-5">
              {members?.map((m) => (
                <div key={m.user.id} className="flex items-center gap-3">
                  <Avatar name={m.user.name} />
                  <div className="min-w-0 flex-1">
                    <ProgressBar
                      value={m.progress}
                      size="sm"
                      label={`${m.user.name}${project.team?.leader === m.user.id ? " ★" : ""} · ${m.done}/${m.assigned}${m.overdue ? ` · ${m.overdue} late` : ""}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card p-6">
          <h3 className="mb-4 text-lg font-semibold">Details</h3>
          <dl className="space-y-3 text-sm">
            {[
              ["Team", project.team?.name],
              ["Guide", project.faculty?.name ?? "—"],
              ["Department", project.department?.name],
              ["Term", project.academicTerm],
              ["Deadline", formatDay(project.deadline)],
              ["Proposed", project.proposalSubmittedAt ? formatDate(project.proposalSubmittedAt) : "Not yet"],
              ["Submitted", project.submission ? formatDateTime(project.submission.submittedAt) : "Not yet"],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between gap-4">
                <dt className="text-ink-faint">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {project.submission?.note && (
            <p className="mt-4 rounded-xl bg-surface-2 p-3 text-sm text-ink-muted">
              <Clock3 className="mr-1 inline h-3.5 w-3.5" /> Submission note: “{project.submission.note}”
            </p>
          )}
          <div className="mt-5 border-t border-line pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-faint">Members</p>
            <ul className="space-y-2.5">
              {project.team?.members.map((m) => (
                <li key={m.id} className="flex items-center gap-2.5 text-sm">
                  <Avatar name={m.name} size="xs" />
                  <span className="font-medium">{m.name}</span>
                  {project.team?.leader === m.id && <Crown className="h-3.5 w-3.5 text-warning" aria-label="Leader" />}
                  <span className="ml-auto truncate text-xs text-ink-faint">{m.usn}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
