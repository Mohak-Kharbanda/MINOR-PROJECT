import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Check, Copy, Crown, KeyRound, LogOut, Pencil, Plus, RefreshCcw, UserMinus, UserPlus, UsersRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useDepartments, useMyTeam, useTeamMutation } from "@/hooks/api";
import { api, errorMessage } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button, LinkButton } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { ErrorState, PageSkeleton } from "@/components/ui/States";
import { useConfirm } from "@/components/ui/Confirm";
import { Modal } from "@/components/ui/Modal";

export default function TeamPage() {
  const { data: team, isLoading, error, refetch } = useMyTeam();
  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  return team ? <ManageTeam /> : <NoTeam />;
}

function NoTeam() {
  const { user } = useAuth();
  const { data: departments } = useDepartments();
  const [name, setName] = useState("");
  const [department, setDepartment] = useState(user?.department?.id ?? "");
  const [code, setCode] = useState("");

  const create = useTeamMutation(async () => (await api.post("/teams", { name, department })).data);
  const join = useTeamMutation(async () => (await api.post("/teams/join", { joinCode: code })).data);

  const onCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await create.mutateAsync(undefined);
      toast.success(res.message);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  const onJoin = async (e) => {
    e.preventDefault();
    try {
      const res = await join.mutateAsync(undefined);
      toast.success(res.message);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader title="Form your team" subtitle="Start a new team or join one with the code a teammate shared." />
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.form initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} onSubmit={onCreate} className="card relative overflow-hidden p-7">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand/15 blur-3xl" />
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <Plus className="h-6 w-6" />
          </span>
          <h2 className="relative mt-5 text-xl font-bold">Create a team</h2>
          <p className="relative mt-1 text-sm text-ink-muted">You'll be the team leader and get a join code to share.</p>
          <div className="relative mt-6 space-y-4">
            <Input label="Team name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Byte Brigade" required minLength={2} />
            <Select label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} required>
              <option value="">Select…</option>
              {departments?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
            <Button type="submit" loading={create.isPending} className="w-full" icon={<UsersRound className="h-4 w-4" />}>
              Create team
            </Button>
          </div>
        </motion.form>

        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          onSubmit={onJoin}
          className="card relative overflow-hidden p-7"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/15 blur-3xl" />
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <KeyRound className="h-6 w-6" />
          </span>
          <h2 className="relative mt-5 text-xl font-bold">Join with a code</h2>
          <p className="relative mt-1 text-sm text-ink-muted">Ask your team leader for the 6-character code.</p>
          <div className="relative mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="join-code">
                Join code
              </label>
              <input
                id="join-code"
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                      .slice(0, 6)
                  )
                }
                placeholder="ABC123"
                className="input text-center font-mono text-2xl font-semibold uppercase tracking-[0.5em]"
                autoComplete="off"
                inputMode="text"
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              loading={join.isPending}
              disabled={code.length !== 6}
              className="w-full"
              icon={<UserPlus className="h-4 w-4" />}
            >
              Join team
            </Button>
          </div>
        </motion.form>
      </div>
    </>
  );
}

function ManageTeam() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { data: team } = useMyTeam();
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");

  const add = useTeamMutation(async () => (await api.post(`/teams/${team.id}/members`, { email })).data);
  const remove = useTeamMutation(async (userId) => (await api.delete(`/teams/${team.id}/members/${userId}`)).data);
  const leave = useTeamMutation(async () => (await api.post(`/teams/${team.id}/leave`)).data);
  const regen = useTeamMutation(async () => (await api.post(`/teams/${team.id}/join-code`)).data);
  const rename = useTeamMutation(async () => (await api.patch(`/teams/${team.id}`, { name: newName })).data);

  if (!team) return null;
  const isLeader = team.leader === user?.id;
  const locked = team.project && ["submitted", "evaluated"].includes(team.project.status);
  const full = team.members.length >= team.maxMembers;

  const run = async (fn) => {
    try {
      const res = await fn();
      toast.success(res?.message ?? "Done.");
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={<Badge tone="brand">{team.department?.name}</Badge>}
        title={
          <span className="flex items-center gap-3">
            {team.name}
            {isLeader && (
              <button
                onClick={() => {
                  setNewName(team.name);
                  setRenaming(true);
                }}
                className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-2 hover:text-ink"
                aria-label="Rename team"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </span>
        }
        subtitle={`${team.members.length} of ${team.maxMembers} members${isLeader ? " · you're the team leader" : ""}`}
        actions={
          <Button
            variant="ghost"
            icon={<LogOut className="h-4 w-4" />}
            disabled={Boolean(locked)}
            onClick={async () => {
              const ok = await confirm({
                title: "Leave this team?",
                message:
                  team.members.length === 1
                    ? "You're the only member, so the team will be closed."
                    : "Tasks assigned to you will become unassigned. You can join another team afterwards.",
                confirmLabel: "Leave team",
              });
              if (ok && (await run(() => leave.mutateAsync(undefined)))) navigate("/app");
            }}
          >
            Leave team
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">Members</h2>
          <ul className="divide-y divide-line">
            {team.members.map((m, i) => (
              <motion.li
                key={m.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 py-3"
              >
                <Avatar name={m.name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    {m.name}
                    {m.id === team.leader && <Crown className="h-4 w-4 text-warning" aria-label="Team leader" />}
                    {m.id === user?.id && <span className="text-xs text-ink-faint">(you)</span>}
                  </p>
                  <p className="truncate text-sm text-ink-faint">
                    {m.email}
                    {m.usn && <> · {m.usn}</>}
                  </p>
                </div>
                {isLeader && m.id !== user?.id && !locked && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<UserMinus className="h-4 w-4" />}
                    onClick={async () => {
                      if (
                        await confirm({
                          title: `Remove ${m.name}?`,
                          message: "Their tasks will become unassigned. They can join another team.",
                          confirmLabel: "Remove",
                        })
                      ) {
                        await run(() => remove.mutateAsync(m.id));
                      }
                    }}
                  >
                    Remove
                  </Button>
                )}
              </motion.li>
            ))}
          </ul>
          {!locked && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (await run(() => add.mutateAsync(undefined))) setEmail("");
              }}
              className="mt-5 flex flex-col gap-2 border-t border-line pt-5 sm:flex-row"
            >
              <Input
                wrapperClassName="flex-1"
                type="email"
                placeholder={full ? "Team is full" : "teammate@college.edu"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={full}
                aria-label="Teammate email"
              />
              <Button type="submit" variant="secondary" loading={add.isPending} disabled={full || !email} icon={<UserPlus className="h-4 w-4" />}>
                Add by email
              </Button>
            </form>
          )}
          {locked && <p className="mt-4 text-sm text-ink-faint">Team membership is locked after the final submission.</p>}
        </section>

        <div className="space-y-6">
          <section className="card relative overflow-hidden p-6">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand/15 blur-3xl" />
            <p className="relative text-sm font-medium text-ink-muted">Join code</p>
            <div className="relative mt-2 flex items-center justify-between gap-3">
              <p className="font-mono text-3xl font-bold tracking-[0.35em]">{team.joinCode}</p>
              <Button
                variant="outline"
                size="icon"
                aria-label="Copy join code"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(team.joinCode ?? "");
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch {
                    toast.error("Couldn't copy — select the code instead.");
                  }
                }}
              >
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="relative mt-2 text-xs text-ink-faint">Share this with teammates so they can join.</p>
            {isLeader && (
              <Button
                variant="ghost"
                size="sm"
                className="relative mt-3 -ml-2"
                icon={<RefreshCcw className="h-3.5 w-3.5" />}
                onClick={async () => {
                  if (
                    await confirm({
                      title: "Generate a new code?",
                      message: "The current code will stop working immediately.",
                      confirmLabel: "Generate",
                      tone: "primary",
                    })
                  ) {
                    await run(() => regen.mutateAsync(undefined));
                  }
                }}
              >
                New code
              </Button>
            )}
          </section>
          <section className="card p-6">
            <p className="text-sm font-medium text-ink-muted">Project</p>
            {team.project ? (
              <>
                <p className="mt-2 font-semibold">{team.project.title}</p>
                <div className="mt-2">
                  <StatusBadge status={team.project.status} />
                </div>
                <LinkButton to={`/app/projects/${team.project.id}`} className="mt-4" size="sm">
                  Open workspace
                </LinkButton>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-ink-muted">Your team hasn't proposed a project yet.</p>
                <LinkButton to="/app" className="mt-4" size="sm">
                  Write a proposal
                </LinkButton>
              </>
            )}
          </section>
        </div>
      </div>

      <Modal
        open={renaming}
        onClose={() => setRenaming(false)}
        size="sm"
        title="Rename team"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenaming(false)}>
              Cancel
            </Button>
            <Button loading={rename.isPending} onClick={async () => (await run(() => rename.mutateAsync(undefined))) && setRenaming(false)}>
              Save
            </Button>
          </>
        }
      >
        <Input label="Team name" value={newName} onChange={(e) => setNewName(e.target.value)} />
      </Modal>
    </>
  );
}
