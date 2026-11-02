import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Check, Copy, KeyRound, Link2, Pencil, Search, UserCheck, UserPlus, UserX, Users as UsersIcon } from "lucide-react";
import { ROLES } from "@edutrack/shared/constants";
import { useAuth } from "@/context/AuthContext";
import { useAdminMutation, useDepartments, useUsers } from "@/hooks/api";
import { useDebounce } from "@/hooks/useDebounce";
import { api, errorMessage, fieldErrors } from "@/lib/api";
import { formatDate, timeAgo } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, RoleBadge } from "@/components/ui/Badge";
import { Menu } from "@/components/ui/Menu";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useConfirm } from "@/components/ui/Confirm";

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 break-all rounded-xl border border-line bg-surface-2 px-3 py-2.5 font-mono text-sm">{value}</code>
        <Button
          variant="outline"
          size="icon"
          aria-label={`Copy ${label}`}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              toast.error("Couldn't copy. Select the text instead.");
            }
          }}
        >
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export default function Users() {
  const { user: me } = useAuth();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [params] = useSearchParams();
  const [role, setRole] = useState(params.get("role") ?? "");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search);
  const { data: departments } = useDepartments();
  const { data, isLoading, isFetching, error, refetch } = useUsers({ page, limit: 15, search: debounced, role, status, department });
  const [editing, setEditing] = useState(null);
  const [secret, setSecret] = useState(null);

  const action = useAdminMutation(async ({ id, op, body }) => (await api.post(`/users/${id}/${op}`, body ?? {})).data);

  const reset = (fn) => (e) => {
    fn(e.target.value);
    setPage(1);
  };

  async function run(id, op, success) {
    try {
      const res = await action.mutateAsync({ id, op });
      if (success) success(res.data);
      else toast.success(res.message);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Create and manage student, faculty and admin accounts."
        actions={
          <Button icon={<UserPlus className="h-4 w-4" />} onClick={() => setEditing("new")}>
            New user
          </Button>
        }
      />

      <div className="card mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          leading={<Search className="h-4 w-4" />}
          placeholder="Name, email or USN…"
          value={search}
          onChange={reset(setSearch)}
          aria-label="Search users"
        />
        <Select aria-label="Role" value={role} onChange={reset(setRole)}>
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r[0].toUpperCase() + r.slice(1)}
            </option>
          ))}
        </Select>
        <Select aria-label="Department" value={department} onChange={reset(setDepartment)}>
          <option value="">All departments</option>
          {departments?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <Select aria-label="Status" value={status} onChange={reset(setStatus)}>
          <option value="">Active & inactive</option>
          <option value="active">Active</option>
          <option value="inactive">Deactivated</option>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !data?.data.length ? (
        <EmptyState icon={<UsersIcon className="h-6 w-6" />} title="No users found" hint="Try different filters, or create a new account." />
      ) : (
        <div className={isFetching ? "opacity-70 transition-opacity" : "transition-opacity"}>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2/60 text-left text-xs uppercase tracking-wider text-ink-faint">
                    <th className="px-5 py-3 font-semibold">User</th>
                    <th className="px-5 py-3 font-semibold">Role</th>
                    <th className="px-5 py-3 font-semibold">Department</th>
                    <th className="px-5 py-3 font-semibold">Last sign-in</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.data.map((u, i) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="transition hover:bg-surface-2/40"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} />
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {u.name} {u.id === me?.id && <span className="text-xs text-ink-faint">(you)</span>}
                            </p>
                            <p className="truncate text-xs text-ink-faint">
                              {u.email}
                              {u.usn && <> · {u.usn}</>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{u.department?.name ?? "—"}</td>
                      <td className="px-5 py-3 text-ink-muted">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Never"}</td>
                      <td className="px-5 py-3">
                        {u.isActive ? (
                          <Badge tone="success" dot>
                            Active
                          </Badge>
                        ) : (
                          <Badge tone="danger" dot>
                            Deactivated
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Menu
                          items={[
                            { label: "Edit details", icon: <Pencil className="h-4 w-4" />, onClick: () => setEditing(u) },
                            {
                              label: "Generate reset link",
                              icon: <Link2 className="h-4 w-4" />,
                              hidden: !u.isActive,
                              onClick: () =>
                                run(u.id, "reset-link", (d) =>
                                  setSecret({
                                    title: `Reset link for ${u.name}`,
                                    label: "One-time link (valid 60 minutes)",
                                    value: d.link,
                                    note: "Send this to the user through a trusted channel (college email, in person). It works once.",
                                  })
                                ),
                            },
                            {
                              label: "Set temporary password",
                              icon: <KeyRound className="h-4 w-4" />,
                              onClick: async () => {
                                if (
                                  await confirm({
                                    title: `Reset ${u.name}'s password?`,
                                    message: "A temporary password is generated and all their sessions are signed out.",
                                    confirmLabel: "Reset password",
                                    tone: "primary",
                                  })
                                ) {
                                  run(u.id, "temporary-password", (d) =>
                                    setSecret({
                                      title: `Temporary password for ${u.name}`,
                                      label: "Temporary password",
                                      value: d.temporaryPassword,
                                      note: "Shown once. Share it securely and ask them to change it after signing in.",
                                    })
                                  );
                                }
                              },
                            },
                            {
                              label: "Deactivate",
                              icon: <UserX className="h-4 w-4" />,
                              danger: true,
                              hidden: !u.isActive || u.id === me?.id,
                              onClick: async () => {
                                if (
                                  await confirm({
                                    title: `Deactivate ${u.name}?`,
                                    message: "They'll be signed out immediately and can't sign in until reactivated. Their projects and history are kept.",
                                    confirmLabel: "Deactivate",
                                  })
                                )
                                  run(u.id, "deactivate");
                              },
                            },
                            { label: "Reactivate", icon: <UserCheck className="h-4 w-4" />, hidden: u.isActive, onClick: () => run(u.id, "reactivate") },
                          ]}
                        />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination pagination={data.pagination} onPage={setPage} />
        </div>
      )}

      <UserFormModal
        target={editing}
        onClose={() => setEditing(null)}
        onCreated={(name, pw) =>
          pw &&
          setSecret({
            title: `Account created for ${name}`,
            label: "Temporary password",
            value: pw,
            note: "Shown once. Share it securely; they can change it from their Account page.",
          })
        }
      />

      <Modal open={Boolean(secret)} onClose={() => setSecret(null)} title={secret?.title ?? ""} footer={<Button onClick={() => setSecret(null)}>Done</Button>}>
        {secret && (
          <div className="space-y-3">
            <CopyField label={secret.label} value={secret.value} />
            <p className="text-sm text-ink-muted">{secret.note}</p>
          </div>
        )}
      </Modal>
    </>
  );
}

function UserFormModal({ target, onClose, onCreated }) {
  const { user: me } = useAuth();
  const isNew = target === "new";
  const { data: departments } = useDepartments();
  const [form, setForm] = useState({ name: "", email: "", role: "student", usn: "", department: "", password: "" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setErrors({});
    if (target && target !== "new")
      setForm({ name: target.name, email: target.email, role: target.role, usn: target.usn ?? "", department: target.department?.id ?? "", password: "" });
    else if (target === "new") setForm({ name: "", email: "", role: "student", usn: "", department: "", password: "" });
  }, [target]);

  const save = useAdminMutation(async () => {
    if (isNew) return (await api.post("/users", form)).data;
    const { name, usn, department, role } = form;
    return (await api.patch(`/users/${target.id}`, { name, usn, department, role })).data;
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const editingSelf = target !== "new" && target?.id === me?.id;

  return (
    <Modal
      open={target !== null}
      onClose={onClose}
      title={isNew ? "Create account" : "Edit user"}
      description={isNew ? "Leave the password blank to generate a temporary one." : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={save.isPending}
            onClick={async () => {
              try {
                const res = await save.mutateAsync(undefined);
                toast.success(res.message);
                if (isNew) onCreated(form.name, res.data.temporaryPassword);
                onClose();
              } catch (err) {
                setErrors(fieldErrors(err));
                toast.error(errorMessage(err));
              }
            }}
          >
            {isNew ? "Create account" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input wrapperClassName="sm:col-span-2" label="Full name" value={form.name} onChange={set("name")} error={errors.name} />
        <Input
          wrapperClassName="sm:col-span-2"
          label="Email"
          type="email"
          value={form.email}
          onChange={set("email")}
          error={errors.email}
          disabled={!isNew}
          hint={!isNew ? "Email can't be changed." : undefined}
        />
        <Select
          label="Role"
          value={form.role}
          onChange={set("role")}
          error={errors.role}
          disabled={editingSelf}
          hint={editingSelf ? "You can't change your own role." : undefined}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r[0].toUpperCase() + r.slice(1)}
            </option>
          ))}
        </Select>
        <Select label="Department" value={form.department} onChange={set("department")} error={errors.department}>
          <option value="">{form.role === "admin" ? "None" : "Select…"}</option>
          {departments?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        {form.role === "student" && <Input label="Student ID (USN)" value={form.usn} onChange={set("usn")} error={errors.usn} />}
        {isNew && (
          <Input
            label="Password (optional)"
            type="password"
            value={form.password}
            onChange={set("password")}
            error={errors.password}
            hint="8+ characters, letters and numbers"
          />
        )}
        {!isNew && target && <p className="text-xs text-ink-faint sm:col-span-2">Member since {formatDate(target.createdAt)}.</p>}
      </div>
    </Modal>
  );
}
