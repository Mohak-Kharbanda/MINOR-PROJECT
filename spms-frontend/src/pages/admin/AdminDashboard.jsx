import { useState } from "react";
import Layout from "../../components/Layout.jsx";
import Badge from "../../components/Badge.jsx";
import StatCard from "../../components/StatCard.jsx";
import { useData } from "../../context/DataContext.jsx";

const TABS = [
  { key: "users", label: "Users" },
  { key: "departments", label: "Departments" },
  { key: "projects", label: "Projects" },
];

export default function AdminDashboard() {
  const { data, getDepartment, getUser, addUser, deleteUser, addDepartment, deleteDepartment } = useData();
  const [tab, setTab] = useState("users");

  const students = data.users.filter((u) => u.role === "student");
  const facultyCount = data.users.filter((u) => u.role === "faculty").length;

  // --- new user form state ---
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    department: data.departments[0]?.id || "",
  });
  const [newDept, setNewDept] = useState("");

  function handleAddUser(e) {
    e.preventDefault();
    if (!newUser.name || !newUser.email || !newUser.password) return;
    addUser(newUser);
    setNewUser({ name: "", email: "", password: "", role: "student", department: data.departments[0]?.id || "" });
  }

  function handleAddDept(e) {
    e.preventDefault();
    if (!newDept.trim()) return;
    addDepartment(newDept.trim());
    setNewDept("");
  }

  return (
    <Layout>
      <h1 className="mb-1 font-display text-2xl font-bold text-navy">Admin Console</h1>
      <p className="mb-6 text-sm text-slate-500">
        Manage students, faculty, departments and oversee every project in the system.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Students" value={students.length} />
        <StatCard label="Faculty" value={facultyCount} />
        <StatCard label="Departments" value={data.departments.length} />
        <StatCard label="Total Projects" value={data.projects.length} />
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

      {tab === "users" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="card p-4 lg:col-span-2">
            <h2 className="mb-3 font-display text-base font-bold text-navy">All Users</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                    <th className="py-2 pr-2">Name</th>
                    <th className="py-2 pr-2">Email</th>
                    <th className="py-2 pr-2">Role</th>
                    <th className="py-2 pr-2">Department</th>
                    <th className="py-2 pr-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-2 pr-2 font-medium text-slate-700">{u.name}</td>
                      <td className="py-2 pr-2 text-slate-500">{u.email}</td>
                      <td className="py-2 pr-2">
                        <Badge tone={u.role}>{u.role}</Badge>
                      </td>
                      <td className="py-2 pr-2 text-slate-500">{getDepartment(u.department)?.name || "—"}</td>
                      <td className="py-2 pr-2 text-right">
                        <button onClick={() => deleteUser(u.id)} className="text-xs text-red-500 hover:text-red-700">
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-4">
            <h2 className="mb-3 font-display text-base font-bold text-navy">Add User</h2>
            <form onSubmit={handleAddUser} className="space-y-3">
              <div>
                <label className="label">Name</label>
                <input
                  className="input"
                  value={newUser.name}
                  onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Temporary Password</label>
                <input
                  className="input"
                  value={newUser.password}
                  onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Role</label>
                  <select
                    className="input"
                    value={newUser.role}
                    onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))}
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="label">Department</label>
                  <select
                    className="input"
                    value={newUser.department}
                    onChange={(e) => setNewUser((u) => ({ ...u, department: e.target.value }))}
                  >
                    {data.departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full">
                Add User
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === "departments" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="card p-4 lg:col-span-2">
            <h2 className="mb-3 font-display text-base font-bold text-navy">Departments</h2>
            <ul className="divide-y divide-slate-100">
              {data.departments.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium text-slate-700">{d.name}</span>
                  <button onClick={() => deleteDepartment(d.id)} className="text-xs text-red-500 hover:text-red-700">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-4">
            <h2 className="mb-3 font-display text-base font-bold text-navy">Add Department</h2>
            <form onSubmit={handleAddDept} className="space-y-3">
              <input
                className="input"
                placeholder="e.g. Mechanical Engineering"
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
              />
              <button type="submit" className="btn-primary w-full">
                Add Department
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === "projects" && (
        <div className="card p-4">
          <h2 className="mb-3 font-display text-base font-bold text-navy">All Projects</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                  <th className="py-2 pr-2">Title</th>
                  <th className="py-2 pr-2">Department</th>
                  <th className="py-2 pr-2">Guide</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 pr-2">Marks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.projects.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 pr-2 font-medium text-slate-700">{p.title}</td>
                    <td className="py-2 pr-2 text-slate-500">{getDepartment(p.department)?.name}</td>
                    <td className="py-2 pr-2 text-slate-500">{getUser(p.facultyId)?.name}</td>
                    <td className="py-2 pr-2">
                      <Badge tone={p.status}>{p.status}</Badge>
                    </td>
                    <td className="py-2 pr-2 text-slate-500">{p.marks !== null ? `${p.marks}/100` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
