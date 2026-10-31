import { motion } from "framer-motion";
import { CheckCircle2, ClipboardCheck, FileUp, MessageSquare, PenLine, ShieldCheck, Trophy, Users, XCircle, Activity } from "lucide-react";
import type { ActivityDTO } from "@edutrack/shared/types";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/States";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";

function iconFor(action: string) {
  if (action.includes("approved")) return { icon: CheckCircle2, cls: "bg-success-soft text-success" };
  if (action.includes("rejected") || action.includes("return")) return { icon: XCircle, cls: "bg-danger-soft text-danger" };
  if (action.includes("evaluate")) return { icon: Trophy, cls: "bg-warning-soft text-warning" };
  if (action.startsWith("file")) return { icon: FileUp, cls: "bg-accent-soft text-accent" };
  if (action.includes("feedback") || action.includes("comment")) return { icon: MessageSquare, cls: "bg-info-soft text-info" };
  if (action.startsWith("task")) return { icon: ClipboardCheck, cls: "bg-brand-soft text-brand" };
  if (action.startsWith("team")) return { icon: Users, cls: "bg-brand-soft text-brand" };
  if (action.startsWith("admin")) return { icon: ShieldCheck, cls: "bg-warning-soft text-warning" };
  if (action.startsWith("project")) return { icon: PenLine, cls: "bg-brand-soft text-brand" };
  return { icon: Activity, cls: "bg-surface-2 text-ink-muted" };
}

export function ActivityFeed({ items, showProject, compact }: { items: ActivityDTO[]; showProject?: boolean; compact?: boolean }) {
  if (!items.length) return <EmptyState icon={<Activity className="h-6 w-6" />} title="No activity yet" hint="Actions on projects will show up here." />;
  return (
    <ol className="relative space-y-1">
      <span className="absolute bottom-3 left-[19px] top-3 w-px bg-line" aria-hidden />
      {items.map((a, i) => {
        const { icon: Icon, cls } = iconFor(a.action);
        return (
          <motion.li key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }} className="relative flex gap-3 rounded-xl p-2 transition hover:bg-surface-2/60">
            <span className={cn("relative z-10 flex h-[22px] w-[22px] shrink-0 translate-x-[8px] items-center justify-center rounded-full ring-4 ring-surface", cls)}>
              <Icon className="h-3 w-3" />
            </span>
            <div className="ml-2 min-w-0 flex-1">
              <p className={cn("text-sm", compact && "line-clamp-2")}>
                <span className="font-semibold">{a.actor?.name ?? "System"}</span> <span className="text-ink-muted">{a.summary.charAt(0).toLowerCase() + a.summary.slice(1)}</span>
              </p>
              <p className="mt-0.5 text-xs text-ink-faint">
                {timeAgo(a.createdAt)}
                {showProject && a.project && <> · {a.project.title}</>}
              </p>
            </div>
            {!compact && a.actor && <Avatar name={a.actor.name} size="xs" />}
          </motion.li>
        );
      })}
    </ol>
  );
}
