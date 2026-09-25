import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const ROLES = [
  { id: "student", label: "Student" },
  { id: "faculty", label: "Faculty" },
  { id: "admin", label: "Admin" },
];

const DEMO_CREDENTIALS = {
  student: { email: "khushal@nie.ac.in", password: "student123" },
  faculty: { email: "poornima@nie.ac.in", password: "faculty123" },
  admin: { email: "admin@nie.ac.in", password: "admin123" },
};

export default function Login() {
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const result = login(email, password, role);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate(`/${role}`);
  }

  function fillDemo() {
    setEmail(DEMO_CREDENTIALS[role].email);
    setPassword(DEMO_CREDENTIALS[role].password);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 font-display text-lg font-bold text-white">
            SP
          </div>
          <h1 className="font-display text-2xl font-bold text-white">
            Student Project Management System
          </h1>
          <p className="mt-1 text-sm text-ice">Sign in to continue</p>
        </div>

        <div className="card p-6">
          <div className="mb-5 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setRole(r.id);
                  setError("");
                }}
                className={`rounded-md py-1.5 text-sm font-semibold transition-colors ${
                  role === r.id ? "bg-white shadow text-navy" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@nie.ac.in"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm font-medium text-red-600">{error}</p>}

            <button type="submit" className="btn-primary w-full">
              Sign in as {role}
            </button>
          </form>

          <button onClick={fillDemo} className="mt-3 w-full text-center text-xs text-slate-400 hover:text-navy">
            Fill demo {role} credentials
          </button>
        </div>

        <p className="mt-4 text-center text-sm text-ice">
          New student?{" "}
          <Link to="/register" className="font-semibold text-white underline underline-offset-2">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
