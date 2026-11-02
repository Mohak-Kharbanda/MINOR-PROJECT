import { FILE_REVIEW_LABELS, PROJECT_STATUS_LABELS, TASK_STATUS_LABELS } from "@edutrack/shared/constants";
import { cn } from "@/lib/cn";

const TONES = {
  neutral: "bg-surface-2 text-ink-muted border-line",
  brand: "bg-brand-soft text-brand border-brand/20",
  success: "bg-success-soft text-success border-success/20",
  warning: "bg-warning-soft text-warning border-warning/25",
  danger: "bg-danger-soft text-danger border-danger/20",
  info: "bg-info-soft text-info border-info/20",
  accent: "bg-accent-soft text-accent border-accent/20",
};

const DOTS = {
  neutral: "bg-ink-faint",
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  accent: "bg-accent",
};

export function Badge({ tone = "neutral", dot, pulse, children, className }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium", TONES[tone], className)}>
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && <span className={cn("absolute inset-0 rounded-full animate-pulse-ring", DOTS[tone])} />}
          <span className={cn("relative h-1.5 w-1.5 rounded-full", DOTS[tone])} />
        </span>
      )}
      {children}
    </span>
  );
}

const STATUS_TONE = {
  draft: "neutral",
  pending_review: "warning",
  approved: "info",
  rejected: "danger",
  in_progress: "brand",
  submitted: "accent",
  evaluated: "success",
};

export function StatusBadge({ status, className }) {
  return (
    <Badge tone={STATUS_TONE[status]} dot pulse={status === "pending_review" || status === "in_progress"} className={className}>
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function RoleBadge({ role }) {
  const tone = { student: "brand", faculty: "accent", admin: "warning" };
  return <Badge tone={tone[role]}>{role[0].toUpperCase() + role.slice(1)}</Badge>;
}

const TASK_TONE = { todo: "neutral", in_progress: "brand", review: "warning", done: "success" };
export function TaskStatusBadge({ status }) {
  return <Badge tone={TASK_TONE[status]}>{TASK_STATUS_LABELS[status]}</Badge>;
}

const REVIEW_TONE = { pending: "neutral", needs_revision: "warning", accepted: "success" };
export function ReviewBadge({ status }) {
  return (
    <Badge tone={REVIEW_TONE[status]} dot>
      {FILE_REVIEW_LABELS[status]}
    </Badge>
  );
}

const PRIORITY_TONE = { low: "neutral", medium: "info", high: "danger" };
export function PriorityBadge({ priority }) {
  return <Badge tone={PRIORITY_TONE[priority]}>{priority[0].toUpperCase() + priority.slice(1)}</Badge>;
}
