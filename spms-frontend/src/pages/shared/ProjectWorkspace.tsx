import { Link, useParams, useSearchParams } from "react-router";
import { motion } from "framer-motion";
import { Activity, ArrowLeft, CalendarClock, FileStack, KanbanSquare, LayoutGrid, MessagesSquare, UserRound, UsersRound } from "lucide-react";
import { useProject, useProjectActivity, POLL } from "@/hooks/api";
import { StatusBadge } from "@/components/ui/Badge";
import { AvatarStack } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/Progress";
import { Tabs } from "@/components/ui/Tabs";
import { ErrorState, LiveIndicator, PageSkeleton, Skeleton } from "@/components/ui/States";
import { ProjectActions } from "@/features/project/ProjectActions";
import { OverviewTab } from "@/features/project/OverviewTab";
import { TasksBoard } from "@/features/project/TasksBoard";
import { FilesPanel } from "@/features/project/FilesPanel";
import { FeedbackThread } from "@/features/project/FeedbackThread";
import { ActivityFeed } from "@/features/project/ActivityFeed";
import { dueLabel } from "@/lib/format";
import { cn } from "@/lib/cn";

type Tab = "overview" | "tasks" | "files" | "feedback" | "activity";

function ActivityTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = useProjectActivity(projectId);
  if (isLoading) return <Skeleton className="h-80" />;
  return (
    <div className="card mx-auto max-w-3xl p-6">
      <ActivityFeed items={data ?? []} />
    </div>
  );
}

export default function ProjectWorkspace() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "overview";
  const { data: project, isLoading, error, refetch } = useProject(id);

  if (isLoading) return <PageSkeleton />;
  if (error || !project) return <ErrorState error={error} onRetry={refetch} />;

  const closed = ["submitted", "evaluated"].includes(project.status);
  const back = project.viewerRole === "student" ? "/app" : project.viewerRole === "faculty" ? "/app/projects" : "/app/projects";

  return (
    <div>
      <Link to={back} className="mb-5 inline-flex items-center gap-1.5 text-sm text-ink-muted transition hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card relative mb-6 overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={project.status} />
              <span className="chip">{project.department?.code}</span>
              <span className="chip">{project.academicTerm}</span>
              <LiveIndicator seconds={POLL.project / 1000} />
            </div>
            <h1 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">{project.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
              <span className="flex items-center gap-2">
                <UsersRound className="h-4 w-4" /> {project.team?.name}
                <AvatarStack names={project.team?.members.map((m) => m.name) ?? []} />
              </span>
              <span className="flex items-center gap-1.5">
                <UserRound className="h-4 w-4" /> {project.faculty?.name ?? "No guide"}
              </span>
              {project.deadline && (
                <span className={cn("flex items-center gap-1.5", !closed && new Date(project.deadline) < new Date() && "font-medium text-danger")}>
                  <CalendarClock className="h-4 w-4" /> {dueLabel(project.deadline, closed)}
                </span>
              )}
            </div>
          </div>
          <div className="w-full sm:w-72">
            <ProgressBar value={project.progress} size="lg" label={`${project.taskStats.done}/${project.taskStats.total} tasks done`} />
          </div>
        </div>
        <div className="relative mt-6 border-t border-line pt-5">
          <ProjectActions project={project} />
        </div>
      </motion.header>

      <Tabs<Tab>
        layoutId="project-tabs"
        value={tab}
        onChange={(t) => setParams(t === "overview" ? {} : { tab: t }, { replace: true })}
        tabs={[
          { id: "overview", label: "Overview", icon: <LayoutGrid className="h-4 w-4" /> },
          { id: "tasks", label: "Tasks", icon: <KanbanSquare className="h-4 w-4" />, count: project.taskStats.total },
          { id: "files", label: "Files", icon: <FileStack className="h-4 w-4" /> },
          { id: "feedback", label: "Feedback", icon: <MessagesSquare className="h-4 w-4" />, count: project.feedback.length },
          { id: "activity", label: "Activity", icon: <Activity className="h-4 w-4" /> },
        ]}
      />

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="pt-6">
        {tab === "overview" && <OverviewTab project={project} />}
        {tab === "tasks" && <TasksBoard project={project} />}
        {tab === "files" && <FilesPanel project={project} />}
        {tab === "feedback" && <FeedbackThread project={project} />}
        {tab === "activity" && <ActivityTab projectId={project.id} />}
      </motion.div>
    </div>
  );
}
