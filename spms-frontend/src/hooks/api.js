import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Polling intervals. EduTrack does not use websockets; views refresh on an
// interval and immediately after your own changes.
export const POLL = { dashboard: 30_000, project: 20_000, tasks: 15_000, files: 20_000, lists: 45_000 };

function clean(params) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));
}

const get = async (url, params) => (await api.get(url, { params: params && clean(params) })).data.data;
const getPaged = async (url, params) => {
  const body = (await api.get(url, { params: clean(params) })).data;
  return { data: body.data, pagination: body.pagination };
};

function useInvalidate() {
  const qc = useQueryClient();
  return (...keys) => Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })));
}

// ---------- Public ----------

export const usePublicConfig = () => useQuery({ queryKey: ["meta"], queryFn: () => get("/meta"), staleTime: Infinity });

export const usePublicDepartments = () => useQuery({ queryKey: ["departments", "public"], queryFn: () => get("/departments/public"), staleTime: 5 * 60_000 });

// ---------- Dashboard ----------

export const useDashboard = () => useQuery({ queryKey: ["dashboard"], queryFn: () => get("/dashboard"), refetchInterval: POLL.dashboard });

// ---------- Departments & users ----------

export const useDepartments = () => useQuery({ queryKey: ["departments"], queryFn: () => get("/departments") });

export const useFacultyDirectory = (department) =>
  useQuery({ queryKey: ["faculty-directory", department], queryFn: () => get("/users/faculty", { department }) });

export const useUsers = (params) => useQuery({ queryKey: ["users", params], queryFn: () => getPaged("/users", params), placeholderData: keepPreviousData });

export const useFacultyWorkload = () => useQuery({ queryKey: ["faculty-workload"], queryFn: () => get("/users/faculty-workload") });

export const useAuditLogs = (params) =>
  useQuery({
    queryKey: ["audit", params],
    queryFn: () => getPaged("/admin/audit-logs", params),
    placeholderData: keepPreviousData,
    refetchInterval: POLL.lists,
  });

export function useAdminMutation(fn, keys = [["users"]]) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate(...keys, ["dashboard"]) });
}

// ---------- Teams ----------

export const useMyTeam = () => useQuery({ queryKey: ["team", "mine"], queryFn: () => get("/teams/mine") });

export const useTeamsProgress = (params) =>
  useQuery({
    queryKey: ["teams-progress", params],
    queryFn: () => getPaged("/teams/progress", params),
    placeholderData: keepPreviousData,
    refetchInterval: POLL.lists,
  });

export function useTeamMutation(fn) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate(["team"], ["dashboard"], ["projects"]) });
}

// ---------- Projects ----------

export const useProjects = (params) =>
  useQuery({
    queryKey: ["projects", "list", params],
    queryFn: () => getPaged("/projects", params),
    placeholderData: keepPreviousData,
    refetchInterval: POLL.lists,
  });

export const useProject = (id) =>
  useQuery({
    queryKey: ["projects", id],
    queryFn: () => get(`/projects/${id}`),
    enabled: Boolean(id),
    refetchInterval: POLL.project,
  });

export const useProjectActivity = (id) =>
  useQuery({ queryKey: ["projects", id, "activity"], queryFn: () => get(`/projects/${id}/activity`), refetchInterval: POLL.project });

export const useMemberProgress = (id) =>
  useQuery({ queryKey: ["projects", id, "members"], queryFn: () => get(`/projects/${id}/member-progress`), refetchInterval: POLL.project });

/** Any mutation on a project refreshes the project, its lists and dashboards. */
export function useProjectMutation(projectId, fn) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => invalidate(["projects"], ["tasks", projectId], ["files", projectId], ["dashboard"], ["teams-progress"], ["team"]),
  });
}

// ---------- Tasks ----------

export const useTasks = (projectId) =>
  useQuery({ queryKey: ["tasks", projectId], queryFn: () => get(`/projects/${projectId}/tasks`), refetchInterval: POLL.tasks });

// ---------- Files ----------

export const useFiles = (projectId) =>
  useQuery({ queryKey: ["files", projectId], queryFn: () => get(`/projects/${projectId}/files`), refetchInterval: POLL.files });

export const useFileHistory = (projectId, lineageKey) =>
  useQuery({
    queryKey: ["files", projectId, "lineage", lineageKey],
    queryFn: () => get(`/projects/${projectId}/files/lineage/${lineageKey}`),
    enabled: Boolean(lineageKey),
    refetchInterval: POLL.files,
  });

export async function fetchFileUrl(projectId, fileId, disposition) {
  return get(`/projects/${projectId}/files/${fileId}/url`, { disposition });
}
