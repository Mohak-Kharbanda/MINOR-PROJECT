import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  CloudUpload,
  Download,
  Eye,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  History,
  Lock,
  MessageSquare,
  Presentation,
  RefreshCw,
  Send,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  ALLOWED_EXTENSIONS,
  FILE_KIND_LABELS,
  FILE_REVIEW_LABELS,
  FILE_REVIEW_STATUSES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
} from "@edutrack/shared/constants";
import { useAuth } from "@/context/AuthContext";
import { fetchFileUrl, useFileHistory, useFiles, useProjectMutation } from "@/hooks/api";
import { api, errorMessage, resolveApiUrl } from "@/lib/api";
import { formatBytes, formatDateTime, timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Textarea, Select } from "@/components/ui/Field";
import { Drawer, Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, ReviewBadge } from "@/components/ui/Badge";
import { Segmented } from "@/components/ui/Tabs";
import { EmptyState, ErrorState, Skeleton, Spinner } from "@/components/ui/States";
import { useConfirm } from "@/components/ui/Confirm";

const ACCEPT = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",");

function fileIcon(name) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return FileImage;
  if (["zip"].includes(ext)) return FileArchive;
  if (["xls", "xlsx", "csv"].includes(ext)) return FileSpreadsheet;
  if (["ppt", "pptx"].includes(ext)) return Presentation;
  if (["pdf"].includes(ext)) return FileType2;
  return FileText;
}

const canPreview = (mime) => /^(application\/pdf|image\/(png|jpeg|webp|gif)|text\/plain)$/.test(mime);

function validateFile(file) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) return `.${ext} files aren't allowed. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`;
  if (file.size > MAX_FILE_SIZE_BYTES) return `That file is ${formatBytes(file.size)}. The limit is ${MAX_FILE_SIZE_MB} MB.`;
  return null;
}

async function download(projectId, file) {
  try {
    const { url } = await fetchFileUrl(projectId, file.id, "attachment");
    const a = document.createElement("a");
    a.href = resolveApiUrl(url);
    a.rel = "noopener";
    a.download = file.originalName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    toast.error(errorMessage(err));
  }
}

function useUpload(projectId) {
  const [progress, setProgress] = useState(null);
  const mutation = useProjectMutation(projectId, async (vars) => {
    const form = new FormData();
    form.append("kind", vars.kind);
    form.append("note", vars.note);
    if (vars.lineageKey) form.append("lineageKey", vars.lineageKey);
    form.append("file", vars.file);
    setProgress(0);
    try {
      return (await api.post(`/projects/${projectId}/files`, form, { onUploadProgress: (e) => e.total && setProgress(Math.round((e.loaded / e.total) * 100)) }))
        .data;
    } finally {
      setProgress(null);
    }
  });
  return { ...mutation, progress };
}

export function FilesPanel({ project }) {
  const { data: files, isLoading, error, refetch } = useFiles(project.id);
  const [filter, setFilter] = useState("all");
  const [openKey, setOpenKey] = useState(null);
  const shown = useMemo(() => (files ?? []).filter((f) => filter === "all" || f.kind === filter), [files, filter]);
  const open = files?.find((f) => f.lineageKey === openKey) ?? null;

  return (
    <div className="space-y-6">
      {project.permissions.canUpload ? (
        <UploadZone project={project} />
      ) : (
        <p className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2/50 px-4 py-3 text-sm text-ink-muted">
          <Lock className="h-4 w-4" />
          {project.status === "evaluated"
            ? "This project has been evaluated, so files are read-only."
            : project.status === "submitted"
              ? "Files are locked for the team after the final submission. Your guide can still add revised versions."
              : "You can't upload files to this project right now."}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          layoutId="file-filter"
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: `All (${files?.length ?? 0})` },
            { id: "project_file", label: "Project files" },
            { id: "final_submission", label: "Final submission" },
          ]}
        />

        <p className="text-xs text-ink-faint">Files are private. Downloads use short-lived signed links.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !shown.length ? (
        <EmptyState
          icon={<UploadCloud className="h-6 w-6" />}
          title="No files yet"
          hint="Reports, slides, source archives and final deliverables will appear here with their full version history."
        />
      ) : (
        <ul className="grid gap-3">
          <AnimatePresence initial={false}>
            {shown.map((f, i) => (
              <FileRow key={f.lineageKey} file={f} index={i} onOpen={() => setOpenKey(f.lineageKey)} projectId={project.id} />
            ))}
          </AnimatePresence>
        </ul>
      )}

      <FileDrawer project={project} file={open} onClose={() => setOpenKey(null)} />
    </div>
  );
}

function UploadZone({ project }) {
  const { user } = useAuth();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [kind, setKind] = useState("project_file");
  const [note, setNote] = useState("");
  const [over, setOver] = useState(false);
  const upload = useUpload(project.id);
  const canFinal = project.permissions.canUploadFinal;

  const pick = (f) => {
    if (!f) return;
    const problem = validateFile(f);
    if (problem) return toast.error(problem);
    setFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setOver(false);
    pick(e.dataTransfer.files?.[0]);
  };

  async function submit() {
    if (!file) return;
    try {
      const res = await upload.mutateAsync({ file, kind, note });
      toast.success(res.message);
      setFile(null);
      setNote("");
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="card overflow-hidden">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Choose a file to upload"
        className={cn(
          "relative m-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all",
          over ? "scale-[0.99] border-brand bg-brand-soft/60" : "border-line hover:border-brand/40 hover:bg-surface-2/50"
        )}
      >
        <motion.div
          animate={over ? { y: -6, scale: 1.08 } : { y: 0, scale: 1 }}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-accent text-white shadow-glow"
        >
          <CloudUpload className="h-7 w-7" />
        </motion.div>
        <p className="mt-4 font-semibold">{file ? file.name : over ? "Drop to upload" : "Drag a file here, or click to browse"}</p>
        <p className="mt-1 text-xs text-ink-faint">{file ? formatBytes(file.size) : `PDF, Office docs, ZIP, images, text · up to ${MAX_FILE_SIZE_MB} MB`}</p>
        <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-line"
          >
            <div className="grid gap-4 p-5 sm:grid-cols-[220px_1fr]">
              <Select
                label="File type"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                hint={!canFinal && user?.role === "student" ? "Final deliverables open once your proposal is approved." : undefined}
              >
                <option value="project_file">Project file</option>
                {canFinal && <option value="final_submission">Final submission</option>}
              </Select>
              <Textarea
                label="Note (optional)"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What is this file? e.g. Draft 1 of the report"
              />
            </div>
            {upload.progress !== null && (
              <div className="px-5 pb-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <motion.div className="progress-fill h-full" animate={{ width: `${upload.progress}%` }} />
                </div>
                <p className="mt-1 text-xs text-ink-faint">Uploading… {upload.progress}%</p>
              </div>
            )}
            <div className="flex justify-end gap-2 px-5 pb-5">
              <Button variant="ghost" onClick={() => setFile(null)} disabled={upload.isPending}>
                Cancel
              </Button>
              <Button onClick={submit} loading={upload.isPending} icon={<UploadCloud className="h-4 w-4" />}>
                Upload
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FileRow({ file, index, onOpen, projectId }) {
  const Icon = fileIcon(file.originalName);
  const byFaculty = file.uploaderRole !== "student";
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(index, 8) * 0.03 }}
    >
      <div className="group flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition hover:border-brand/30 hover:shadow-lift">
        <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-4 text-left">
          <span
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
              file.kind === "final_submission" ? "bg-success-soft text-success" : "bg-brand-soft text-brand"
            )}
          >
            <Icon className="h-6 w-6" />
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="truncate font-semibold">{file.originalName}</span>
              <span className="rounded-md bg-ink px-1.5 py-0.5 font-mono text-[11px] font-semibold text-bg">v{file.version}</span>
              {file.kind === "final_submission" && <Badge tone="success">{FILE_KIND_LABELS.final_submission}</Badge>}
              {byFaculty && <Badge tone="accent">{file.uploaderRole === "faculty" ? "Faculty revision" : "Admin upload"}</Badge>}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
              <span>
                {file.uploadedBy?.name ?? "—"} · {timeAgo(file.createdAt)}
              </span>
              <span>{formatBytes(file.size)}</span>
              {file.versionCount > 1 && (
                <span className="flex items-center gap-1">
                  <History className="h-3 w-3" /> {file.versionCount} versions
                </span>
              )}
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> {file.commentCount}
              </span>
            </span>
            {file.note && <span className="mt-1.5 line-clamp-1 block text-sm text-ink-muted">“{file.note}”</span>}
          </span>
        </button>
        <div className="flex items-center gap-2">
          <ReviewBadge status={file.reviewStatus} />
          <Button variant="ghost" size="icon" aria-label={`Download ${file.originalName}`} onClick={() => download(projectId, file)}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onOpen}>
            Open
          </Button>
        </div>
      </div>
    </motion.li>
  );
}

function Preview({ projectId, file }) {
  const [url, setUrl] = useState(null);
  const [text, setText] = useState(null);
  const [failed, setFailed] = useState(false);
  const isText = file.mimeType === "text/plain";

  useEffect(() => {
    let alive = true;
    setUrl(null);
    setText(null);
    setFailed(false);
    if (!canPreview(file.mimeType)) return;
    fetchFileUrl(projectId, file.id, "inline")
      .then(async (r) => {
        const resolved = resolveApiUrl(r.url);
        if (isText) {
          // Render text ourselves instead of in a sandboxed frame. Cloud
          // buckets need CORS for this; otherwise we fall back to download.
          const res = await fetch(resolved);
          if (!res.ok) throw new Error(String(res.status));
          const body = await res.text();
          if (alive) setText(body.length > 200_000 ? `${body.slice(0, 200_000)}\n…` : body);
        } else if (alive) {
          setUrl(resolved);
        }
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [projectId, file.id, file.mimeType, isText]);

  if (!canPreview(file.mimeType))
    return <p className="rounded-xl bg-surface-2 p-6 text-center text-sm text-ink-muted">Preview isn't available for this file type. Download it to open.</p>;
  if (failed) return <p className="rounded-xl bg-surface-2 p-6 text-center text-sm text-ink-muted">Couldn't load a preview. Download the file to open it.</p>;
  if (isText && text !== null)
    return (
      <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-surface-2 p-4 font-mono text-[13px] leading-relaxed">
        {text || "(empty file)"}
      </pre>
    );
  if (!url)
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-surface-2">
        <Spinner />
      </div>
    );
  if (file.mimeType.startsWith("image/"))
    return <img src={url} alt={file.originalName} className="max-h-[420px] w-full rounded-xl border border-line bg-surface-2 object-contain" />;
  return <iframe src={url} title={`Preview of ${file.originalName}`} className="h-[420px] w-full rounded-xl border border-line bg-white" />;
}

function FileDrawer({ project, file, onClose }) {
  const { user } = useAuth();
  const confirm = useConfirm();
  const { data: history } = useFileHistory(project.id, file?.lineageKey ?? null);
  const latest = history?.[history.length - 1] ?? file;
  const [selectedId, setSelectedId] = useState(null);
  const [comment, setComment] = useState("");
  const [reviewMsg, setReviewMsg] = useState("");
  const [reuploadOpen, setReuploadOpen] = useState(false);
  const selected = history?.find((v) => v.id === selectedId) ?? latest;

  useEffect(() => {
    setSelectedId(null);
    setComment("");
    setReviewMsg("");
  }, [file?.lineageKey]);

  const addComment = useProjectMutation(
    project.id,
    async () => (await api.post(`/projects/${project.id}/files/${latest.id}/comments`, { message: comment })).data
  );
  const review = useProjectMutation(
    project.id,
    async (status) => (await api.patch(`/projects/${project.id}/files/${selected.id}/review`, { reviewStatus: status, message: reviewMsg })).data
  );
  const remove = useProjectMutation(project.id, async (id) => (await api.delete(`/projects/${project.id}/files/${id}`)).data);

  // One conversation across every version: upload notes + comments, oldest first.
  const thread = useMemo(() => {
    const items = [];
    for (const v of history ?? []) {
      if (v.note)
        items.push({
          id: `${v.id}-note`,
          author: v.uploadedBy?.name ?? "—",
          role: v.uploaderRole,
          message: v.note,
          at: v.createdAt,
          version: v.version,
          kind: "note",
        });
      for (const c of v.comments)
        items.push({ id: c.id, author: c.author?.name ?? "—", role: c.authorRole, message: c.message, at: c.createdAt, version: v.version, kind: "comment" });
    }
    return items.sort((a, b) => a.at.localeCompare(b.at));
  }, [history]);

  const isStudentMember = user?.role === "student";
  const canReupload = project.permissions.canUpload && (latest?.kind !== "final_submission" || !isStudentMember || project.permissions.canUploadFinal);

  return (
    <Drawer
      open={Boolean(file)}
      onClose={onClose}
      title={
        file && (
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{file.originalName}</p>
            <p className="text-xs text-ink-faint">
              {FILE_KIND_LABELS[file.kind]} · {file.versionCount} version{file.versionCount > 1 ? "s" : ""}
            </p>
          </div>
        )
      }
    >
      {file && selected && (
        <div className="space-y-6 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Button icon={<Download className="h-4 w-4" />} onClick={() => download(project.id, selected)}>
              Download v{selected.version}
            </Button>
            {canReupload && (
              <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={() => setReuploadOpen(true)}>
                {isStudentMember ? "Upload new version" : "Upload edited version"}
              </Button>
            )}
            <span className="ml-auto">
              <ReviewBadge status={selected.reviewStatus} />
            </span>
          </div>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink-faint">
              <Eye className="h-4 w-4" /> Preview · v{selected.version}
            </h3>
            <Preview projectId={project.id} file={selected} />
          </section>

          {project.permissions.canReviewFiles && (
            <section className="rounded-2xl border border-line bg-surface-2/50 p-4">
              <h3 className="text-sm font-semibold">Review v{selected.version}</h3>
              <p className="mt-0.5 text-xs text-ink-muted">Set a status and optionally leave a comment for the team.</p>
              <Textarea
                wrapperClassName="mt-3"
                rows={2}
                value={reviewMsg}
                onChange={(e) => setReviewMsg(e.target.value)}
                placeholder="Comment (optional)"
                aria-label="Review comment"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {FILE_REVIEW_STATUSES.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={s === "accepted" ? "success" : s === "needs_revision" ? "danger" : "outline"}
                    loading={review.isPending && review.variables === s}
                    onClick={async () => {
                      try {
                        toast.success((await review.mutateAsync(s)).message);
                        setReviewMsg("");
                      } catch (err) {
                        toast.error(errorMessage(err));
                      }
                    }}
                  >
                    {FILE_REVIEW_LABELS[s]}
                  </Button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink-faint">
              <History className="h-4 w-4" /> Version history
            </h3>
            <ol className="space-y-2">
              {[...(history ?? [])].reverse().map((v) => (
                <li key={v.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(v.id)}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedId(v.id)}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
                      v.id === selected.id ? "border-brand/40 bg-brand-soft/40" : "border-line hover:bg-surface-2/60"
                    )}
                  >
                    <span className="rounded-md bg-ink px-1.5 py-0.5 font-mono text-[11px] font-semibold text-bg">v{v.version}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{v.uploadedBy?.name}</span>
                        {v.uploaderRole !== "student" && <span className="ml-1.5 text-xs text-accent">({v.uploaderRole})</span>}
                        <span className="text-ink-faint"> · {formatDateTime(v.createdAt)} · {formatBytes(v.size)}</span>
                      </p>
                      {v.note && <p className="mt-0.5 text-sm text-ink-muted">“{v.note}”</p>}
                    </div>
                    {(v.uploadedBy?.id === user?.id || user?.role === "admin") && (project.permissions.canUpload || user?.role === "admin") && (
                      <button
                        aria-label={`Delete version ${v.version}`}
                        className="rounded-lg p-1 text-ink-faint hover:bg-danger-soft hover:text-danger"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (
                            !(await confirm({
                              title: `Delete version ${v.version}?`,
                              message: "The file is removed from storage permanently. Other versions are kept.",
                              confirmLabel: "Delete version",
                            }))
                          )
                            return;
                          try {
                            toast.success((await remove.mutateAsync(v.id)).message);
                            if ((history?.length ?? 0) <= 1) onClose();
                          } catch (err) {
                            toast.error(errorMessage(err));
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink-faint">
              <MessageSquare className="h-4 w-4" /> Comments
            </h3>
            {thread.length ? (
              <ul className="space-y-3">
                {thread.map((c) => (
                  <motion.li key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                    <Avatar name={c.author} size="sm" />
                    <div
                      className={cn(
                        "min-w-0 flex-1 rounded-2xl rounded-tl-sm border px-3.5 py-2.5",
                        c.role === "student" ? "border-line bg-surface-2/60" : "border-accent/25 bg-accent-soft/50"
                      )}
                    >
                      <p className="text-xs text-ink-faint">
                        <span className="font-semibold text-ink">{c.author}</span> · {c.role} · v{c.version}
                        {c.kind === "note" && " · upload note"} · {timeAgo(c.at)}
                      </p>
                      <p className="mt-1 whitespace-pre-line text-sm">{c.message}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-faint">No comments yet.</p>
            )}
            {project.permissions.canGiveFeedback && (
              <form
                className="mt-4 flex items-end gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!comment.trim()) return;
                  try {
                    await addComment.mutateAsync(undefined);
                    setComment("");
                  } catch (err) {
                    toast.error(errorMessage(err));
                  }
                }}
              >
                <Textarea
                  wrapperClassName="flex-1"
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={`Comment on v${latest?.version}…`}
                  aria-label="Add a comment"
                />
                <Button type="submit" size="icon" className="h-11 w-11" loading={addComment.isPending} aria-label="Send comment">
                  {!addComment.isPending && <Send className="h-4 w-4" />}
                </Button>
              </form>
            )}
          </section>
        </div>
      )}
      {file && latest && <ReuploadModal project={project} latest={latest} open={reuploadOpen} onClose={() => setReuploadOpen(false)} />}
    </Drawer>
  );
}

function ReuploadModal({ project, latest, open, onClose }) {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const upload = useUpload(project.id);
  const noteRequired = user?.role !== "student";

  useEffect(() => {
    if (open) {
      setFile(null);
      setNote("");
      setError("");
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Upload v${latest.version + 1} of ${latest.originalName}`}
      description={
        noteRequired
          ? "Upload your edited copy. The team will see it as a new version together with your comment."
          : "Upload the next version. Earlier versions and their comments are kept."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={upload.isPending}
            disabled={!file}
            icon={<UploadCloud className="h-4 w-4" />}
            onClick={async () => {
              if (!file) return;
              if (noteRequired && note.trim().length < 3) return setError("Describe what you changed so the team knows what to look at.");
              try {
                toast.success((await upload.mutateAsync({ file, kind: latest.kind, note, lineageKey: latest.lineageKey })).message);
                onClose();
              } catch (err) {
                setError(errorMessage(err));
              }
            }}
          >
            Upload v{latest.version + 1}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-line p-4 transition hover:border-brand/40">
          <UploadCloud className="h-6 w-6 text-brand" />
          <span className="min-w-0 flex-1 text-sm">
            {file ? (
              <>
                <span className="font-medium">{file.name}</span> · {formatBytes(file.size)}
              </>
            ) : (
              "Choose the edited file…"
            )}
          </span>
          <input
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const problem = validateFile(f);
              if (problem) return setError(problem);
              setError("");
              setFile(f);
            }}
          />
        </label>
        <Textarea
          label={noteRequired ? "Comment explaining your changes (required)" : "What changed? (optional)"}
          rows={4}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setError("");
          }}
          error={error}
          placeholder={
            noteRequired
              ? "Restructured the methodology section and fixed citations. Please continue from this version."
              : "Addressed the review comments on section 3."
          }
        />
      </div>
    </Modal>
  );
}
