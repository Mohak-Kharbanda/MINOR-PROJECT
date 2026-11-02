import { motion } from "framer-motion";

import { GraduationCap } from "lucide-react";
import { useFacultyWorkload } from "@/hooks/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/Progress";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { LinkButton } from "@/components/ui/Button";

export default function FacultyWorkload() {
  const { data, isLoading, error, refetch } = useFacultyWorkload();
  return (
    <>
      <PageHeader
        title="Faculty"
        subtitle="Guides, how many teams each one has, and how those teams are doing. Reassign guides from a project's page."
        actions={
          <LinkButton to="/app/users?role=faculty" variant="outline">
            Manage accounts
          </LinkButton>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !data?.length ? (
        <EmptyState icon={<GraduationCap className="h-6 w-6" />} title="No faculty accounts" hint="Create faculty accounts from the Users page." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((row, i) => (
            <motion.div
              key={row.faculty.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card card-hover p-6"
            >
              <div className="flex items-center gap-4">
                <Avatar name={row.faculty.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold">{row.faculty.name}</p>
                  <p className="truncate text-sm text-ink-faint">
                    {row.faculty.department?.name ?? "No department"} · {row.faculty.email}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-surface-2/70 p-3">
                  <p className="font-display text-2xl font-bold">{row.projectCount}</p>
                  <p className="text-xs text-ink-faint">projects guided</p>
                </div>
                <div className="rounded-xl bg-surface-2/70 p-3">
                  <p className="font-display text-2xl font-bold">{row.activeCount}</p>
                  <p className="text-xs text-ink-faint">currently active</p>
                </div>
              </div>
              <ProgressBar className="mt-5" value={row.averageProgress} label="Average team progress" size="sm" />
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}
