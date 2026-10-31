import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { usePublicConfig, usePublicDepartments } from "@/hooks/api";
import { errorMessage, fieldErrors } from "@/lib/api";
import { Button, LinkButton } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/States";
import { AuthLayout, PasswordStrength } from "./AuthLayout";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { data: config } = usePublicConfig();
  const { data: departments, isLoading: depsLoading } = usePublicDepartments();
  const [form, setForm] = useState({ name: "", email: "", usn: "", department: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (form.name.trim().length < 2) local.name = "Enter your full name.";
    if (!form.department) local.department = "Choose your department.";
    if (form.password.length < 8) local.password = "Password must be at least 8 characters.";
    setErrors(local);
    if (Object.keys(local).length) return;

    setLoading(true);
    setFormError("");
    try {
      const user = await register(form);
      toast.success(`Welcome to EduTrack, ${user.name.split(" ")[0]}!`);
      navigate("/app/team", { replace: true });
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (config && !config.allowStudentSignup) {
    return (
      <AuthLayout title="Accounts by invitation" subtitle="Self-registration is turned off for this institution.">
        <EmptyState title="Ask your administrator" hint="Your admin creates student and faculty accounts and will share your sign-in details." action={<LinkButton to="/login">Back to sign in</LinkButton>} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Student sign-up. Faculty and admin accounts are created by your administrator."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input label="Full name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} placeholder="Aarav Sharma" />
        <Input label="College email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} placeholder="you@college.edu" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Student ID (USN)" value={form.usn} onChange={set("usn")} error={errors.usn} placeholder="1CS21CS001" />
          <Select label="Department" value={form.department} onChange={set("department")} error={errors.department} disabled={depsLoading}>
            <option value="">{depsLoading ? "Loading…" : "Select…"}</option>
            {departments?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Input label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} error={errors.password} placeholder="At least 8 characters" />
          <PasswordStrength value={form.password} />
        </div>
        {formError && !Object.keys(errors).length && (
          <p role="alert" className="rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            {formError}
          </p>
        )}
        {departments && departments.length === 0 && <p className="text-sm text-warning">No departments exist yet. Ask an admin to add one first.</p>}
        <Button type="submit" size="lg" loading={loading} className="w-full" icon={<UserPlus className="h-4 w-4" />}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
