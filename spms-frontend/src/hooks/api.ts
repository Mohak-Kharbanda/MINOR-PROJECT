import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import type {
  ActivityDTO,
  DashboardDTO,
  DepartmentDTO,
  FacultyWorkloadRow,
  FileLineageDTO,
  FileVersionDTO,
  MemberProgress,
  Pagination,
  ProjectDetailDTO,
  ProjectDTO,
  PublicConfig,
  SignedUrlDTO,
  TaskDTO,
  TeamDTO,
  TeamProgressRow,
  UserDTO,
} from "@edutrack/shared/types";
import { api } from "@/lib/api";

// Polling intervals. EduTrack does not use websockets; views refresh on an
// interval and immediately after your own changes.
export const POLL = { dashboard: 30_000, project: 20_000, tasks: 15_000, files: 20_000, lists: 45_000 };

type Params = Record<string, string | number | boolean | undefined | null>;
export interface Paged<T> {
  data: T[];
  pagination: Pagination;
}

function clean(params: Params) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));
}

const get = async <T,>(url: string, params?: Params): Promise<T> => (await api.get(url, { params: params && clean(params) })).data.data;
const getPaged = async <T,>(url: string, params: Params): Promise<Paged<T>> => {
  const body = (await api.get(url, { params: clean(params) })).data;
  return { data: body.data, pagination: body.pagination };
};

function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: QueryKey[]) => Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })));
}

// ---------- Public ----------

export const usePublicConfig = () =>
  useQuery({ queryKey: ["meta"], queryFn: () => get<PublicConfig>("/meta"), staleTime: Infinity });

export const usePublicDepartments = () =>
  useQuery({ queryKey: ["departments", "public"], queryFn: () => get<DepartmentDTO[]>("/departments/public"), staleTime: 5 * 60_000 });

// ---------- Dashboard ----------

export const useDashboard = <T extends DashboardDTO>() =>
  useQuery({ queryKey: ["dashboard"], queryFn: () => get<T>("/dashboard"), refetchInterval: POLL.dashboard });

// ---------- Departments & users ----------

export const useDepartments = () => useQuery({ queryKey: ["departments"], queryFn: () => get<DepartmentDTO[]>("/departments") });

export const useFacultyDirectory = (department?: string) =>
  useQuery({ queryKey: ["faculty-directory", department], queryFn: () => get<UserDTO[]>("/users/faculty", { department }) });

export const useUsers = (params: Params) =>
  useQuery({ queryKey: ["users", params], queryFn: () => getPaged<UserDTO>("/users", params), placeholderData: keepPreviousData });

export const useFacultyWorkload = () =>
  useQuery({ queryKey: ["faculty-workload"], queryFn: () => get<FacultyWorkloadRow[]>("/users/faculty-workload") });

export const useAuditLogs = (params: Params) =>
  useQuery({ queryKey: ["audit", params], queryFn: () => getPaged<ActivityDTO>("/admin/audit-logs", params), placeholderData: keepPreviousData, refetchInterval: POLL.lists });

export function useAdminMutation<TVars>(fn: (vars: TVars) => Promise<any>, keys: QueryKey[] = [["users"]]) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate(...keys, ["dashboard"]) });
}

// ---------- Teams ----------

export const useMyTeam = () => useQuery({ queryKey: ["team", "mine"], queryFn: () => get<TeamDTO | null>("/teams/mine") });

export const useTeamsProgress = (params: Params) =>
  useQuery({
    queryKey: ["teams-progress", params],
    queryFn: () => getPaged<TeamProgressRow>("/teams/progress", params),
    placeholderData: keepPreviousData,
    refetchInterval: POLL.lists,
  });

export function useTeamMutation<TVars>(fn: (vars: TVars) => Promise<any>) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate(["team"], ["dashboard"], ["projects"]) });
}

// ---------- Projects ----------

export const useProjects = (params: Params) =>
  useQuery({
    queryKey: ["projects", "list", params],
    queryFn: () => getPaged<ProjectDTO>("/projects", params),
    placeholderData: keepPreviousData,
    refetchInterval: POLL.lists,
  });

export const useProject = (id: string | undefined) =>
  useQuery({
    queryKey: ["projects", id],
    queryFn: () => get<ProjectDetailDTO>(`/projects/${id}`),
    enabled: Boolean(id),
    refetchInterval: POLL.project,
  });

export const useProjectActivity = (id: string) =>
  useQuery({ queryKey: ["projects", id, "activity"], queryFn: () => get<ActivityDTO[]>(`/projects/${id}/activity`), refetchInterval: POLL.project });

export const useMemberProgress = (id: string) =>
  useQuery({ queryKey: ["projects", id, "members"], queryFn: () => get<MemberProgress[]>(`/projects/${id}/member-progress`), refetchInterval: POLL.project });

/** Any mutation on a project refreshes the project, its lists and dashboards. */
export function useProjectMutation<TVars>(projectId: string | undefined, fn: (vars: TVars) => Promise<any>) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => invalidate(["projects"], ["tasks", projectId], ["files", projectId], ["dashboard"], ["teams-progress"], ["team"]),
  });
}

// ---------- Tasks ----------

export const useTasks = (projectId: string) =>
  useQuery({ queryKey: ["tasks", projectId], queryFn: () => get<TaskDTO[]>(`/projects/${projectId}/tasks`), refetchInterval: POLL.tasks });

// ---------- Files ----------

export const useFiles = (projectId: string) =>
  useQuery({ queryKey: ["files", projectId], queryFn: () => get<FileLineageDTO[]>(`/projects/${projectId}/files`), refetchInterval: POLL.files });

export const useFileHistory = (projectId: string, lineageKey: string | null) =>
  useQuery({
    queryKey: ["files", projectId, "lineage", lineageKey],
    queryFn: () => get<FileVersionDTO[]>(`/projects/${projectId}/files/lineage/${lineageKey}`),
    enabled: Boolean(lineageKey),
    refetchInterval: POLL.files,
  });

export async function fetchFileUrl(projectId: string, fileId: string, disposition: "inline" | "attachment") {
  return get<SignedUrlDTO>(`/projects/${projectId}/files/${fileId}/url`, { disposition });
}
