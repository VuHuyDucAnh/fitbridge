export default function ProgressBar({ value, max = 10, color = "blue" }) {
  const percentage = (value / max) * 100;

  const colors = {
    blue: "bg-blue-600",
    green: "bg-green-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
    purple: "bg-purple-600",
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">
          Overall Form Score
        </span>

        <span className="font-semibold text-slate-700">
          {value} / {max}
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colors[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
