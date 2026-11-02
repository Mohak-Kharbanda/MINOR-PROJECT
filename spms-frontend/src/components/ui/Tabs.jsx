import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

export function Tabs({ tabs, value, onChange, layoutId = "tabs" }) {
  return (
    <div role="tablist" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto border-b border-line px-1">
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              "relative flex shrink-0 items-center gap-2 px-3.5 pb-3 pt-2 text-sm font-medium transition-colors",
              active ? "text-ink" : "text-ink-muted hover:text-ink"
            )}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && (
              <span className={cn("rounded-full px-1.5 py-px font-mono text-[11px]", active ? "bg-brand text-brand-ink" : "bg-surface-2 text-ink-faint")}>
                {t.count}
              </span>
            )}
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Pill-style segmented control for filters. */
export function Segmented({ options, value, onChange, layoutId = "segmented" }) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          aria-pressed={o.id === value}
          className={cn("relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors", o.id === value ? "text-ink" : "text-ink-muted hover:text-ink")}
        >
          {o.id === value && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 rounded-lg bg-surface shadow-card"
              transition={{ type: "spring", stiffness: 500, damping: 38 }}
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
