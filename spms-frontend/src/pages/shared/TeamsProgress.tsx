import { useState } from "react";
import { BarChart3, Search } from "lucide-react";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@edutrack/shared/constants";
import { useAuth } from "@/context/AuthContext";
import { useDepartments, useTeamsProgress, POLL } from "@/hooks/api";
import { useDebounce } from "@/hooks/useDebounce";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input, Select } from "@/components/ui/Field";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState, ErrorState, LiveIndicator, Skeleton } from "@/components/ui/States";
import { TeamProgressRow } from "@/features/project/TeamProgressRow";

/** Admins: every team ranked by progress. Faculty: the teams they guide. */
export default function TeamsProgress() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [sort, setSort] = useState("progress_desc");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search);
  const { data: departments } = useDepartments();
  const limit = 15;
  const { data, isLoading, isFetching, error, refetch } = useTeamsProgress({ page, limit, search: debounced, status, department, sort });

  const reset = (fn: (v: string) => void) => (e: { target: { value: string } }) => {
    fn(e.target.value);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title={isAdmin ? "All teams by progress" : "Your teams' progress"}
        subtitle={isAdmin ? "Every team in the institution, with project status and completion." : "Each team you guide and how far along they are."}
        actions={<LiveIndicator seconds={POLL.lists / 1000} />}
      />
      <div className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input leading={<Search className="h-4 w-4" />} placeholder="Search teams…" value={search} onChange={reset(setSearch)} aria-label="Search teams" />
        <Select aria-label="Status" value={status} onChange={reset(setStatus)}>
          <option value="">Any project status</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Select aria-label="Department" value={department} onChange={reset(setDepartment)}>
          <option value="">All departments</option>
          {departments?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <Select aria-label="Sort" value={sort} onChange={reset(setSort)}>
          <option value="progress_desc">Highest progress first</option>
          <option value="progress_asc">Lowest progress first</option>
          <option value="name">Team name A–Z</option>
          <option value="recent">Newest teams</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !data?.data.length ? (
        <EmptyState icon={<BarChart3 className="h-6 w-6" />} title="No teams found" hint={isAdmin ? "Teams appear here as soon as students create them." : "Teams appear here once they send you a proposal."} />
      ) : (
        <div className={isFetching ? "opacity-70 transition-opacity" : "transition-opacity"}>
          <div className="space-y-3">
            {data.data.map((row, i) => (
              <TeamProgressRow key={row.team.id} row={row} index={i} rank={sort.startsWith("progress") ? (page - 1) * limit + i + 1 : undefined} showFaculty={isAdmin} />
            ))}
          </div>
          <Pagination pagination={data.pagination} onPage={setPage} />
        </div>
      )}
    </>
  );
}
