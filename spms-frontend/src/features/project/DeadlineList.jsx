import { Link } from "react-router";
import { CalendarCheck2, Flag } from "lucide-react";
import { EmptyState } from "@/components/ui/States";
import { Avatar } from "@/components/ui/Avatar";
import { dueLabel, formatDay } from "@/lib/format";
import { cn } from "@/lib/cn";

export function DeadlineList({ items, showProject }) {
  if (!items.length)
    return <EmptyState icon={<CalendarCheck2 className="h-6 w-6" />} title="Nothing due soon" hint="Deadlines for the next two weeks appear here." />;
  return (
    <ul className="space-y-2">
      {items.map((d) => {
        const date = new Date(d.dueDate);
        return (
          <li key={`${d.type}-${d.id}`}>
            <Link
              to={`/app/projects/${d.project.id}`}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 transition hover:border-brand/30",
                d.isOverdue ? "border-danger/30 bg-danger-soft/40" : "border-line bg-surface"
              )}
            >
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-center",
                  d.isOverdue ? "bg-danger text-white" : d.type === "project" ? "bg-brand text-brand-ink" : "bg-surface-2"
                )}
              >
                <span className="text-[10px] font-semibold uppercase leading-none">
                  {date.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" })}
                </span>
                <span className="font-display text-base font-bold leading-tight">{date.getUTCDate()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                  {d.type === "project" && <Flag className="h-3.5 w-3.5 text-brand" />}
                  {d.title}
                </p>
                <p className={cn("truncate text-xs", d.isOverdue ? "font-medium text-danger" : "text-ink-faint")}>
                  {dueLabel(d.dueDate)}
                  {showProject && <> · {d.project.title}</>}
                </p>
              </div>
              {d.assignee && <Avatar name={d.assignee.name} size="xs" />}
              <span className="sr-only">{formatDay(d.dueDate)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
