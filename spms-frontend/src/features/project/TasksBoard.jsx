import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock, GripVertical, Lock, Plus, Search, Trash2 } from "lucide-react";
import { TASK_PRIORITIES, TASK_STATUSES, TASK_STATUS_LABELS } from "@edutrack/shared/constants";
import { useAuth } from "@/context/AuthContext";
import { useProjectMutation, useTasks } from "@/hooks/api";
import { api, errorMessage } from "@/lib/api";
import { dueLabel, toDateInput } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { PriorityBadge } from "@/components/ui/Badge";
import { Segmented } from "@/components/ui/Tabs";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useConfirm } from "@/components/ui/Confirm";

const COLUMN_STYLE = {
  todo: { dot: "bg-ink-faint", ring: "ring-ink-faint/30" },
  in_progress: { dot: "bg-brand", ring: "ring-brand/40" },
  review: { dot: "bg-warning", ring: "ring-warning/40" },
  done: { dot: "bg-success", ring: "ring-success/40" },
};

const PRIORITY_BAR = { low: "bg-ink-faint/40", medium: "bg-info", high: "bg-danger" };

export function TasksBoard({ project }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: tasks, isLoading, error, refetch } = useTasks(project.id);
  const canEdit = project.permissions.canManageTasks;
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const move = useProjectMutation(project.id, async ({ id, status }) => (await api.patch(`/projects/${project.id}/tasks/${id}`, { status })).data);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (tasks ?? []).filter((t) => {
      if (filter === "mine" && t.assignee?.id !== user?.id) return false;
      if (filter === "overdue" && !t.isOverdue) return false;
      return !q || t.title.toLowerCase().includes(q) || t.assignee?.name.toLowerCase().includes(q);
    });
  }, [tasks, filter, query, user?.id]);

  async function onDrop(e, status) {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/task-id");
    const task = tasks?.find((t) => t.id === id);
    if (!task || task.status === status) return;
    // Optimistic update so the card lands instantly.
    const key = ["tasks", project.id];
    const previous = qc.getQueryData(key);
    qc.setQueryData(key, (old) => old?.map((t) => (t.id === id ? { ...t, status, isOverdue: status === "done" ? false : t.isOverdue } : t)));
    try {
      await move.mutateAsync({ id, status });
      if (status === "done") toast.success(`“${task.title}” done 🎉`);
    } catch (err) {
      qc.setQueryData(key, previous);
      toast.error(errorMessage(err));
    }
  }

  if (isLoading)
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-80" />
        ))}
      </div>
    );
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            layoutId="task-filter"
            value={filter}
            onChange={setFilter}
            options={[
              { id: "all", label: `All (${tasks?.length ?? 0})` },
              ...(user?.role === "student" ? [{ id: "mine", label: "Mine" }] : []),
              { id: "overdue", label: `Overdue (${tasks?.filter((t) => t.isOverdue).length ?? 0})` },
            ]}
          />

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks…"
              aria-label="Search tasks"
              className="input h-9 w-52 py-1.5 pl-9"
            />
          </div>
        </div>
        {canEdit ? (
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing("new")}>
            New task
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-ink-faint">
            <Lock className="h-3.5 w-3.5" />
            {user?.role === "student" ? "Tasks open once the proposal is approved, and lock after submission." : "Read-only — only the team manages tasks."}
          </span>
        )}
      </div>

      {!tasks?.length ? (
        <EmptyState
          icon={<Plus className="h-6 w-6" />}
          title="No tasks yet"
          hint={
            canEdit
              ? "Break the project into tasks and assign them to teammates. Progress is calculated from completed tasks."
              : "The team hasn't added tasks yet."
          }
          action={canEdit && <Button onClick={() => setEditing("new")}>Create the first task</Button>}
        />
      ) : (
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0 2xl:grid 2xl:grid-cols-4 2xl:overflow-visible">
          {TASK_STATUSES.map((status) => {
            const items = visible.filter((t) => t.status === status);
            return (
              <section
                key={status}
                aria-label={TASK_STATUS_LABELS[status]}
                onDragOver={(e) => {
                  if (!canEdit) return;
                  e.preventDefault();
                  setDragOver(status);
                }}
                onDragLeave={() => setDragOver((s) => (s === status ? null : s))}
                onDrop={(e) => canEdit && onDrop(e, status)}
                className={cn(
                  "flex min-h-[320px] w-[80vw] max-w-[300px] shrink-0 snap-start flex-col rounded-2xl border border-line bg-surface-2/50 p-3 transition-all sm:w-[290px] 2xl:w-auto 2xl:max-w-none",
                  dragOver === status && `ring-2 ${COLUMN_STYLE[status].ring} bg-surface-2`
                )}
              >
                <header className="mb-3 flex items-center justify-between px-1">
                  <h3 className="flex items-center gap-2 font-sans text-sm font-semibold">
                    <span className={cn("h-2 w-2 rounded-full", COLUMN_STYLE[status].dot)} />
                    {TASK_STATUS_LABELS[status]}
                  </h3>
                  <span className="rounded-full bg-surface px-2 py-0.5 font-mono text-xs text-ink-faint">{items.length}</span>
                </header>
                <div className="flex flex-1 flex-col gap-2.5">
                  <AnimatePresence initial={false}>
                    {items.map((t) => (
                      <motion.div
                        layout
                        key={t.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      >
                        <button
                          type="button"
                          draggable={canEdit}
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/task-id", t.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onClick={() => setEditing(t)}
                          className={cn(
                            "group relative w-full overflow-hidden rounded-xl border bg-surface p-3.5 text-left shadow-card transition-[border-color,box-shadow] hover:border-brand/30 hover:shadow-lift",
                            canEdit && "cursor-grab active:cursor-grabbing",
                            t.isOverdue ? "border-danger/40" : "border-line"
                          )}
                        >
                          <span className={cn("absolute inset-y-0 left-0 w-1", PRIORITY_BAR[t.priority])} aria-hidden />
                          <div className="flex items-start gap-2">
                            <p
                              className={cn(
                                "flex-1 text-sm font-medium leading-snug",
                                t.status === "done" && "text-ink-muted line-through decoration-ink-faint"
                              )}
                            >
                              {t.title}
                            </p>
                            {canEdit && <GripVertical className="h-4 w-4 shrink-0 text-ink-faint opacity-0 transition group-hover:opacity-100" aria-hidden />}
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className={cn("inline-flex items-center gap-1 text-xs", t.isOverdue ? "font-medium text-danger" : "text-ink-faint")}>
                              <CalendarClock className="h-3.5 w-3.5" />
                              {dueLabel(t.dueDate, t.status === "done")}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <PriorityBadge priority={t.priority} />
                              {t.assignee ? (
                                <Avatar name={t.assignee.name} size="xs" />
                              ) : (
                                <span className="h-6 w-6 rounded-full border border-dashed border-line" title="Unassigned" />
                              )}
                            </div>
                          </div>
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {canEdit && items.length === 0 && (
                    <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-line py-8 text-xs text-ink-faint">
                      Drop tasks here
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
      {canEdit && <p className="mt-3 text-xs text-ink-faint">Tip: drag cards between columns, or open a card to change its status.</p>}

      <TaskModal project={project} task={editing} onClose={() => setEditing(null)} readOnly={!canEdit} />
    </div>
  );
}

function TaskModal({ project, task, onClose, readOnly }) {
  const confirm = useConfirm();
  const isNew = task === "new";
  const [form, setForm] = useState({ title: "", description: "", assignee: "", dueDate: "", priority: "medium", status: "todo" });
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    if (task && task !== "new") {
      setForm({
        title: task.title,
        description: task.description,
        assignee: task.assignee?.id ?? "",
        dueDate: toDateInput(task.dueDate),
        priority: task.priority,
        status: task.status,
      });
    } else if (task === "new") {
      setForm({ title: "", description: "", assignee: "", dueDate: "", priority: "medium", status: "todo" });
    }
  }, [task]);

  const save = useProjectMutation(project.id, async () => {
    const payload = { ...form, assignee: form.assignee || null, dueDate: form.dueDate || null };
    return isNew
      ? (await api.post(`/projects/${project.id}/tasks`, payload)).data
      : (await api.patch(`/projects/${project.id}/tasks/${task.id}`, payload)).data;
  });
  const del = useProjectMutation(project.id, async () => (await api.delete(`/projects/${project.id}/tasks/${task.id}`)).data);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Modal
      open={task !== null}
      onClose={onClose}
      title={readOnly ? "Task details" : isNew ? "New task" : "Edit task"}
      footer={
        readOnly ? (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        ) : (
          <>
            {!isNew && (
              <Button
                variant="ghost"
                className="mr-auto text-danger hover:bg-danger-soft hover:text-danger"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={async () => {
                  if (
                    !(await confirm({
                      title: "Delete this task?",
                      message: "This can't be undone. Project progress will be recalculated.",
                      confirmLabel: "Delete task",
                    }))
                  )
                    return;
                  try {
                    toast.success((await del.mutateAsync(undefined)).message);
                    onClose();
                  } catch (err) {
                    toast.error(errorMessage(err));
                  }
                }}
              >
                Delete
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              loading={save.isPending}
              onClick={async () => {
                if (form.title.trim().length < 2) return setError("Give the task a title.");
                try {
                  toast.success((await save.mutateAsync(undefined)).message);
                  onClose();
                } catch (err) {
                  setError(errorMessage(err));
                }
              }}
            >
              {isNew ? "Create task" : "Save"}
            </Button>
          </>
        )
      }
    >
      <fieldset disabled={readOnly} className="grid gap-4 sm:grid-cols-2">
        <Input
          wrapperClassName="sm:col-span-2"
          label="Title"
          value={form.title}
          onChange={set("title")}
          error={error}
          placeholder="Build the attendance REST API"
        />
        <Textarea
          wrapperClassName="sm:col-span-2"
          label="Description"
          value={form.description}
          onChange={set("description")}
          rows={3}
          placeholder="Details, acceptance criteria, links…"
        />
        <Select label="Assignee" value={form.assignee} onChange={set("assignee")} hint="Only members of this team can be assigned.">
          <option value="">Unassigned</option>
          {project.team?.members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
        <Input label="Due date" type="date" value={form.dueDate} onChange={set("dueDate")} />
        <Select label="Priority" value={form.priority} onChange={set("priority")}>
          {TASK_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p[0].toUpperCase() + p.slice(1)}
            </option>
          ))}
        </Select>
        <Select label="Status" value={form.status} onChange={set("status")}>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {TASK_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </fieldset>
      {task && task !== "new" && (
        <p className="mt-4 text-xs text-ink-faint">
          Created by {task.createdBy?.name ?? "—"}
          {task.completedAt && <> · completed {new Date(task.completedAt).toLocaleDateString()}</>}
        </p>
      )}
    </Modal>
  );
}
