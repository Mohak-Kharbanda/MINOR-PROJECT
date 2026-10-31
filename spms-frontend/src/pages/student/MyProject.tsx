import { Navigate } from "react-router";
import { FolderKanban } from "lucide-react";
import { useMyTeam } from "@/hooks/api";
import { EmptyState, PageSkeleton } from "@/components/ui/States";
import { LinkButton } from "@/components/ui/Button";


/** Sends students straight to their team's project workspace. */
export default function MyProject() {
  const { data: team, isLoading } = useMyTeam();
  if (isLoading) return <PageSkeleton />;
  if (team?.project) return <Navigate to={`/app/projects/${team.project.id}`} replace />;
  return (
    <EmptyState
      icon={<FolderKanban className="h-6 w-6" />}
      title={team ? "No project yet" : "Join a team first"}
      hint={team ? "Write a proposal from your dashboard to create your project workspace." : "Projects belong to teams. Create or join one to get started."}
      action={
        <LinkButton to={team ? "/app" : "/app/team"}>{team ? "Go to dashboard" : "Set up your team"}</LinkButton>
      }
    />
  );
}
