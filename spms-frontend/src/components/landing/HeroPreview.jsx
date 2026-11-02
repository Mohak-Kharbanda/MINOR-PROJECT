import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { CheckCircle2, FileText, MessageSquareText, Trophy } from "lucide-react";
import { AvatarStack } from "@/components/ui/Avatar";

const TEAMS = [
  { name: "Byte Brigade", project: "Face-recognition attendance", members: ["Aarav Sharma", "Diya Patel", "Kabir Singh", "Ananya Gupta"], start: 62 },
  { name: "Circuit Breakers", project: "IoT air-quality network", members: ["Saanvi Bhat", "Arnav Hegde", "Meghana Rao"], start: 88 },
  { name: "Neural Ninjas", project: "Crop disease detection", members: ["Vihaan Reddy", "Isha Kulkarni", "Rohan Joshi"], start: 34 },
  { name: "Data Dynamos", project: "Placement analytics", members: ["Tanvi Shetty", "Yash Agarwal"], start: 15 },
];

function MiniBar({ value }) {
  const done = value >= 100;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
      <motion.div
        className={done ? "progress-fill-done h-full rounded-full" : "progress-fill h-full rounded-full"}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ type: "spring", stiffness: 50, damping: 16 }}
      />
    </div>
  );
}

/** Decorative, animated product preview for the landing hero (illustrative data). */
export function HeroPreview() {
  const [values, setValues] = useState(TEAMS.map((t) => t.start));
  useEffect(() => {
    const id = setInterval(() => {
      setValues((prev) => prev.map((v) => (v >= 100 ? 100 : Math.min(100, v + Math.round(Math.random() * 7)))));
    }, 2200);
    return () => clearInterval(id);
  }, []);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), { stiffness: 120, damping: 18 });

  return (
    <div
      className="relative mx-auto w-full max-w-[560px] [perspective:1400px]"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      aria-hidden
    >
      <motion.div
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.25, type: "spring", stiffness: 90, damping: 18 }}
      >
        <div className="glass rounded-3xl p-5 shadow-[0_40px_120px_-30px_rgb(var(--brand)/0.55)] sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Team progress</p>
              <p className="font-display text-lg font-semibold">Odd Semester 2026</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> On track
            </span>
          </div>
          <div className="space-y-4">
            {TEAMS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.1 }}
                className="rounded-2xl border border-line bg-surface/80 p-3.5"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{t.name}</p>
                    <p className="truncate text-xs text-ink-faint">{t.project}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <AvatarStack names={t.members} max={3} />
                    <span className="w-12 text-right font-mono text-sm font-semibold tabular">{values[i]}%</span>
                  </div>
                </div>
                <MiniBar value={values[i]} />
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="absolute -left-6 -top-6 hidden sm:block"
        >
          <div className="glass flex animate-float items-center gap-3 rounded-2xl px-4 py-3 shadow-lift">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <div>
              <p className="text-sm font-semibold">Proposal approved</p>
              <p className="text-xs text-ink-faint">Dr. Meera Iyer · just now</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.25 }}
          className="absolute -bottom-8 -right-4 hidden sm:block"
        >
          <div className="glass w-64 animate-float rounded-2xl p-4 shadow-lift [animation-delay:-3s]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">final-report.pdf</p>
                <p className="text-xs text-ink-faint">v3 · re-uploaded by faculty</p>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-surface-2 p-2.5 text-xs text-ink-muted">
              <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              “Restructured the methodology — continue from this version.”
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5, type: "spring" }}
          className="absolute -right-6 top-16 hidden lg:block"
        >
          <div className="glass flex items-center gap-2 rounded-2xl px-3.5 py-2.5 shadow-lift">
            <Trophy className="h-4 w-4 text-warning" />
            <span className="font-mono text-sm font-semibold">88/100</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
