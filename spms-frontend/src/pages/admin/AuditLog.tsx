import { useState } from "react";
import { ScrollText } from "lucide-react";
import { useAuditLogs } from "@/hooks/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Field";
import { Pagination } from "@/components/ui/Pagination";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { formatDateTime } from "@/lib/format";

const FILTERS = [
  ["", "All actions"],
  ["admin.", "Admin actions"],
  ["project.", "Project & review"],
  ["project.evaluate", "Evaluations"],
  ["file.", "Files"],
  ["task.", "Tasks"],
  ["team.", "Teams"],
  ["auth.", "Account security"],
];

export default function AuditLog() {
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, error, refetch } = useAuditLogs({ page, limit: 25, action });

  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="Who did what, and when: account changes, reviews, evaluations, uploads and more."
        actions={
          <Select
            aria-label="Filter actions"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            wrapperClassName="w-52"
          >
            {FILTERS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        }
      />
      {isLoading ? (
        <Skeleton className="h-96" />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !data?.data.length ? (
        <EmptyState icon={<ScrollText className="h-6 w-6" />} title="Nothing logged yet" />
      ) : (
        <div className={isFetching ? "opacity-70 transition-opacity" : "transition-opacity"}>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2/60 text-left text-xs uppercase tracking-wider text-ink-faint">
                    <th className="px-5 py-3 font-semibold">When</th>
                    <th className="px-5 py-3 font-semibold">Who</th>
                    <th className="px-5 py-3 font-semibold">What</th>
                    <th className="px-5 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.data.map((a) => (
                    <tr key={a.id} className="transition hover:bg-surface-2/40">
                      <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{formatDateTime(a.createdAt)}</td>
                      <td className="px-5 py-3">
                        {a.actor ? (
                          <div className="flex items-center gap-2">
                            <Avatar name={a.actor.name} size="xs" />
                            <span className="font-medium">{a.actor.name}</span>
                            {a.actorRole && <span className="text-xs text-ink-faint">{a.actorRole}</span>}
                          </div>
                        ) : (
                          <span className="text-ink-faint">System</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {a.summary}
                        {a.project && <span className="block text-xs text-ink-faint">{a.project.title}</span>}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={a.action.startsWith("admin") ? "warning" : a.action.includes("evaluate") ? "success" : "neutral"}>
                          <code className="font-mono text-[11px]">{a.action}</code>
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination pagination={data.pagination} onPage={setPage} />
        </div>
      )}
    </>
  );
}
