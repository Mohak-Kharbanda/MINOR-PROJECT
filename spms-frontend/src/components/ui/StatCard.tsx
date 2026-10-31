import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { AnimatedNumber } from "./Progress";

const TONES = {
  brand: "from-brand/20 to-brand/0 text-brand",
  accent: "from-accent/20 to-accent/0 text-accent",
  success: "from-success/20 to-success/0 text-success",
  warning: "from-warning/25 to-warning/0 text-warning",
  danger: "from-danger/20 to-danger/0 text-danger",
};

export function StatCard({ label, value, suffix, icon, tone = "brand", hint, index = 0 }: { label: string; value: number; suffix?: string; icon: ReactNode; tone?: keyof typeof TONES; hint?: ReactNode; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 260, damping: 24 }}
      className="card card-hover group relative overflow-hidden p-5"
    >
      <div className={cn("pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br opacity-70 blur-2xl transition-opacity group-hover:opacity-100", TONES[tone])} />
      <div className="relative flex items-start justify-between">
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br", TONES[tone])}>{icon}</span>
      </div>
      <p className="relative mt-3 font-display text-3xl font-bold tracking-tight">
        <AnimatedNumber value={value} suffix={suffix} />
      </p>
      {hint && <p className="relative mt-1 text-xs text-ink-faint">{hint}</p>}
    </motion.div>
  );
}
