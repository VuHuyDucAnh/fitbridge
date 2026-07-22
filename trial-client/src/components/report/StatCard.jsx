export default function StatCard({ title, value, unit, icon, color = "blue" }) {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    orange: "bg-orange-100 text-orange-600",
    purple: "bg-purple-100 text-purple-600",
    red: "bg-red-100 text-red-600",
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-md transition hover:-translate-y-1 hover:shadow-xl">
      <div
        className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${colors[color]}`}
      >
        <span className="text-3xl">{icon}</span>
      </div>

      <p className="text-sm text-slate-500">{title}</p>

      <div className="mt-2 flex items-end gap-2">
        <span className="text-4xl font-bold text-slate-800">{value}</span>

        {unit && <span className="mb-1 text-sm text-slate-400">{unit}</span>}
      </div>
    </div>
  );
}
