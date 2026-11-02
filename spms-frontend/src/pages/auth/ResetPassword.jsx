import { useState } from "react";
import { useSearchParams } from "react-router";
import { motion } from "framer-motion";
import { CheckCircle2, KeyRound } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { Button, LinkButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { AuthLayout, PasswordStrength } from "./AuthLayout";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (password !== confirm) return setError("The two passwords don't match.");
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { token, newPassword: password });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Reset links work once and expire after 60 minutes.">
      {!token ? (
        <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          This link is missing its reset token. Request a new one from the sign-in page.
        </p>
      ) : done ? (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="card p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
          <p className="mt-4 font-semibold">Password updated</p>
          <p className="mt-1 text-sm text-ink-muted">All your other sessions were signed out.</p>
          <LinkButton to="/login" className="mt-5">
            Sign in
          </LinkButton>
        </motion.div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Input label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <PasswordStrength value={password} />
          </div>
          <Input label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" loading={loading} className="w-full" icon={<KeyRound className="h-4 w-4" />}>
            Update password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
