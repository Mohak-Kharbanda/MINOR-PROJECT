import { useState } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { KeyRound, LogOut, Save, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { RoleBadge } from "@/components/ui/Badge";
import { useConfirm } from "@/components/ui/Confirm";
import { PasswordStrength } from "@/pages/auth/AuthLayout";

export default function Account() {
  const { user, setSession, logout } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [name, setName] = useState(user?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  if (!user) return null;

  async function saveName(e) {
    e.preventDefault();
    setSavingName(true);
    try {
      const res = await api.patch("/auth/me", { name });
      setSession({ user: res.data.data.user });
      toast.success(res.data.message);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) return setPwError("The new passwords don't match.");
    setSavingPw(true);
    setPwError("");
    try {
      const res = await api.post("/auth/change-password", { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setSession({ accessToken: res.data.data.accessToken });
      setPw({ currentPassword: "", newPassword: "", confirm: "" });
      toast.success(res.data.message);
    } catch (err) {
      setPwError(errorMessage(err));
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <>
      <PageHeader title="Account" subtitle="Your profile and security settings." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <section className="card p-6">
          <div className="flex items-center gap-4">
            <Avatar name={user.name} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-xl font-bold">{user.name}</p>
              <p className="truncate text-sm text-ink-faint">{user.email}</p>
              <div className="mt-2">
                <RoleBadge role={user.role} />
              </div>
            </div>
          </div>
          <dl className="mt-6 space-y-2.5 border-t border-line pt-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-faint">Department</dt>
              <dd className="font-medium">{user.department?.name ?? "—"}</dd>
            </div>
            {user.usn && (
              <div className="flex justify-between">
                <dt className="text-ink-faint">Student ID</dt>
                <dd className="font-mono font-medium">{user.usn}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-faint">Member since</dt>
              <dd className="font-medium">{formatDate(user.createdAt)}</dd>
            </div>
          </dl>
          <form onSubmit={saveName} className="mt-6 space-y-3 border-t border-line pt-5">
            <Input label="Display name" value={name} onChange={(e) => setName(e.target.value)} />
            <Button
              type="submit"
              variant="secondary"
              loading={savingName}
              disabled={name.trim() === user.name || name.trim().length < 2}
              icon={<Save className="h-4 w-4" />}
            >
              Save name
            </Button>
          </form>
        </section>

        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <KeyRound className="h-5 w-5 text-brand" /> Change password
            </h2>
            <p className="mt-1 text-sm text-ink-muted">Changing your password signs you out everywhere else.</p>
            <form onSubmit={savePassword} className="mt-5 space-y-4">
              <Input
                label="Current password"
                type="password"
                autoComplete="current-password"
                value={pw.currentPassword}
                onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))}
              />
              <div>
                <Input
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  value={pw.newPassword}
                  onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))}
                />
                <PasswordStrength value={pw.newPassword} />
              </div>
              <Input
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                value={pw.confirm}
                onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                error={pwError}
              />
              <Button type="submit" loading={savingPw} disabled={!pw.currentPassword || !pw.newPassword}>
                Update password
              </Button>
            </form>
          </section>

          <section className="card p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ShieldCheck className="h-5 w-5 text-success" /> Sessions
            </h2>
            <p className="mt-1 text-sm text-ink-muted">Lost a device or used a shared computer? Sign out of EduTrack everywhere.</p>
            <Button
              variant="outline"
              className="mt-4 hover:border-danger/40 hover:text-danger"
              icon={<LogOut className="h-4 w-4" />}
              onClick={async () => {
                if (
                  !(await confirm({
                    title: "Sign out of all devices?",
                    message: "Every session, including this one, will end.",
                    confirmLabel: "Sign out everywhere",
                  }))
                )
                  return;
                try {
                  await api.post("/auth/logout-all");
                } catch {
                  /* signing out locally regardless */
                }
                await logout();
                navigate("/login");
              }}
            >
              Sign out of all devices
            </Button>
          </section>
        </div>
      </div>
    </>
  );
}
