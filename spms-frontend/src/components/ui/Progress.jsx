import { useEffect, useRef } from "react";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

/** Counts up to `value` when it scrolls into view. */
export function AnimatedNumber({ value, suffix = "", duration = 1.1, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  const reduce = useReducedMotion();
  const last = useRef(0);

  useEffect(() => {
    const node = ref.current;
    if (!node || !inView) return;
    if (reduce) {
      node.textContent = `${Math.round(value)}${suffix}`;
      return;
    }
    const controls = animate(last.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => (node.textContent = `${Math.round(v)}${suffix}`),
    });
    last.current = value;
    return () => controls.stop();
  }, [value, inView, suffix, duration, reduce]);

  return (
    <span ref={ref} className={cn("tabular", className)}>
      0{suffix}
    </span>
  );
}

const HEIGHTS = { xs: "h-1.5", sm: "h-2", md: "h-2.5", lg: "h-3.5" };

/** Animated progress bar: "62% complete". Turns green with a check at 100%. */
export function ProgressBar({ value, size = "md", showLabel = true, label, className, tone = "auto" }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const done = pct === 100;
  return (
    <div className={className}>
      {showLabel && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
          <span className="font-medium text-ink-muted">{label ?? (done ? "Complete" : "Progress")}</span>
          <span className={cn("inline-flex items-center gap-1 font-mono font-semibold", done ? "text-success" : "text-ink")}>
            {done && <Check className="h-3.5 w-3.5" aria-hidden />}
            <AnimatedNumber value={pct} suffix="%" />
            <span className="font-sans font-normal text-ink-faint">complete</span>
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
        className={cn("relative w-full overflow-hidden rounded-full bg-surface-3", HEIGHTS[size])}
      >
        <motion.div
          className={cn("absolute inset-y-0 left-0 rounded-full", done ? "progress-fill-done" : tone === "danger" ? "bg-danger" : "progress-fill")}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 60, damping: 18, mass: 0.8 }}
        >
          {!done && pct > 0 && (
            <span className="absolute inset-0 overflow-hidden rounded-full">
              <span className="absolute inset-y-0 w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-white/35 to-transparent" />
            </span>
          )}
        </motion.div>
      </div>
    </div>
  );
}

/** Circular progress used for the headline number on dashboards. */
export function ProgressRing({ value, size = 132, stroke = 11, children }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const id = `ring-${size}-${stroke}`;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={pct === 100 ? "rgb(var(--success))" : "rgb(var(--brand))"} />
            <stop offset="100%" stopColor={pct === 100 ? "rgb(var(--lime))" : "rgb(var(--accent))"} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--surface-3))" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (pct / 100) * c }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center" role="img" aria-label={`${pct}% complete`}>
        {children ?? (
          <>
            <AnimatedNumber value={pct} suffix="%" className="font-display text-3xl font-bold" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">complete</span>
          </>
        )}
      </div>
    </div>
  );
}
