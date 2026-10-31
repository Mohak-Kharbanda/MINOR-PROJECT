import { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { MessagesSquare, Send } from "lucide-react";
import type { ProjectDetailDTO } from "@edutrack/shared/types";
import { useAuth } from "@/context/AuthContext";
import { useProjectMutation } from "@/hooks/api";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/States";

const KIND_LABEL = { proposal: "Proposal", progress: "Progress", submission: "Submission", general: "General" } as const;

/** Conversation between the team and their guide. Faculty messages are highlighted as feedback. */
export function FeedbackThread({ project }: { project: ProjectDetailDTO }) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState<keyof typeof KIND_LABEL>(user?.role === "faculty" ? "progress" : "general");
  const post = useProjectMutation(project.id, async () => (await api.post(`/projects/${project.id}/feedback`, { message, kind })).data);

  return (
    <div className="mx-auto max-w-3xl">
      {project.feedback.length ? (
        <ol className="space-y-5">
          {project.feedback.map((f, i) => {
            const mine = f.author?.id === user?.id;
            const staff = f.authorRole !== "student";
            return (
              <motion.li key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }} className={cn("flex gap-3", mine && "flex-row-reverse")}>
                <Avatar name={f.author?.name ?? "?"} size="md" />
                <div className={cn("max-w-[85%]", mine && "text-right")}>
                  <p className="mb-1 flex flex-wrap items-center gap-2 text-xs text-ink-faint" style={{ justifyContent: mine ? "flex-end" : "flex-start" }}>
                    <span className="font-semibold text-ink">{f.author?.name}</span>
                    {staff && <Badge tone="accent">{f.authorRole === "faculty" ? "Faculty feedback" : "Admin"}</Badge>}
                    <Badge>{KIND_LABEL[f.kind]}</Badge>
                    {formatDateTime(f.createdAt)}
                  </p>
                  <div className={cn("inline-block whitespace-pre-line rounded-2xl px-4 py-3 text-left text-[15px] leading-relaxed", mine ? "rounded-tr-sm bg-brand text-brand-ink" : staff ? "rounded-tl-sm border border-accent/25 bg-accent-soft/60" : "rounded-tl-sm border border-line bg-surface")}>
                    {f.message}
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ol>
      ) : (
        <EmptyState icon={<MessagesSquare className="h-6 w-6" />} title="No feedback yet" hint="Feedback from your guide and replies from the team appear here as a conversation." />
      )}

      {project.permissions.canGiveFeedback && (
        <form
          className="card mt-8 p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!message.trim()) return;
            try {
              await post.mutateAsync(undefined);
              setMessage("");
              toast.success("Posted.");
            } catch (err) {
              toast.error(errorMessage(err));
            }
          }}
        >
          <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={user?.role === "student" ? "Reply to your guide or ask a question…" : "Write feedback for the team…"} aria-label="Message" />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <Select aria-label="Feedback type" value={kind} onChange={(e) => setKind(e.target.value as keyof typeof KIND_LABEL)} wrapperClassName="w-44">
              {Object.entries(KIND_LABEL).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
            <Button type="submit" loading={post.isPending} disabled={!message.trim()} icon={<Send className="h-4 w-4" />}>
              Post
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
