import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { errorMessage } from "@/lib/api";
import { Button } from "./Button";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-brand", className)} aria-label="Loading" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("relative overflow-hidden rounded-xl bg-surface-2", className)}><span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-surface-3/80 to-transparent" /></div>;
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

export function EmptyState({ icon, title, hint, action, className }: { icon?: ReactNode; title: string; hint?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-12 text-center", className)}
    >
      {icon && <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">{icon}</div>}
      <p className="font-display text-lg font-semibold">{title}</p>
      {hint && <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-danger/30 bg-danger-soft/40 px-6 py-10 text-center">
      <AlertCircle className="mb-3 h-8 w-8 text-danger" />
      <p className="font-medium">We couldn't load this.</p>
      <p className="mt-1 text-sm text-ink-muted">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Small honest indicator that a view refreshes by polling. */
export function LiveIndicator({ seconds }: { seconds: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-faint" title={`This view refreshes automatically every ${seconds} seconds.`}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-success" />
        <span className="relative h-2 w-2 rounded-full bg-success" />
      </span>
      Auto-refresh · {seconds}s
    </span>
  );
}
