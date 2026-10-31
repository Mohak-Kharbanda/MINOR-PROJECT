import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-8 w-8", className)} aria-hidden>
      <defs>
        <linearGradient id="et-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgb(var(--brand))" />
          <stop offset="1" stopColor="rgb(var(--accent))" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="rgb(var(--ink))" />
      <path d="M14 40l18-10 18 10-18 10z" fill="url(#et-g)" opacity=".5" />
      <path d="M14 29l18-10 18 10-18 10z" fill="url(#et-g)" />
      <circle cx="48" cy="16" r="5" fill="rgb(var(--lime))" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && <span className="font-display text-xl font-bold tracking-tight">EduTrack</span>}
    </span>
  );
}
