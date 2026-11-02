import { Link } from "react-router";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Building2, FolderKanban, Gauge, GraduationCap, Users, UsersRound } from "lucide-react";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@edutrack/shared/constants";
import { useDashboard, POLL } from "@/hooks/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState, ErrorState, LiveIndicator, PageSkeleton } from "@/components/ui/States";
import { TeamProgressRow } from "@/features/project/TeamProgressRow";
import { ActivityFeed } from "@/features/project/ActivityFeed";

const BAR_COLORS = {
  draft: "bg-ink-faint",
  pending_review: "bg-warning",
  approved: "bg-info",
  rejected: "bg-danger",
  in_progress: "bg-brand",
  submitted: "bg-accent",
  evaluated: "bg-success",
};

export default function AdminDashboard() {
  const { data, isLoading, error, refetch } = useDashboard();
  if (isLoading) return <PageSkeleton />;
  if (error || !data) return <ErrorState error={error} onRetry={refetch} />;
  const { counts, statusCounts } = data;
  const max = Math.max(1, ...Object.values(statusCounts).map((n) => n ?? 0));

  return (
    <>
      <PageHeader
        title="Admin overview"
        subtitle="Every department, team and project in one place."
        actions={<LiveIndicator seconds={POLL.dashboard / 1000} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard index={0} label="Students" value={counts.students} icon={<Users className="h-4 w-4" />} />
        <StatCard index={1} label="Faculty" value={counts.faculty} icon={<GraduationCap className="h-4 w-4" />} tone="accent" />
        <StatCard index={2} label="Teams" value={counts.teams} icon={<UsersRound className="h-4 w-4" />} tone="success" hint={`${counts.projects} projects`} />
        <StatCard
          index={3}
          label="Average progress"
          value={counts.averageProgress}
          suffix="%"
          icon={<Gauge className="h-4 w-4" />}
          tone="warning"
          hint={`${counts.overdueTasks} overdue tasks system-wide`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="card p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Projects by status</h3>
            <span className="flex items-center gap-1.5 text-xs text-ink-faint">
              <Building2 className="h-3.5 w-3.5" /> {counts.departments} departments
            </span>
          </div>
          <div className="space-y-3.5">
            {PROJECT_STATUSES.map((s, i) => {
              const n = statusCounts[s] ?? 0;
              return (
                <div key={s} className="grid grid-cols-[110px_1fr_32px] items-center gap-3 text-sm">
                  <span className="text-ink-muted">{PROJECT_STATUS_LABELS[s]}</span>
                  <div className="h-3 overflow-hidden rounded-full bg-surface-2">
                    <motion.div
                      className={`h-full rounded-full ${BAR_COLORS[s]}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(n / max) * 100}%` }}
                      transition={{ delay: 0.1 + i * 0.06, type: "spring", stiffness: 70, damping: 16 }}
                    />
                  </div>
                  <span className="text-right font-mono font-semibold">{n}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Leading teams</h3>
            <Link to="/app/teams" className="flex items-center gap-1 text-sm font-medium text-brand hover:underline">
              All teams <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {data.topTeams.length ? (
            <div className="space-y-3">
              {data.topTeams.slice(0, 4).map((row, i) => (
                <TeamProgressRow key={row.team.id} row={row} index={i} rank={i + 1} showFaculty compact />
              ))}
            </div>
          ) : (
            <EmptyState icon={<FolderKanban className="h-6 w-6" />} title="No approved projects yet" />
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-6">
          <h3 className="mb-1 flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="h-5 w-5 text-danger" /> Teams at risk
          </h3>
          <p className="mb-4 text-sm text-ink-muted">Teams with overdue tasks, or a deadline within 10 days and progress under 60%.</p>
          {data.atRisk.length ? (
            <div className="space-y-3">
              {data.atRisk.map((row, i) => (
                <TeamProgressRow key={row.team.id} row={row} index={i} showFaculty />
              ))}
            </div>
          ) : (
            <EmptyState title="Nobody's at risk" hint="All active teams are on schedule." />
          )}
        </section>
        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent activity</h3>
            <Link to="/app/audit" className="text-sm font-medium text-brand hover:underline">
              Audit log
            </Link>
          </div>
          <ActivityFeed items={data.activity} showProject compact />
        </section>
      </div>
    </>
  );
}
