import { Link } from "react-router";
import { motion } from "framer-motion";
import { BarChart3, FileStack, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Aurora } from "@/components/landing/PublicNav";
import { ThemeToggle } from "@/components/layout/AppShell";

export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="relative hidden overflow-hidden border-r border-line bg-surface lg:block">
        <Aurora />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/">
            <Logo />
          </Link>
          <div>
            <motion.h2 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-4xl font-bold leading-tight">
              Your whole project, <span className="text-gradient">one calm place.</span>
            </motion.h2>
            <div className="mt-10 space-y-4">
              {[
                { icon: BarChart3, t: "Live progress bars", d: "See exactly how far every team has come." },
                { icon: FileStack, t: "Versioned files & comments", d: "Faculty can edit, re-upload and explain changes." },
                { icon: ShieldCheck, t: "Server-enforced permissions", d: "Everyone sees only what their role allows." },
              ].map((f, i) => (
                <motion.div
                  key={f.t}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.1 }}
                  className="glass flex max-w-md items-center gap-4 rounded-2xl p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{f.t}</p>
                    <p className="text-xs text-ink-muted">{f.d}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          <p className="text-xs text-ink-faint">EduTrack · Student Project Management System</p>
        </div>
      </div>

      <div className="relative flex flex-col">
        <div className="flex items-center justify-between p-5 lg:justify-end">
          <Link to="/" className="lg:hidden">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 160, damping: 22 }}
            className="w-full max-w-[420px]"
          >
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="mt-2 text-ink-muted">{subtitle}</p>
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 text-center text-sm text-ink-muted">{footer}</div>}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function PasswordStrength({ value }) {
  const checks = [value.length >= 8, /[A-Za-z]/.test(value) && /\d/.test(value), value.length >= 12, /[^A-Za-z0-9]/.test(value)];
  const score = checks.filter(Boolean).length;
  const labels = ["Too short", "Weak", "Okay", "Strong", "Excellent"];
  const colors = ["bg-danger", "bg-danger", "bg-warning", "bg-success", "bg-success"];
  if (!value) return null;
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            className={`h-1 flex-1 rounded-full ${i < score ? colors[score] : "bg-surface-3"}`}
            initial={{ scaleX: 0.3 }}
            animate={{ scaleX: 1 }}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-ink-faint">{labels[score]} · use 8+ characters with letters and numbers</p>
    </div>
  );
}
