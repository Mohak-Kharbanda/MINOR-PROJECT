const STYLES = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  "in-progress": "bg-blue-50 text-blue-700",
  rejected: "bg-red-50 text-red-700",
  completed: "bg-violet-50 text-violet-700",
  todo: "bg-slate-100 text-slate-600",
  done: "bg-emerald-50 text-emerald-700",
  student: "bg-navy/10 text-navy",
  faculty: "bg-indigo-50 text-indigo-700",
  admin: "bg-slate-800 text-white",
};

export default function Badge({ children, tone }) {
  const cls = STYLES[tone] || "bg-slate-100 text-slate-600";
  return <span className={`badge ${cls}`}>{children}</span>;
}
