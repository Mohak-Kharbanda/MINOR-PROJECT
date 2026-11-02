import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { CheckCircle2, FileCheck2, Pencil, RotateCcw, Send, Trash2, Trophy, UserCog, XCircle } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useFacultyDirectory, useFiles, useProjectMutation } from "@/hooks/api";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select, Textarea, Input } from "@/components/ui/Field";
import { useConfirm } from "@/components/ui/Confirm";
import { ProjectFormModal } from "./ProjectFormModal";
import { cn } from "@/lib/cn";

/** The role- and status-aware action bar on the project workspace. */
export function ProjectActions({ project }) {
  const p = project.permissions;
  const [dialog, setDialog] = useState(null);
  const confirm = useConfirm();
  const navigate = useNavigate();
  const close = () => setDialog(null);

  const submitProposal = useProjectMutation(project.id, async () => (await api.post(`/projects/${project.id}/submit-proposal`)).data);
  const del = useProjectMutation(project.id, async () => (await api.delete(`/projects/${project.id}`)).data);

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
      <div className="flex flex-wrap gap-2">
        {p.canReview && (
          <>
            <Button variant="success" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setDialog("approve")}>
              Approve
            </Button>
            <Button variant="danger" icon={<XCircle className="h-4 w-4" />} onClick={() => setDialog("reject")}>
              Reject
            </Button>
          </>
        )}
        {p.canSubmitProposal && (
          <Button icon={<Send className="h-4 w-4" />} loading={submitProposal.isPending} onClick={() => run(() => submitProposal.mutateAsync(undefined))}>
            {project.status === "rejected" ? "Resubmit proposal" : "Send for review"}
          </Button>
        )}
        {p.canSubmitFinal && (
          <Button icon={<FileCheck2 className="h-4 w-4" />} onClick={() => setDialog("submit")}>
            Submit final project
          </Button>
        )}
        {p.canEvaluate && (
          <Button
            icon={<Trophy className="h-4 w-4" />}
            onClick={() => setDialog("evaluate")}
            variant={project.status === "evaluated" ? "secondary" : "primary"}
          >
            {project.status === "evaluated" ? "Update marks" : "Evaluate"}
          </Button>
        )}
        {p.canReturnSubmission && (
          <Button variant="secondary" icon={<RotateCcw className="h-4 w-4" />} onClick={() => setDialog("return")}>
            Return for changes
          </Button>
        )}
        {p.canEditProposal && (
          <Button variant="outline" icon={<Pencil className="h-4 w-4" />} onClick={() => setDialog("edit")}>
            Edit
          </Button>
        )}
        {p.canAssignFaculty && (
          <Button variant="outline" icon={<UserCog className="h-4 w-4" />} onClick={() => setDialog("faculty")}>
            Reassign guide
          </Button>
        )}
        {p.canDelete && (
          <Button
            variant="ghost"
            className="text-danger hover:bg-danger-soft hover:text-danger"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={async () => {
              const ok = await confirm({
                title: "Delete this project?",
                message: (
                  <>
                    <strong className="text-ink">{project.title}</strong> and all its tasks and files will be permanently deleted. The team stays and can
                    propose again. This cannot be undone.
                  </>
                ),
                confirmLabel: "Delete project",
              });
              if (ok && (await run(() => del.mutateAsync(undefined)))) navigate("/app/projects");
            }}
          >
            Delete
          </Button>
        )}
      </div>

      <ProjectFormModal open={dialog === "edit"} onClose={close} project={project} />
      <ReviewModal project={project} decision={dialog === "approve" ? "approved" : dialog === "reject" ? "rejected" : null} onClose={close} />
      <SubmitModal project={project} open={dialog === "submit"} onClose={close} />
      <ReturnModal project={project} open={dialog === "return"} onClose={close} />
      <EvaluateModal project={project} open={dialog === "evaluate"} onClose={close} />
      <AssignFacultyModal project={project} open={dialog === "faculty"} onClose={close} />
    </>
  );
}

function ReviewModal({ project, decision, onClose }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const review = useProjectMutation(project.id, async () => (await api.post(`/projects/${project.id}/review`, { decision, message })).data);
  const approve = decision === "approved";

  return (
    <Modal
      open={decision !== null}
      onClose={onClose}
      title={approve ? "Approve proposal" : "Reject proposal"}
      description={approve ? "The team can start adding tasks right away." : "The team will revise the proposal using your feedback and resubmit."}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={approve ? "success" : "danger"}
            loading={review.isPending}
            onClick={async () => {
              if (!approve && message.trim().length < 5) return setError("Tell the team what needs to change.");
              try {
                const res = await review.mutateAsync(undefined);
                toast.success(res.message);
                setMessage("");
                onClose();
              } catch (err) {
                setError(errorMessage(err));
              }
            }}
          >
            {approve ? "Approve" : "Reject with feedback"}
          </Button>
        </>
      }
    >
      <Textarea
        label={approve ? "Feedback (optional)" : "What should the team change?"}
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          setError("");
        }}
        error={error}
        rows={5}
        placeholder={approve ? "Great scope. Keep the privacy constraints front and centre." : "The scope is unclear: please add a threat model and…"}
      />
    </Modal>
  );
}

function SubmitModal({ project, open, onClose }) {
  const [note, setNote] = useState("");
  const { data: files } = useFiles(project.id);
  const finals = (files ?? []).filter((f) => f.kind === "final_submission");
  const submit = useProjectMutation(project.id, async () => (await api.post(`/projects/${project.id}/submit`, { note })).data);
  const openTasks = project.taskStats.total - project.taskStats.done;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Submit final project"
      description="After you submit, tasks and uploads are locked until your guide evaluates or returns the project."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={submit.isPending}
            disabled={!finals.length}
            icon={<FileCheck2 className="h-4 w-4" />}
            onClick={async () => {
              try {
                const res = await submit.mutateAsync(undefined);
                toast.success(res.message);
                onClose();
              } catch (err) {
                toast.error(errorMessage(err));
              }
            }}
          >
            Submit for evaluation
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-surface-2/60 p-4">
          <p className="text-sm font-semibold">Final deliverables ({finals.length})</p>
          {finals.length ? (
            <ul className="mt-2 space-y-1 text-sm text-ink-muted">
              {finals.map((f) => (
                <li key={f.id} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" /> {f.originalName} <span className="font-mono text-xs">v{f.version}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-danger">Upload at least one file as a “Final submission” in the Files tab first.</p>
          )}
        </div>
        {openTasks > 0 && (
          <p className="rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning">
            {openTasks} task{openTasks === 1 ? " is" : "s are"} not marked done. You can still submit.
          </p>
        )}
        <Textarea
          label="Note to your guide (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Demo video link, anything to look at first…"
        />
      </div>
    </Modal>
  );
}

function ReturnModal({ project, open, onClose }) {
  const [message, setMessage] = useState("");
  const ret = useProjectMutation(project.id, async () => (await api.post(`/projects/${project.id}/return`, { message })).data);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Return submission for changes"
      description="The project goes back to “In progress” so the team can fix things and resubmit."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={ret.isPending}
            disabled={message.trim().length < 5}
            onClick={async () => {
              try {
                toast.success((await ret.mutateAsync(undefined)).message);
                onClose();
              } catch (err) {
                toast.error(errorMessage(err));
              }
            }}
          >
            Return to team
          </Button>
        </>
      }
    >
      <Textarea
        label="What needs to change?"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={5}
        placeholder="Please add the test results section and…"
      />
    </Modal>
  );
}

function EvaluateModal({ project, open, onClose }) {
  const [marks, setMarks] = useState(75);
  const [notes, setNotes] = useState("");
  useEffect(() => {
    if (!open) return;
    setMarks(project.evaluation?.marks ?? 75);
    setNotes(project.evaluation?.notes ?? "");
  }, [open, project.evaluation]);
  const evaluate = useProjectMutation(project.id, async () => (await api.post(`/projects/${project.id}/evaluate`, { marks, notes })).data);
  const grade = marks >= 90 ? "O" : marks >= 80 ? "A+" : marks >= 70 ? "A" : marks >= 60 ? "B+" : marks >= 50 ? "B" : marks >= 40 ? "C" : "F";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project.evaluation ? "Update evaluation" : "Evaluate project"}
      description="Marks out of 100. Every change is recorded in the audit trail."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={evaluate.isPending}
            icon={<Trophy className="h-4 w-4" />}
            onClick={async () => {
              try {
                toast.success((await evaluate.mutateAsync(undefined)).message);
                onClose();
              } catch (err) {
                toast.error(errorMessage(err));
              }
            }}
          >
            Save evaluation
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-6">
          <motion.div
            key={grade}
            initial={{ scale: 0.8, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            className={cn(
              "flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl text-white",
              marks >= 40 ? "bg-gradient-to-br from-brand to-accent" : "bg-danger"
            )}
          >
            <span className="font-display text-2xl font-bold">{grade}</span>
            <span className="text-[10px] uppercase tracking-wider opacity-80" title="Indicative grade band">
              grade*
            </span>
          </motion.div>
          <div className="flex-1">
            <div className="flex items-end justify-between">
              <label htmlFor="marks-range" className="label mb-0">
                Marks
              </label>
              <Input
                aria-label="Marks"
                type="number"
                min={0}
                max={100}
                value={marks}
                onChange={(e) => setMarks(Math.max(0, Math.min(100, Number(e.target.value))))}
                className="w-24 text-right font-mono"
              />
            </div>
            <input
              id="marks-range"
              type="range"
              min={0}
              max={100}
              value={marks}
              onChange={(e) => setMarks(Number(e.target.value))}
              className="mt-3 w-full accent-[rgb(var(--brand))]"
            />
          </div>
        </div>
        <p className="-mt-2 text-xs text-ink-faint">*Indicative grade band only; the marks are what gets recorded.</p>
        <Textarea
          label="Evaluation notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="Strengths, weaknesses, viva performance…"
        />
      </div>
    </Modal>
  );
}

function AssignFacultyModal({ project, open, onClose }) {
  const { data: faculty } = useFacultyDirectory();
  const [selected, setSelected] = useState(project.faculty?.id ?? "");
  const assign = useProjectMutation(project.id, async () => (await api.patch(`/projects/${project.id}/faculty`, { faculty: selected })).data);
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Reassign faculty guide"
      description="The previous guide loses access; the new guide sees the project immediately."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={assign.isPending}
            disabled={!selected || selected === project.faculty?.id}
            onClick={async () => {
              try {
                toast.success((await assign.mutateAsync(undefined)).message);
                onClose();
              } catch (err) {
                toast.error(errorMessage(err));
              }
            }}
          >
            Reassign
          </Button>
        </>
      }
    >
      <Select label="Faculty guide" value={selected} onChange={(e) => setSelected(e.target.value)}>
        {faculty?.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name} {f.department ? `· ${f.department.code}` : ""}
          </option>
        ))}
      </Select>
    </Modal>
  );
}
