import { useState } from "react";
import Layout from "../../components/Layout.jsx";
import Badge from "../../components/Badge.jsx";
import StatCard from "../../components/StatCard.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useData } from "../../context/DataContext.jsx";

const TABS = [
  { key: "pending", label: "Pending Approval" },
  { key: "active", label: "Active Projects" },
  { key: "completed", label: "Completed" },
];

export default function FacultyDashboard() {
  const { currentUser } = useAuth();
  const { data, getUser, setProjectStatus, assignMarks } = useData();
  const [tab, setTab] = useState("pending");
  const [feedbackDraft, setFeedbackDraft] = useState({});
  const [marksDraft, setMarksDraft] = useState({});

  const myProjects = data.projects.filter((p) => p.facultyId === currentUser.id);
  const pending = myProjects.filter((p) => p.status === "pending");
  const active = myProjects.filter((p) => p.status === "approved");
  const completed = myProjects.filter((p) => p.status === "completed");
  const rejected = myProjects.filter((p) => p.status === "rejected");

  const shown = tab === "pending" ? pending : tab === "active" ? active : completed;

  function draftFeedback(id, value) {
    setFeedbackDraft((d) => ({ ...d, [id]: value }));
  }

  function handleApprove(p) {
    setProjectStatus(p.id, "approved", feedbackDraft[p.id] ?? p.feedback);
  }

  function handleReject(p) {
    setProjectStatus(p.id, "rejected", feedbackDraft[p.id] ?? p.feedback);
  }

  function handleSaveFeedback(p) {
    setProjectStatus(p.id, p.status, feedbackDraft[p.id] ?? p.feedback);
  }

  function handleMarkComplete(p) {
    setProjectStatus(p.id, "completed", feedbackDraft[p.id] ?? p.feedback);
  }

  function handleSaveMarks(p) {
    const val = Number(marksDraft[p.id]);
    if (Number.isNaN(val) || val < 0 || val > 100) return;
    assignMarks(p.id, val);
  }

  return (
    <Layout>
      <h1 className="mb-1 font-display text-2xl font-bold text-navy">Welcome, {currentUser.name}</h1>
      <p className="mb-6 text-sm text-slate-500">Manage the projects assigned to you as internal guide.</p>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Pending" value={pending.length} accent="text-amber-600" />
        <StatCard label="Active" value={active.length} accent="text-blue-600" />
        <StatCard label="Completed" value={completed.length} accent="text-violet-600" />
        <StatCard label="Rejected" value={rejected.length} accent="text-red-600" />
      </div>

      <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1 sm:w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === t.key ? "bg-white text-navy shadow" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-400">No projects in this category.</div>
      ) : (
        <div className="space-y-4">
          {shown.map((p) => {
            const doneTasks = p.tasks.filter((t) => t.status === "done").length;
            return (
              <div key={p.id} className="card p-4">
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-800">{p.title}</h3>
                    <p className="text-xs text-slate-400">
                      Team: {p.teamMembers.map((id) => getUser(id)?.name).join(", ")}
                    </p>
                  </div>
                  <Badge tone={p.status}>{p.status}</Badge>
                </div>
                <p className="mb-3 text-sm text-slate-600">{p.description}</p>

                {tab === "active" && (
                  <p className="mb-3 text-xs text-slate-400">
                    Progress: {doneTasks}/{p.tasks.length} tasks done • {p.files.length} file(s) submitted
                  </p>
                )}

                <div>
                  <label className="label">Feedback</label>
                  <textarea
                    rows={2}
                    className="input"
                    placeholder="Add feedback for the team..."
                    value={feedbackDraft[p.id] ?? p.feedback}
                    onChange={(e) => draftFeedback(p.id, e.target.value)}
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {tab === "pending" && (
                    <>
                      <button className="btn-success" onClick={() => handleApprove(p)}>
                        Approve
                      </button>
                      <button className="btn-danger" onClick={() => handleReject(p)}>
                        Reject
                      </button>
                    </>
                  )}
                  {tab === "active" && (
                    <>
                      <button className="btn-secondary" onClick={() => handleSaveFeedback(p)}>
                        Save Feedback
                      </button>
                      <button className="btn-primary" onClick={() => handleMarkComplete(p)}>
                        Mark as Completed
                      </button>
                    </>
                  )}
                  {tab === "completed" && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Marks /100"
                        className="input w-32"
                        defaultValue={p.marks ?? ""}
                        onChange={(e) => setMarksDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                      />
                      <button className="btn-primary" onClick={() => handleSaveMarks(p)}>
                        Save Marks
                      </button>
                      {p.marks !== null && (
                        <span className="text-sm font-semibold text-navy">Current: {p.marks}/100</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
