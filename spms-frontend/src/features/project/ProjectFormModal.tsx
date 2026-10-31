import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { Send, Save, X } from "lucide-react";
import type { ProjectDetailDTO, TeamDTO } from "@edutrack/shared/types";
import { api, errorMessage, fieldErrors } from "@/lib/api";
import { toDateInput } from "@/lib/format";
import { useDepartments, useFacultyDirectory, useProjectMutation } from "@/hooks/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";

function defaultTerm() {
  const d = new Date();
  const odd = d.getMonth() >= 6; // Jul–Dec
  return `${d.getFullYear()} ${odd ? "Odd" : "Even"} Semester`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  team?: TeamDTO | null;
  project?: ProjectDetailDTO;
}

/** Create a proposal (students) or edit an existing one (team or admin). */
export function ProjectFormModal({ open, onClose, team, project }: Props) {
  const navigate = useNavigate();
  const editing = Boolean(project);
  const { data: departments } = useDepartments();
  const [form, setForm] = useState({
    title: "",
    description: "",
    objectives: "",
    techStack: [] as string[],
    department: "",
    academicTerm: defaultTerm(),
    faculty: "",
    deadline: "",
  });
  const [tagDraft, setTagDraft] = useState("");
  const [allFaculty, setAllFaculty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { data: faculty } = useFacultyDirectory(allFaculty ? undefined : form.department || undefined);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (project) {
      setForm({
        title: project.title,
        description: project.description,
        objectives: project.objectives,
        techStack: project.techStack,
        department: project.department?.id ?? "",
        academicTerm: project.academicTerm,
        faculty: project.faculty?.id ?? "",
        deadline: toDateInput(project.deadline),
      });
    } else {
      setForm((f) => ({ ...f, department: team?.department?.id ?? f.department }));
    }
  }, [open, project, team]);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const canChangeFaculty = !editing || project?.viewerRole === "admin" || project?.status !== "pending_review";

  const save = useProjectMutation(project?.id, async ({ submitForReview }: { submitForReview: boolean }) => {
    const payload: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      objectives: form.objectives,
      techStack: form.techStack,
      academicTerm: form.academicTerm,
      deadline: form.deadline || null,
    };
    if (editing) {
      if (canChangeFaculty && form.faculty !== project!.faculty?.id) payload.faculty = form.faculty;
      return (await api.patch(`/projects/${project!.id}`, payload)).data;
    }
    return (await api.post("/projects", { ...payload, department: form.department, faculty: form.faculty, submitForReview })).data;
  });

  const facultyOptions = useMemo(() => {
    const list = faculty ?? [];
    if (project?.faculty && !list.some((f) => f.id === project.faculty!.id)) return [{ ...project.faculty, department: null } as any, ...list];
    return list;
  }, [faculty, project]);

  function addTag(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" && e.key !== ",") return;
    e.preventDefault();
    const tag = tagDraft.trim().replace(/,$/, "");
    if (tag && !form.techStack.includes(tag) && form.techStack.length < 12) setForm((f) => ({ ...f, techStack: [...f.techStack, tag] }));
    setTagDraft("");
  }

  async function submit(submitForReview: boolean, e?: FormEvent) {
    e?.preventDefault();
    const local: Record<string, string> = {};
    if (form.title.trim().length < 3) local.title = "Give the project a title (3+ characters).";
    if (form.description.trim().length < 20) local.description = "Describe the project in at least 20 characters.";
    if (!editing && !form.department) local.department = "Choose a department.";
    if (!form.faculty) local.faculty = "Choose a faculty guide.";
    setErrors(local);
    if (Object.keys(local).length) return;
    try {
      const res = await save.mutateAsync({ submitForReview });
      toast.success(res.message ?? "Saved.");
      onClose();
      if (!editing) navigate(`/app/projects/${res.data.id}`);
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? "Edit proposal" : "Propose your project"}
      description={editing ? "Update the details your guide will review." : "Your guide reviews this proposal before you start building."}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {editing ? (
            <Button loading={save.isPending} icon={<Save className="h-4 w-4" />} onClick={() => submit(false)}>
              Save changes
            </Button>
          ) : (
            <>
              <Button variant="secondary" loading={save.isPending} icon={<Save className="h-4 w-4" />} onClick={() => submit(false)}>
                Save as draft
              </Button>
              <Button loading={save.isPending} icon={<Send className="h-4 w-4" />} onClick={() => submit(true)}>
                Send for review
              </Button>
            </>
          )}
        </>
      }
    >
      <form onSubmit={(e) => submit(!editing, e)} className="grid gap-4 sm:grid-cols-2">
        <Input wrapperClassName="sm:col-span-2" label="Project title" value={form.title} onChange={set("title")} error={errors.title} placeholder="Smart campus attendance with face recognition" />
        <Textarea wrapperClassName="sm:col-span-2" label="Description" rows={5} value={form.description} onChange={set("description")} error={errors.description} placeholder="What problem does it solve, for whom, and how?" hint={`${form.description.length}/5000`} />
        <Textarea wrapperClassName="sm:col-span-2" label="Objectives (optional)" rows={3} value={form.objectives} onChange={set("objectives")} placeholder="Measurable goals, one per line" />
        <div className="sm:col-span-2">
          <label className="label">Tech stack</label>
          <div className="input flex min-h-[44px] flex-wrap items-center gap-1.5 py-1.5">
            {form.techStack.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-lg bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
                {t}
                <button type="button" aria-label={`Remove ${t}`} onClick={() => setForm((f) => ({ ...f, techStack: f.techStack.filter((x) => x !== t) }))}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-ink-faint" value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} onKeyDown={addTag} placeholder={form.techStack.length ? "" : "Type and press Enter (React, Python…)"} />
          </div>
        </div>
        <Select label="Department" value={form.department} onChange={set("department")} error={errors.department} disabled={editing}>
          <option value="">Select…</option>
          {departments?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <Input label="Academic term" value={form.academicTerm} onChange={set("academicTerm")} error={errors.academicTerm} />
        <div>
          <Select label="Faculty guide" value={form.faculty} onChange={set("faculty")} error={errors.faculty} disabled={!canChangeFaculty} hint={!canChangeFaculty ? "The guide can't change while the proposal is under review." : undefined}>
            <option value="">Select a guide…</option>
            {facultyOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
                {f.department ? ` · ${f.department.code}` : ""}
              </option>
            ))}
          </Select>
          {canChangeFaculty && (
            <label className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
              <input type="checkbox" checked={allFaculty} onChange={(e) => setAllFaculty(e.target.checked)} className="accent-[rgb(var(--brand))]" />
              Show faculty from all departments
            </label>
          )}
        </div>
        <Input label="Final submission deadline" type="date" value={form.deadline} onChange={set("deadline")} error={errors.deadline} />
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
