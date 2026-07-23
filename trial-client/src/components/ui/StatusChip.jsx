import { CheckCircle2, CircleDot, CircleSlash, ShieldAlert, AlertTriangle } from "lucide-react";

// State is carried by icon + text + color — never color alone.
const MAP = {
  active: { Icon: CheckCircle2, cls: "text-success bg-success-surface", dot: "bg-success" },
  partial: { Icon: CircleDot, cls: "text-warning bg-warning-surface", dot: "bg-warning" },
  unavailable: { Icon: CircleSlash, cls: "text-ink-3 bg-sunken", dot: "bg-ink-3" },
  permission: { Icon: ShieldAlert, cls: "text-info bg-accent-surface", dot: "bg-info" },
  error: { Icon: AlertTriangle, cls: "text-danger bg-danger-surface", dot: "bg-danger" },
};

export default function StatusChip({ status = "active", label, pulse = false, className = "" }) {
  const { Icon, cls, dot } = MAP[status] || MAP.active;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.72rem] font-semibold ${cls} ${className}`}
    >
      {pulse ? (
        <span className={`relative flex h-2 w-2`}>
          <span className={`absolute inline-flex h-full w-full rounded-full ${dot} opacity-70 animate-pulse-ring`} />
          <span className={`relative inline-flex h-2 w-2 rounded-full ${dot}`} />
        </span>
      ) : (
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {label}
    </span>
  );
}
