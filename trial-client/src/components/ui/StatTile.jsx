export default function StatTile({ icon, label, value, unit, sub, accent = false, className = "" }) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="flex items-center gap-2 text-ink-2">
        {icon && (
          <span className={`grid h-8 w-8 place-items-center rounded-lg ${accent ? "bg-accent-strong text-accent-contrast" : "bg-accent-surface text-accent-strong"}`}>
            {icon}
          </span>
        )}
        <span className="text-[0.78rem] font-semibold">{label}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-display text-3xl font-extrabold text-ink">{value}</span>
        {unit && <span className="text-sm font-semibold text-ink-3">{unit}</span>}
      </div>
      {sub && <div className="mt-1 text-[0.78rem] text-ink-3">{sub}</div>}
    </div>
  );
}
