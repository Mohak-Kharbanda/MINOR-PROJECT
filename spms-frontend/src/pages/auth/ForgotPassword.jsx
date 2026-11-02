import { useState } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { MailCheck, Send } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { AuthLayout } from "./AuthLayout";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/forgot-password", { email });
      setDone({ message: res.data.message, emailConfigured: res.data.data.emailConfigured });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll help you get back into your account."
      footer={
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Back to sign in
        </Link>
      }
    >
      {done ? (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="card p-6 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-success" />
          <p className="mt-4 font-semibold">Check your inbox</p>
          <p className="mt-2 text-sm text-ink-muted">{done.message}</p>
          {!done.emailConfigured && (
            <p className="mt-4 rounded-xl bg-warning-soft px-3 py-2 text-xs text-warning">
              Email delivery isn't set up on this server. Ask your administrator to generate a reset link for you from the Users page.
            </p>
          )}
        </motion.div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@college.edu"
          />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" loading={loading} className="w-full" icon={<Send className="h-4 w-4" />}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
