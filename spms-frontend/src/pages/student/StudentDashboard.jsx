import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout.jsx";
import Badge from "../../components/Badge.jsx";
import StatCard from "../../components/StatCard.jsx";
import CreateProjectModal from "./CreateProjectModal.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useData } from "../../context/DataContext.jsx";

export default function StudentDashboard() {
  const { currentUser } = useAuth();
  const { data, getUser, getDepartment } = useData();
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  const myProjects = data.projects.filter(
    (p) => p.createdBy === currentUser.id || p.teamMembers.includes(currentUser.id)
  );

  const totalTasks = myProjects.reduce((sum, p) => sum + p.tasks.length, 0);
  const doneTasks = myProjects.reduce((sum, p) => sum + p.tasks.filter((t) => t.status === "done").length, 0);

  return (
    <Layout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Welcome, {currentUser.name}</h1>
          <p className="text-sm text-slate-500">{getDepartment(currentUser.department)?.name}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + Create Project
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="My Projects" value={myProjects.length} />
        <StatCard label="Total Tasks" value={totalTasks} />
        <StatCard label="Tasks Done" value={doneTasks} accent="text-emerald-600" />
        <StatCard
          label="Pending Approval"
          value={myProjects.filter((p) => p.status === "pending").length}
          accent="text-amber-600"
        />
      </div>

      <h2 className="mb-3 font-display text-lg font-bold text-navy">My Projects</h2>
      {myProjects.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-400">
          You're not part of any project yet. Create one to get started.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myProjects.map((p) => {
            const done = p.tasks.filter((t) => t.status === "done").length;
            const progress = p.tasks.length ? Math.round((done / p.tasks.length) * 100) : 0;
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/student/projects/${p.id}`)}
                className="card p-4 text-left transition hover:shadow-md"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-800">{p.title}</h3>
                  <Badge tone={p.status}>{p.status}</Badge>
                </div>
                <p className="mb-3 line-clamp-2 text-xs text-slate-500">{p.description}</p>
                <p className="mb-1 text-xs text-slate-400">Guide: {getUser(p.facultyId)?.name}</p>
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
                  <div className="h-1.5 rounded-full bg-navy" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-1 text-right text-[11px] text-slate-400">{progress}% tasks complete</p>
              </button>
            );
          })}
        </div>
      )}

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}
    </Layout>
  );
}
