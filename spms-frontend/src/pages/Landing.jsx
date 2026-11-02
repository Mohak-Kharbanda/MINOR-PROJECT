import { useState } from "react";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileStack,
  GraduationCap,
  KanbanSquare,
  LockKeyhole,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Trophy,
  Upload,
  UsersRound,
} from "lucide-react";
import { Aurora, PublicNav } from "@/components/landing/PublicNav";
import { HeroPreview } from "@/components/landing/HeroPreview";
import { LinkButton } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Tabs";
import { Logo } from "@/components/ui/Logo";
import { ProgressBar } from "@/components/ui/Progress";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/cn";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, type: "spring", stiffness: 120, damping: 20 } }),
};

const MARQUEE = [
  "Proposals",
  "Faculty review",
  "Teams & join codes",
  "Kanban tasks",
  "Deadlines",
  "Versioned files",
  "Inline comments",
  "Final submission",
  "Marks & evaluation",
  "Audit trail",
  "Role-based access",
];

const FEATURES = [
  {
    icon: ClipboardCheck,
    title: "Proposal to approval",
    body: "Teams send proposals to their guide. Faculty approve or reject with feedback, and every decision is timestamped.",
    span: "md:col-span-2",
    demo: "timeline",
  },
  { icon: UsersRound, title: "Teams in seconds", body: "Create a team, share a 6-character join code, done. One team per student, enforced by the database." },
  {
    icon: KanbanSquare,
    title: "Drag-and-drop tasks",
    body: "Assign work to teammates with priorities and due dates. Overdue tasks light up before they become a problem.",
  },
  {
    icon: FileStack,
    title: "Files with a memory",
    body: "Upload, and re-upload. Faculty can download a draft, edit it and upload a revised version with comments — every version is kept.",
    span: "md:col-span-2",
    demo: "files",
  },
  { icon: BarChart3, title: "Progress everyone can see", body: "Students see “62% complete”. Faculty see each of their teams. Admins see every team, ranked." },
  { icon: Trophy, title: "Marks & evaluation", body: "Record marks and evaluation notes after the final submission, with evaluator and date on file." },
  {
    icon: ShieldCheck,
    title: "Secure by default",
    body: "Permissions are enforced on the server for every request, not just hidden buttons. Files use short-lived private links.",
  },
];

const ROLES = {
  student: {
    icon: GraduationCap,
    title: "For students",
    lead: "Spend time building, not chasing emails.",
    points: [
      "Create or join a team with a code",
      "Propose your project and pick a guide",
      "Plan tasks on a board and assign teammates",
      "Upload files and final deliverables",
      "Track progress and see feedback in one place",
    ],
  },
  faculty: {
    icon: ClipboardCheck,
    title: "For faculty",
    lead: "Every team you guide, at a glance.",
    points: [
      "Review proposals and approve or reject with feedback",
      "See each team's progress bar and overdue work",
      "Open, comment on and re-upload edited files",
      "Return submissions for changes",
      "Enter marks and evaluation notes",
    ],
  },
  admin: {
    icon: LockKeyhole,
    title: "For administrators",
    lead: "The whole department, without spreadsheets.",
    points: [
      "Create student and faculty accounts",
      "Manage departments and faculty assignments",
      "See every team ranked by progress",
      "Spot at-risk projects early",
      "Full audit trail of key actions",
    ],
  },
};

const STEPS = [
  { title: "Draft", body: "Team writes the proposal" },
  { title: "Review", body: "Guide approves or asks for changes" },
  { title: "Build", body: "Tasks, files and feedback" },
  { title: "Submit", body: "Final deliverables uploaded" },
  { title: "Evaluate", body: "Marks and notes recorded" },
];

function TimelineDemo() {
  return (
    <div className="mt-6 flex items-center gap-2">
      {["Draft", "Review", "Approved"].map((s, i) => (
        <motion.div
          key={s}
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 + i * 0.25 }}
          className="flex items-center gap-2"
        >
          <span className={cn("rounded-full px-3 py-1 text-xs font-medium", i === 2 ? "bg-success-soft text-success" : "bg-surface-2 text-ink-muted")}>
            {i === 2 && <CheckCircle2 className="-ml-0.5 mr-1 inline h-3.5 w-3.5" />}
            {s}
          </span>
          {i < 2 && (
            <motion.span
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35 + i * 0.25 }}
              className="h-px w-6 origin-left bg-line sm:w-10"
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}

function FilesDemo() {
  return (
    <div className="mt-6 space-y-2">
      {[
        { v: "v1", who: "Aarav · student", note: "First draft" },
        { v: "v2", who: "Dr. Iyer · faculty", note: "Fixed methodology, see comments" },
        { v: "v3", who: "Diya · student", note: "Addressed all comments" },
      ].map((r, i) => (
        <motion.div
          key={r.v}
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 + i * 0.15 }}
          className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/60 px-3 py-2 text-sm"
        >
          <span className="rounded-md bg-brand px-1.5 py-0.5 font-mono text-[11px] font-semibold text-brand-ink">{r.v}</span>
          <span className="font-medium">{r.who}</span>
          <span className="truncate text-ink-faint">— {r.note}</span>
        </motion.div>
      ))}
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const [role, setRole] = useState("student");
  const R = ROLES[role];

  return (
    <div className="relative overflow-x-hidden">
      <PublicNav />

      {/* ───────── Hero ───────── */}
      <section className="relative pb-24 pt-32 sm:pt-40">
        <Aurora />
        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:px-8">
          <div>
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand-soft/70 px-3.5 py-1.5 text-xs font-semibold text-brand backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" /> Built for final-year & minor projects
              </span>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={1}
              className="mt-6 text-[2.75rem] font-extrabold leading-[1.02] sm:text-6xl lg:text-[4.25rem]"
            >
              Every project, from proposal to <span className="text-gradient animate-gradient-x">top marks.</span>
            </motion.h1>
            <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2} className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
              EduTrack puts students, faculty and admins on one platform. Teams, tasks, files, feedback, progress and marks all live there, so nobody has to dig
              through emails and spreadsheets.
            </motion.p>
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="mt-9 flex flex-wrap items-center gap-3">
              <LinkButton to={user ? "/app" : "/register"} size="lg" icon={<ArrowRight className="h-4 w-4" />} className="flex-row-reverse">
                {user ? "Open your dashboard" : "Get started free"}
              </LinkButton>
              {!user && (
                <LinkButton to="/login" size="lg" variant="outline">
                  Sign in
                </LinkButton>
              )}
            </motion.div>
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="mt-10 grid max-w-md grid-cols-3 gap-6">
              {[
                ["3", "roles, one platform"],
                ["7", "project stages"],
                ["25MB", "per upload"],
              ].map(([n, l]) => (
                <div key={l}>
                  <p className="font-display text-2xl font-bold">{n}</p>
                  <p className="text-xs text-ink-faint">{l}</p>
                </div>
              ))}
            </motion.div>
          </div>
          <HeroPreview />
        </div>
      </section>

      {/* ───────── Marquee ───────── */}
      <section className="border-y border-line bg-surface/60 py-5 backdrop-blur">
        <div className="mask-fade-x overflow-hidden">
          <div className="flex w-max animate-marquee gap-10 pr-10">
            {[...MARQUEE, ...MARQUEE].map((m, i) => (
              <span key={i} className="flex items-center gap-10 whitespace-nowrap font-display text-lg font-semibold text-ink-muted">
                {m}
                <Sparkles className="h-4 w-4 text-brand/60" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Features ───────── */}
      <section id="features" className="relative mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6 lg:px-8">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">Everything in one place</p>
          <h2 className="mt-3 text-4xl font-bold sm:text-5xl">Built around how projects actually run</h2>
          <p className="mt-4 text-lg text-ink-muted">One workspace per project with the proposal, tasks, files, feedback, submission and marks together.</p>
        </motion.div>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              custom={i % 3}
              className={cn("card card-hover group relative overflow-hidden p-6", f.span)}
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand/10 blur-3xl transition-all duration-500 group-hover:bg-brand/25" />
              <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-accent text-white shadow-glow">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="relative mt-5 text-xl font-semibold">{f.title}</h3>
              <p className="relative mt-2 text-[15px] leading-relaxed text-ink-muted">{f.body}</p>
              {f.demo === "timeline" && <TimelineDemo />}
              {f.demo === "files" && <FilesDemo />}
              {f.title.startsWith("Progress") && (
                <div className="relative mt-5">
                  <ProgressBar value={62} size="sm" label="Byte Brigade" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ───────── Roles ───────── */}
      <section id="roles" className="relative scroll-mt-20 overflow-hidden border-y border-line bg-surface/50 py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand">Three roles</p>
            <h2 className="mt-3 text-4xl font-bold sm:text-5xl">Each role sees only what it should</h2>
            <p className="mt-4 text-lg text-ink-muted">
              Students, faculty and admins each get their own dashboard. The server checks permissions on every request, not just which buttons are shown.
            </p>
            <div className="mt-8">
              <Segmented
                layoutId="role-tabs"
                value={role}
                onChange={setRole}
                options={[
                  { id: "student", label: "Student" },
                  { id: "faculty", label: "Faculty" },
                  { id: "admin", label: "Admin" },
                ]}
              />
            </div>
          </motion.div>
          <motion.div
            key={role}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
            className="card relative overflow-hidden p-8"
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent/15 blur-3xl" />
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <R.icon className="h-6 w-6" />
            </span>
            <h3 className="mt-5 text-2xl font-bold">{R.title}</h3>
            <p className="mt-1 text-ink-muted">{R.lead}</p>
            <ul className="mt-6 space-y-3">
              {R.points.map((p, i) => (
                <motion.li
                  key={p}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="flex items-start gap-3 text-[15px]"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  {p}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ───────── Workflow ───────── */}
      <section id="workflow" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6 lg:px-8">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">The workflow</p>
          <h2 className="mt-3 text-4xl font-bold sm:text-5xl">Five steps. Zero chaos.</h2>
        </motion.div>
        <div className="relative mt-16">
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-[10%] right-[10%] top-6 hidden h-0.5 origin-left bg-gradient-to-r from-brand via-accent to-[rgb(var(--lime))] md:block"
          />
          <div className="grid gap-8 md:grid-cols-5">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                custom={i}
                className="relative text-center"
              >
                <span className="relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface font-display text-lg font-bold shadow-lift">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-ink-muted">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-line bg-ink px-6 py-16 text-center sm:px-12"
        >
          <div className="pointer-events-none absolute inset-0 opacity-80">
            <div className="absolute -left-20 -top-20 h-72 w-72 animate-aurora rounded-full bg-brand/50 blur-[90px]" />
            <div className="absolute -bottom-24 right-0 h-72 w-96 animate-aurora rounded-full bg-accent/40 blur-[100px] [animation-delay:-8s]" />
          </div>
          <div className="relative">
            <Upload className="mx-auto h-10 w-10 text-[rgb(var(--lime))]" />
            <h2 className="mt-5 text-4xl font-bold text-bg sm:text-5xl">Ready to ship your project?</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-bg/70">Create your account, start a team and send your proposal today.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <LinkButton to={user ? "/app" : "/register"} size="lg" className="bg-[rgb(var(--lime))] text-black shadow-none hover:brightness-105">
                {user ? "Go to dashboard" : "Create your account"}
              </LinkButton>
            </div>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-ink-faint sm:flex-row sm:px-6 lg:px-8">
          <Logo />
          <p className="flex items-center gap-1.5">
            <ScrollText className="h-4 w-4" /> EduTrack · Student Project Management System
          </p>
        </div>
      </footer>
    </div>
  );
}
