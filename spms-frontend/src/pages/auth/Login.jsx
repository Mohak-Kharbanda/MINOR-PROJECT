import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn, Mail, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { usePublicConfig } from "@/hooks/api";
import { errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { AuthLayout } from "./AuthLayout";

const DEMO = [
  { role: "Student", email: "aarav@edutrack.test", hint: "In progress, 50%" },
  { role: "Faculty", email: "meera.iyer@edutrack.test", hint: "Guides 2 teams" },
  { role: "Admin", email: "admin@edutrack.test", hint: "Everything" },
];

export default function Login() {
  const { login } = useAuth();
  const { data: config } = usePublicConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
      const from = location.state?.from;
      navigate(from?.startsWith("/app") ? from : "/app", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Invalid email or password."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue to your workspace."
      footer={
        config?.allowStudentSignup !== false ? (
          <>
            New student?{" "}
            <Link to="/register" className="font-semibold text-brand hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          "Accounts are created by your administrator."
        )
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@college.edu"
          leading={<Mail className="h-4 w-4" />}
        />
        <div>
          <div className="relative">
            <Input
              label="Password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute bottom-2.5 right-3 text-ink-faint hover:text-ink"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-xs font-medium text-brand hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm text-danger"
          >
            {error}
          </motion.p>
        )}
        <Button type="submit" size="lg" loading={loading} className="w-full" icon={<LogIn className="h-4 w-4" />}>
          Sign in
        </Button>
      </form>

      {config?.demoMode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 rounded-2xl border border-dashed border-brand/30 bg-brand-soft/40 p-4"
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-brand">
            <Sparkles className="h-4 w-4" /> Demo accounts
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Password for all: <span className="kbd">Password123</span>
          </p>
          <div className="mt-3 grid gap-2">
            {DEMO.map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => {
                  setEmail(d.email);
                  setPassword("Password123");
                }}
                className="flex items-center justify-between rounded-xl border border-line bg-surface px-3 py-2 text-left text-sm transition hover:border-brand/40"
              >
                <span>
                  <span className="font-semibold">{d.role}</span> <span className="text-ink-faint">· {d.email}</span>
                </span>
                <span className="hidden text-xs text-ink-faint sm:block">{d.hint}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AuthLayout>
  );
}
