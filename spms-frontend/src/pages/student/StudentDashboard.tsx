import { useState } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, ClipboardList, FileStack, Lightbulb, Rocket, UserRound, UsersRound } from "lucide-react";
import type { StudentDashboardDTO } from "@edutrack/shared/types";
import { useAuth } from "@/context/AuthContext";
import { useDashboard, POLL } from "@/hooks/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button, LinkButton } from "@/components/ui/Button";
import { StatusBadge, PriorityBadge, TaskStatusBadge } from "@/components/ui/Badge";
import { ProgressBar, ProgressRing } from "@/components/ui/Progress";
import { StatCard } from "@/components/ui/StatCard";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { EmptyState, ErrorState, LiveIndicator, PageSkeleton } from "@/components/ui/States";
import { ActivityFeed } from "@/features/project/ActivityFeed";
import { DeadlineList } from "@/features/project/DeadlineList";
import { ProjectFormModal } from "@/features/project/ProjectFormModal";
import { daysUntil, dueLabel } from "@/lib/format";
import { cn } from "@/lib/cn";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useDashboard<StudentDashboardDTO>();
  const [proposing, setProposing] = useState(false);

  if (isLoading) return <PageSkeleton />;
  if (error || !data) return <ErrorState error={error} onRetry={refetch} />;

  const { team, project, counts } = data;
  const first = user?.name.split(" ")[0];
  // Same calendar-day maths as the due labels, so the numbers always agree.
  const daysLeft = daysUntil(project?.deadline);

  return (
    <>
      <PageHeader title={`${greeting()}, ${first}`} subtitle={project ? "Here's where your project stands today." : "Let's get your project off the ground."} actions={<LiveIndicator seconds={POLL.dashboard / 1000} />} />

      {!team && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card relative overflow-hidden p-8 sm:p-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand/20 blur-3xl" />
          <div className="relative max-w-xl">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <UsersRound className="h-6 w-6" />
            </span>
            <h2 className="mt-5 text-2xl font-bold">Step 1 — Form your team</h2>
            <p className="mt-2 text-ink-muted">Create a team and share its join code, or join a team with a code a teammate sent you. Each student can be on one team.</p>
            <LinkButton to="/app/team" className="mt-6" icon={<ArrowRight className="h-4 w-4" />}>
                Set up your team
              </LinkButton>
          </div>
        </motion.div>
      )}

      {team && !project && (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card relative overflow-hidden p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <Lightbulb className="h-6 w-6" />
            </span>
            <h2 className="relative mt-5 text-2xl font-bold">Step 2 — Propose your project</h2>
            <p className="relative mt-2 max-w-lg text-ink-muted">Describe what you'll build and choose a faculty guide. Once they approve it, you can start adding tasks and tracking progress.</p>
            <Button className="relative mt-6" icon={<Rocket className="h-4 w-4" />} onClick={() => setProposing(true)}>
              Write proposal
            </Button>
          </motion.div>
          <TeamCard data={data} />
        </div>
      )}

      {team && project && (
        <div className="space-y-6">
          {project.status === "rejected" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-danger/30 bg-danger-soft/50 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-danger" />
                <div>
                  <p className="font-semibold">Your proposal needs changes</p>
                  <p className="text-sm text-ink-muted">Read your guide's feedback, revise the proposal and send it again.</p>
                </div>
              </div>
              <LinkButton to={`/app/projects/${project.id}`} variant="danger" size="sm">Review feedback</LinkButton>
            </motion.div>
          )}

          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="card relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/[0.07] via-transparent to-accent/[0.08]" />
            <div className="relative grid items-center gap-8 p-6 sm:p-8 md:grid-cols-[auto_1fr]">
              <div className="mx-auto">
                <ProgressRing value={project.progress} size={150} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={project.status} />
                  <span className="chip">{project.academicTerm}</span>
                </div>
                <h2 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">{project.title}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <UsersRound className="h-4 w-4" /> {team.name}
                  </span>
                  {project.faculty && (
                    <span className="flex items-center gap-1.5">
                      <UserRound className="h-4 w-4" /> {project.faculty.name}
                    </span>
                  )}
                  {project.deadline && (
                    <span className={cn("flex items-center gap-1.5", daysLeft !== null && daysLeft < 0 && !["submitted", "evaluated"].includes(project.status) && "text-danger")}>
                      <CalendarClock className="h-4 w-4" /> {dueLabel(project.deadline, ["submitted", "evaluated"].includes(project.status))}
                    </span>
                  )}
                </div>
                <ProgressBar className="mt-5" value={project.progress} size="lg" label={`${project.taskStats.done} of ${project.taskStats.total} tasks done`} />
                <div className="mt-5 flex flex-wrap gap-2">
                  <LinkButton to={`/app/projects/${project.id}`} icon={<ArrowRight className="h-4 w-4" />} className="flex-row-reverse">
                      Open workspace
                    </LinkButton>
                  {project.evaluation && (
                    <span className="inline-flex items-center gap-2 rounded-xl bg-success-soft px-4 font-mono text-sm font-semibold text-success">
                      <CheckCircle2 className="h-4 w-4" /> Marks: {project.evaluation.marks}/100
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard index={0} label="My open tasks" value={counts.myOpenTasks} icon={<ClipboardList className="h-4 w-4" />} />
            <StatCard index={1} label="My overdue" value={counts.myOverdue} icon={<AlertTriangle className="h-4 w-4" />} tone={counts.myOverdue ? "danger" : "success"} />
            <StatCard index={2} label="Project files" value={counts.files} icon={<FileStack className="h-4 w-4" />} tone="accent" />
            <StatCard index={3} label="Days to deadline" value={Math.max(0, daysLeft ?? 0)} icon={<CalendarClock className="h-4 w-4" />} tone="warning" hint={daysLeft === null ? "No deadline set" : daysLeft < 0 ? "Deadline passed" : undefined} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
            <section className="card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">My tasks</h3>
                <Link to={`/app/projects/${project.id}?tab=tasks`} className="text-sm font-medium text-brand hover:underline">
                  Task board
                </Link>
              </div>
              {data.myTasks.length ? (
                <ul className="space-y-2">
                  {data.myTasks.map((t) => (
                    <li key={t.id} className={cn("flex items-center gap-3 rounded-xl border p-3", t.isOverdue ? "border-danger/30 bg-danger-soft/30" : "border-line")}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.title}</p>
                        <p className={cn("text-xs", t.isOverdue ? "text-danger" : "text-ink-faint")}>{dueLabel(t.dueDate)}</p>
                      </div>
                      <PriorityBadge priority={t.priority} />
                      <TaskStatusBadge status={t.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="You're all caught up" hint="No open tasks are assigned to you." />
              )}
            </section>
            <section className="card p-6">
              <h3 className="mb-4 text-lg font-semibold">Upcoming deadlines</h3>
              <DeadlineList items={data.deadlines} />
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-6">
              <h3 className="mb-1 text-lg font-semibold">Team contribution</h3>
              <p className="mb-5 text-sm text-ink-muted">Tasks completed by each teammate.</p>
              <div className="space-y-5">
                {data.memberProgress.map((m) => (
                  <div key={m.user.id} className="flex items-center gap-3">
                    <Avatar name={m.user.name} />
                    <div className="flex-1">
                      <ProgressBar value={m.progress} size="sm" label={`${m.user.name}${m.user.id === user?.id ? " (you)" : ""} · ${m.done}/${m.assigned}`} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="card p-6">
              <h3 className="mb-4 text-lg font-semibold">Recent activity</h3>
              <ActivityFeed items={data.activity} compact />
            </section>
          </div>
        </div>
      )}

      <ProjectFormModal open={proposing} onClose={() => setProposing(false)} team={team} />
    </>
  );
}

function TeamCard({ data }: { data: StudentDashboardDTO }) {
  const team = data.team!;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="card p-6">
      <p className="text-sm font-medium text-ink-muted">Your team</p>
      <h3 className="mt-1 text-xl font-bold">{team.name}</h3>
      <p className="text-sm text-ink-faint">{team.department?.name}</p>
      <div className="mt-4 flex items-center gap-3">
        <AvatarStack names={team.members.map((m) => m.name)} size="sm" max={5} />
        <span className="text-sm text-ink-muted">
          {team.members.length}/{team.maxMembers} members
        </span>
      </div>
      {team.joinCode && (
        <div className="mt-5 rounded-xl border border-dashed border-line bg-surface-2/60 p-3">
          <p className="text-xs text-ink-faint">Join code</p>
          <p className="font-mono text-xl font-semibold tracking-[0.3em]">{team.joinCode}</p>
        </div>
      )}
      <Link to="/app/team" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
        Manage team →
      </Link>
    </motion.div>
  );
}
