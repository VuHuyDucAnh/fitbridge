import { useEffect, useMemo, useRef, useState } from "react";
import { normalizePath } from "../../lib/geo";

/* Strava-style route drawing. No external map tiles — the GPS path is projected
   into a square SVG and drawn as a glowing orange trail. When `animate` is set
   the trail draws itself on with a stroke-dashoffset transition. Dependency-free
   so it renders identically on every browser/machine. */
export default function RouteMap({ path, animate = false, live = false, className = "" }) {
  const pts = useMemo(() => normalizePath(path || []), [path]);
  const pathRef = useRef(null);
  const [drawn, setDrawn] = useState(!animate);

  const d = useMemo(() => {
    if (pts.length < 2) return "";
    return pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${(p.x * 100).toFixed(2)} ${(p.y * 100).toFixed(2)}`)
      .join(" ");
  }, [pts]);

  useEffect(() => {
    if (!animate || !pathRef.current || pts.length < 2) return;
    setDrawn(false);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true)));
    return () => cancelAnimationFrame(id);
  }, [animate, d, pts.length]);

  const len = pathRef.current?.getTotalLength?.() || 1000;
  const start = pts[0];
  const end = pts[pts.length - 1];

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-line-strong bg-[#0d0d0d] ${className}`}>
      {/* faint grid for a "map" feel without external tiles */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-[0.14]" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={(i + 1) * 10} x2="100" y2={(i + 1) * 10} stroke="white" strokeWidth="0.2" />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`v${i}`} x1={(i + 1) * 10} y1="0" x2={(i + 1) * 10} y2="100" stroke="white" strokeWidth="0.2" />
        ))}
      </svg>

      {pts.length < 2 ? (
        <div className="grid aspect-square w-full place-items-center text-[0.82rem] text-white/40">
          {live ? "…" : ""}
        </div>
      ) : (
        <svg viewBox="0 0 100 100" className="relative block aspect-square w-full">
          <defs>
            <linearGradient id="trail" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff8a3d" />
              <stop offset="100%" stopColor="#fb5b18" />
            </linearGradient>
          </defs>
          {/* soft glow underlay */}
          <path d={d} fill="none" stroke="#fb5b18" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.25" style={{ filter: "blur(1.4px)" }} />
          {/* the trail */}
          <path
            ref={pathRef}
            d={d}
            fill="none"
            stroke="url(#trail)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: len,
              strokeDashoffset: drawn ? 0 : len,
              transition: animate ? "stroke-dashoffset 1.6s ease-out" : "none",
            }}
          />
          {/* start marker */}
          {start && <circle cx={start.x * 100} cy={start.y * 100} r="1.8" fill="#0d0d0d" stroke="#22c55e" strokeWidth="1" />}
          {/* current / end marker */}
          {end && (
            <circle cx={end.x * 100} cy={end.y * 100} r="2" fill="#fb5b18" stroke="#0d0d0d" strokeWidth="0.8">
              {live && <animate attributeName="r" values="2;3;2" dur="1.2s" repeatCount="indefinite" />}
            </circle>
          )}
        </svg>
      )}
    </div>
  );
}
