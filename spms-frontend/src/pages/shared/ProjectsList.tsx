import { useState } from "react";
import { FolderSearch, Search } from "lucide-react";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@edutrack/shared/constants";
import { useAuth } from "@/context/AuthContext";
import { useDepartments, useFacultyDirectory, useProjects } from "@/hooks/api";
import { useDebounce } from "@/hooks/useDebounce";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input, Select } from "@/components/ui/Field";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { ProjectCard } from "@/features/project/ProjectCard";

export default function ProjectsList() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [faculty, setFaculty] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search);
  const { data: departments } = useDepartments();
  const { data: facultyList } = useFacultyDirectory();
  const { data, isLoading, isFetching, error, refetch } = useProjects({ page, limit: 12, search: debounced, status, department, faculty, sort });

  const reset = (fn: (v: string) => void) => (e: { target: { value: string } }) => {
    fn(e.target.value);
    setPage(1);
  };

  return (
    <>
      <PageHeader title={isAdmin ? "All projects" : "Projects you guide"} subtitle={isAdmin ? "Search, filter and manage every project record." : "Every proposal and project where you are the faculty guide."} />
      <div className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Input wrapperClassName="lg:col-span-2" leading={<Search className="h-4 w-4" />} placeholder="Search by title…" value={search} onChange={reset(setSearch)} aria-label="Search projects" />
        <Select aria-label="Status" value={status} onChange={reset(setStatus)}>
          <option value="">All statuses</option>
          {PROJECT_STATUSES.filter((s) => isAdmin || s !== "draft").map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        {isAdmin ? (
          <Select aria-label="Department" value={department} onChange={reset(setDepartment)}>
            <option value="">All departments</option>
            {departments?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        ) : (
          <div className="hidden lg:block" />
        )}
        <Select aria-label="Sort by" value={sort} onChange={reset(setSort)}>
          <option value="recent">Recently updated</option>
          <option value="progress">Most progress</option>
          <option value="deadline">Nearest deadline</option>
          <option value="title">Title A–Z</option>
        </Select>
        {isAdmin && (
          <Select aria-label="Faculty guide" wrapperClassName="sm:col-span-2" value={faculty} onChange={reset(setFaculty)}>
            <option value="">Any faculty guide</option>
            {facultyList?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-60" />)}</div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !data?.data.length ? (
        <EmptyState icon={<FolderSearch className="h-6 w-6" />} title="No projects match" hint="Try clearing the filters." />
      ) : (
        <div className={isFetching ? "opacity-70 transition-opacity" : "transition-opacity"}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.data.map((p, i) => (
              <ProjectCard key={p.id} project={p} index={i} />
            ))}
          </div>
          <Pagination pagination={data.pagination} onPage={setPage} />
        </div>
      )}
    </>
  );
}
