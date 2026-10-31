import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Building2, FolderKanban, Pencil, Plus, Trash2, Users, UsersRound } from "lucide-react";
import type { DepartmentDTO } from "@edutrack/shared/types";
import { useAdminMutation, useDepartments } from "@/hooks/api";
import { api, errorMessage, fieldErrors } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useConfirm } from "@/components/ui/Confirm";

export default function Departments() {
  const { data, isLoading, error, refetch } = useDepartments();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<DepartmentDTO | "new" | null>(null);
  const del = useAdminMutation(async (id: string) => (await api.delete(`/departments/${id}`)).data, [["departments"]]);

  return (
    <>
      <PageHeader title="Departments" subtitle="Departments group students, faculty, teams and projects." actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>New department</Button>} />
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44" />)}</div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !data?.length ? (
        <EmptyState icon={<Building2 className="h-6 w-6" />} title="No departments yet" hint="Create one before students register — they pick their department at sign-up." action={<Button onClick={() => setEditing("new")}>Create department</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((d, i) => {
            const inUse = (d.userCount ?? 0) + (d.teamCount ?? 0) + (d.projectCount ?? 0) > 0;
            return (
              <motion.div key={d.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card card-hover flex flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-xl bg-brand-soft px-3 py-1.5 font-mono text-sm font-bold text-brand">{d.code}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${d.name}`} onClick={() => setEditing(d)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${d.name}`}
                      disabled={inUse}
                      title={inUse ? "Move its users, teams and projects first" : undefined}
                      className="hover:bg-danger-soft hover:text-danger"
                      onClick={async () => {
                        if (!(await confirm({ title: `Delete ${d.name}?`, message: "This permanently removes the department.", confirmLabel: "Delete" }))) return;
                        try {
                          toast.success((await del.mutateAsync(d.id)).message);
                        } catch (err) {
                          toast.error(errorMessage(err));
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{d.name}</h3>
                {d.description && <p className="mt-1 text-sm text-ink-muted">{d.description}</p>}
                <div className="mt-auto grid grid-cols-3 gap-2 pt-5 text-center">
                  {[
                    [Users, d.userCount, "users"],
                    [UsersRound, d.teamCount, "teams"],
                    [FolderKanban, d.projectCount, "projects"],
                  ].map(([Icon, n, l]) => {
                    const I = Icon as typeof Users;
                    return (
                      <div key={l as string} className="rounded-xl bg-surface-2/70 py-2.5">
                        <I className="mx-auto h-4 w-4 text-ink-faint" />
                        <p className="mt-1 font-display text-lg font-bold">{(n as number) ?? 0}</p>
                        <p className="text-[11px] text-ink-faint">{l as string}</p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      <DepartmentModal target={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function DepartmentModal({ target, onClose }: { target: DepartmentDTO | "new" | null; onClose: () => void }) {
  const isNew = target === "new";
  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    setErrors({});
    setForm(target && target !== "new" ? { name: target.name, code: target.code, description: target.description ?? "" } : { name: "", code: "", description: "" });
  }, [target]);
  const save = useAdminMutation(async () => (isNew ? (await api.post("/departments", form)).data : (await api.patch(`/departments/${(target as DepartmentDTO).id}`, form)).data), [["departments"]]);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Modal
      open={target !== null}
      onClose={onClose}
      title={isNew ? "New department" : "Edit department"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            loading={save.isPending}
            onClick={async () => {
              try {
                toast.success((await save.mutateAsync(undefined)).message);
                onClose();
              } catch (err) {
                setErrors(fieldErrors(err));
                toast.error(errorMessage(err));
              }
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <Input label="Name" value={form.name} onChange={set("name")} error={errors.name} placeholder="Computer Science & Engineering" />
        <Input label="Code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} error={errors.code} placeholder="CSE" />
        <Textarea wrapperClassName="sm:col-span-2" label="Description (optional)" rows={3} value={form.description} onChange={set("description")} />
      </div>
    </Modal>
  );
}
