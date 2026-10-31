import { Link } from "react-router";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, ClipboardCheck, FolderKanban, Gauge, Inbox, Trophy } from "lucide-react";
import type { FacultyDashboardDTO, ProjectDTO } from "@edutrack/shared/types";
import { useAuth } from "@/context/AuthContext";
import { useDashboard, POLL } from "@/hooks/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { LinkButton } from "@/components/ui/Button";
import { AvatarStack } from "@/components/ui/Avatar";
import { EmptyState, ErrorState, LiveIndicator, PageSkeleton } from "@/components/ui/States";
import { TeamProgressRow } from "@/features/project/TeamProgressRow";
import { DeadlineList } from "@/features/project/DeadlineList";
import { ActivityFeed } from "@/features/project/ActivityFeed";
import { timeAgo } from "@/lib/format";

function ActionCard({ project, kind }: { project: ProjectDTO; kind: "review" | "evaluate" }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4">
      <span className={kind === "review" ? "flex h-10 w-10 items-center justify-center rounded-xl bg-warning-soft text-warning" : "flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"}>
        {kind === "review" ? <ClipboardCheck className="h-5 w-5" /> : <Trophy className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{project.title}</p>
        <p className="flex items-center gap-2 text-xs text-ink-faint">
          <AvatarStack names={project.team?.members.map((m) => m.name) ?? []} max={3} />
          {project.team?.name} · {kind === "review" ? `proposed ${timeAgo(project.proposalSubmittedAt ?? project.updatedAt)}` : `submitted ${timeAgo(project.submission?.submittedAt ?? project.updatedAt)}`}
        </p>
      </div>
      <LinkButton to={`/app/projects/${project.id}`} size="sm" variant={kind === "review" ? "primary" : "secondary"}>
          {kind === "review" ? "Review proposal" : "Evaluate"}
        </LinkButton>
    </motion.div>
  );
}

export default function FacultyDashboard() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useDashboard<FacultyDashboardDTO>();
  if (isLoading) return <PageSkeleton />;
  if (error || !data) return <ErrorState error={error} onRetry={refetch} />;
  const { counts } = data;
  const attention = data.pendingReview.length + data.awaitingEvaluation.length;

  return (
    <>
      <PageHeader title={`Welcome, ${user?.name}`} subtitle="The teams you guide, and what needs your attention." actions={<LiveIndicator seconds={POLL.dashboard / 1000} />} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard index={0} label="Teams you guide" value={counts.assigned} icon={<FolderKanban className="h-4 w-4" />} />
        <StatCard index={1} label="Pending review" value={counts.pendingReview} icon={<Inbox className="h-4 w-4" />} tone="warning" />
        <StatCard index={2} label="Awaiting marks" value={counts.submitted} icon={<Trophy className="h-4 w-4" />} tone="accent" />
        <StatCard index={3} label="Average progress" value={counts.averageProgress} suffix="%" icon={<Gauge className="h-4 w-4" />} tone="success" />
      </div>

      {attention > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            Needs your attention <span className="rounded-full bg-warning px-2 py-0.5 font-mono text-xs text-white">{attention}</span>
          </h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {data.pendingReview.map((p) => (
              <ActionCard key={p.id} project={p} kind="review" />
            ))}
            {data.awaitingEvaluation.map((p) => (
              <ActionCard key={p.id} project={p} kind="evaluate" />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your teams' progress</h2>
          <Link to="/app/teams" className="flex items-center gap-1 text-sm font-medium text-brand hover:underline">
            All teams <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {data.teams.length ? (
          <div className="space-y-3">
            {data.teams.map((row, i) => (
              <TeamProgressRow key={row.team.id} row={row} index={i} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<BarChart3 className="h-6 w-6" />} title="No teams yet" hint="When students choose you as their guide and send a proposal, their team shows up here." />
        )}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h3 className="mb-4 text-lg font-semibold">Upcoming deadlines</h3>
          <DeadlineList items={data.deadlines} showProject />
        </section>
        <section className="card p-6">
          <h3 className="mb-4 text-lg font-semibold">Recent activity</h3>
          <ActivityFeed items={data.activity} showProject compact />
        </section>
      </div>
    </>
  );
}
