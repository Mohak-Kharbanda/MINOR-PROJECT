export default function StatCard({ label, value, accent }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent || "text-navy"}`}>{value}</p>
    </div>
  );
}
