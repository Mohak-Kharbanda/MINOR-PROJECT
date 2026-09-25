import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useData } from "../context/DataContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const { data } = useData();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    usn: "",
    email: "",
    password: "",
    department: data.departments[0]?.id || "",
  });
  const [error, setError] = useState("");

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const result = register(form);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate("/student");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-bold text-white">Create Student Account</h1>
          <p className="mt-1 text-sm text-ice">Join SPMS to create or join a project team</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <div>
            <label className="label">Full Name</label>
            <input required className="input" value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div>
            <label className="label">USN</label>
            <input
              required
              className="input"
              placeholder="4NI24CS097"
              value={form.usn}
              onChange={(e) => update("usn", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              required
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              required
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Department</label>
            <select
              className="input"
              value={form.department}
              onChange={(e) => update("department", e.target.value)}
            >
              {data.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <button type="submit" className="btn-primary w-full">
            Create account
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-ice">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-white underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
