import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../../components/Layout.jsx";
import Badge from "../../components/Badge.jsx";
import { useData } from "../../context/DataContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const TASK_COLUMNS = [
  { key: "todo", label: "To Do" },
  { key: "in-progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { data, getUser, addTask, updateTaskStatus, deleteTask, addFile, deleteFile } = useData();
  const fileInputRef = useRef(null);

  const project = data.projects.find((p) => p.id === id);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDeadline, setTaskDeadline] = useState("");

  if (!project) {
    return (
      <Layout>
        <p className="text-slate-500">Project not found.</p>
      </Layout>
    );
  }

  const canEdit = project.status === "approved" || project.status === "completed";
  const team = project.teamMembers.map((id) => getUser(id)).filter(Boolean);

  function handleAddTask(e) {
    e.preventDefault();
    if (!taskTitle || !taskAssignee) return;
    addTask(project.id, { title: taskTitle, assigneeId: taskAssignee, deadline: taskDeadline });
    setTaskTitle("");
    setTaskAssignee("");
    setTaskDeadline("");
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    addFile(project.id, { name: file.name, uploadedById: currentUser.id });
    e.target.value = "";
  }

  return (
    <Layout>
      <button onClick={() => navigate(-1)} className="mb-4 text-sm font-medium text-navy hover:underline">
        ← Back
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-navy">{project.title}</h1>
            <Badge tone={project.status}>{project.status}</Badge>
          </div>
          <p className="max-w-2xl text-sm text-slate-500">{project.description}</p>
        </div>
        {project.marks !== null && (
          <div className="card px-4 py-2 text-center">
            <p className="text-xs font-semibold uppercase text-slate-400">Marks</p>
            <p className="text-xl font-bold text-navy">{project.marks}/100</p>
          </div>
        )}
      </div>

      {!canEdit && (
        <div
          className={`mb-6 rounded-lg p-3 text-sm ${
            project.status === "pending"
              ? "bg-amber-50 text-amber-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {project.status === "pending"
            ? "Waiting for faculty approval. Tasks and file submission unlock once approved."
            : "This project proposal was rejected. Please contact your guide for feedback."}
        </div>
      )}

      {project.feedback && (
        <div className="mb-6 card p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Faculty Feedback
          </p>
          <p className="text-sm text-slate-700">{project.feedback}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Team */}
        <div className="card p-4">
          <h2 className="mb-3 font-display text-base font-bold text-navy">Team</h2>
          <ul className="space-y-2">
            {team.map((m) => (
              <li key={m.id} className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{m.name}</span>
                {m.id === project.createdBy && <Badge tone="student">Lead</Badge>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-400">Guide: {getUser(project.facultyId)?.name}</p>
        </div>

        {/* Tasks */}
        <div className="card p-4 lg:col-span-2">
          <h2 className="mb-3 font-display text-base font-bold text-navy">Tasks</h2>

          {canEdit && (
            <form onSubmit={handleAddTask} className="mb-4 grid gap-2 sm:grid-cols-4">
              <input
                className="input sm:col-span-2"
                placeholder="New task title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
              />
              <select className="input" value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)}>
                <option value="">Assignee</option>
                {team.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="input"
                  value={taskDeadline}
                  onChange={(e) => setTaskDeadline(e.target.value)}
                />
                <button type="submit" className="btn-primary shrink-0">
                  Add
                </button>
              </div>
            </form>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            {TASK_COLUMNS.map((col) => (
              <div key={col.key} className="rounded-lg bg-slate-50 p-2">
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {col.label} ({project.tasks.filter((t) => t.status === col.key).length})
                </p>
                <div className="space-y-2">
                  {project.tasks
                    .filter((t) => t.status === col.key)
                    .map((t) => (
                      <div key={t.id} className="rounded-md border border-slate-200 bg-white p-2">
                        <p className="text-sm font-medium text-slate-700">{t.title}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {getUser(t.assigneeId)?.name} {t.deadline && `• due ${t.deadline}`}
                        </p>
                        {canEdit && (
                          <div className="mt-2 flex items-center gap-1">
                            <select
                              className="flex-1 rounded border border-slate-200 py-1 text-xs"
                              value={t.status}
                              onChange={(e) => updateTaskStatus(project.id, t.id, e.target.value)}
                            >
                              {TASK_COLUMNS.map((c) => (
                                <option key={c.key} value={c.key}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => deleteTask(project.id, t.id)}
                              className="text-xs text-red-500 hover:text-red-700"
                              title="Delete task"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Files */}
      <div className="card mt-6 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-navy">Project Files</h2>
          {canEdit && (
            <>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
              <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
                Upload File
              </button>
            </>
          )}
        </div>
        {project.files.length === 0 ? (
          <p className="text-sm text-slate-400">No files submitted yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {project.files.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">📄</span>
                  <span className="font-medium text-slate-700">{f.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>
                    {getUser(f.uploadedById)?.name} • {f.date}
                  </span>
                  {canEdit && (
                    <button onClick={() => deleteFile(project.id, f.id)} className="text-red-500 hover:text-red-700">
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
