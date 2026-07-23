import { useId } from "react";

/* Smooth path from points using Catmull-Rom → Bézier. */
function smoothPath(points) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** Area + line trend chart. data: [{ label, value }] */
export function AreaLine({ data, height = 160, color = "var(--accent)", unit = "", ariaLabel }) {
  const gid = useId();
  const W = 640;
  const H = height;
  const padX = 8;
  const padY = 16;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = data.map((d, i) => ({
    x: padX + (i / Math.max(1, data.length - 1)) * (W - padX * 2),
    y: padY + (1 - (d.value - min) / span) * (H - padY * 2),
    ...d,
  }));

  const line = smoothPath(points);
  const area = `${line} L ${points[points.length - 1].x} ${H - padY} L ${points[0].x} ${H - padY} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.28 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1={padX}
          x2={W - padX}
          y1={padY + g * (H - padY * 2)}
          y2={padY + g * (H - padY * 2)}
          stroke="var(--border)"
          strokeWidth="1"
        />
      ))}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill="var(--surface)" stroke={color} strokeWidth="2" />
          <title>{`${p.label}: ${p.value}${unit}`}</title>
        </g>
      ))}
    </svg>
  );
}

/** Vertical bars. data: [{ label, value }] */
export function Bars({ data, height = 160, color = "var(--accent)", unit = "" }) {
  const W = 640;
  const H = height;
  const padY = 14;
  const max = Math.max(1, ...data.map((d) => d.value));
  const gap = 10;
  const bw = (W - gap * (data.length - 1)) / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img">
      {data.map((d, i) => {
        const h = (d.value / max) * (H - padY * 2);
        const x = i * (bw + gap);
        const y = H - padY - h;
        return (
          <g key={i}>
            <rect x={x} y={padY} width={bw} height={H - padY * 2} rx="6" fill="var(--surface-sunken)" />
            <rect x={x} y={y} width={bw} height={h} rx="6" fill={color} opacity={0.35 + 0.65 * (d.value / max)} />
            <title>{`${d.label}: ${d.value}${unit}`}</title>
          </g>
        );
      })}
    </svg>
  );
}

/** Progress ring. value 0–100. */
export function Ring({ value = 0, size = 120, stroke = 10, color = "var(--accent)", label, sublabel }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * c;

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-sunken)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute text-center">
        {label && <div className="font-display text-xl font-extrabold text-ink">{label}</div>}
        {sublabel && <div className="text-[0.68rem] font-medium text-ink-3">{sublabel}</div>}
      </div>
    </div>
  );
}

/** Tiny inline sparkline. */
export function Sparkline({ data, width = 100, height = 30, color = "var(--accent)" }) {
  const values = data.map((d) => (typeof d === "number" ? d : d.value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => ({
    x: (i / Math.max(1, values.length - 1)) * width,
    y: height - ((v - min) / span) * height,
  }));
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={smoothPath(pts)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
