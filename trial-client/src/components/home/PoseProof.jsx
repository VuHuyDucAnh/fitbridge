import { useEffect, useRef, useState, useCallback } from "react";
import { useI18n } from "../../i18n/LanguageContext";

/*
  The signature: a real, interactive 3D pose-skeleton the visitor can grab and
  orbit. Joints live in 3D space, rotate around the Y axis, and project to 2D
  with perspective, so depth reads through joint size + opacity. No WebGL, no
  dependency — just math, so it stays crisp and never looks like generic 3D AI
  slop. Auto-rotates when idle; pauses off-screen / hidden / reduced-motion.
*/

// standing figure, origin at chest. y is down, z is depth (+ = toward viewer).
const J = {
  head: [0, -96, 2],
  neck: [0, -70, 0],
  shoulderL: [-27, -62, 0], shoulderR: [27, -62, 0],
  elbowL: [-40, -26, 10], elbowR: [40, -26, 10],
  wristL: [-45, 10, 16], wristR: [45, 10, 16],
  hip: [0, 6, 0],
  hipL: [-17, 14, 0], hipR: [17, 14, 0],
  kneeL: [-19, 58, 12], kneeR: [19, 58, 12],
  ankleL: [-19, 104, 4], ankleR: [19, 104, 4],
};
const BONES = [
  ["head", "neck"], ["neck", "shoulderL"], ["neck", "shoulderR"], ["shoulderL", "shoulderR"],
  ["shoulderL", "elbowL"], ["elbowL", "wristL"], ["shoulderR", "elbowR"], ["elbowR", "wristR"],
  ["neck", "hip"], ["hip", "hipL"], ["hip", "hipR"], ["hipL", "hipR"],
  ["hipL", "kneeL"], ["kneeL", "ankleL"], ["hipR", "kneeR"], ["kneeR", "ankleR"],
];

const CX = 180, CY = 208, FOCAL = 260;

function project(p, cos, sin) {
  const x = p[0] * cos + p[2] * sin;
  const z = -p[0] * sin + p[2] * cos;
  const s = FOCAL / (FOCAL - z);
  return { x: CX + x * s, y: CY + p[1] * s, s };
}

export default function PoseProof({ className = "" }) {
  const { t } = useI18n();
  const wrapRef = useRef(null);
  const angle = useRef(0.35);
  const vel = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const raf = useRef(0);
  const visible = useRef(true);
  const [, force] = useState(0);

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const tick = useCallback(() => {
    if (!dragging.current) {
      // idle drift + inertia decay
      angle.current += vel.current + (reduced ? 0 : 0.004);
      vel.current *= 0.94;
    }
    force((n) => (n + 1) & 0xffff);
    raf.current = requestAnimationFrame(tick);
  }, [reduced]);

  useEffect(() => {
    // pause the loop when off-screen or the tab is hidden
    const start = () => {
      if (!raf.current) raf.current = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
    const io = new IntersectionObserver(
      ([e]) => {
        visible.current = e.isIntersecting;
        if (e.isIntersecting && !document.hidden) start();
        else stop();
      },
      { threshold: 0.05 }
    );
    if (wrapRef.current) io.observe(wrapRef.current);
    const onVis = () => (document.hidden || !visible.current ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    if (reduced) {
      force(1); // render once, no loop
    } else {
      start();
    }
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      stop();
    };
  }, [tick, reduced]);

  const onDown = (e) => {
    dragging.current = true;
    lastX.current = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    vel.current = 0;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (!dragging.current) return;
    const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const dx = (x - lastX.current) * 0.01;
    angle.current += dx;
    vel.current = dx;
    lastX.current = x;
    if (reduced) force((n) => (n + 1) & 0xffff);
  };
  const onUp = () => (dragging.current = false);

  const cos = Math.cos(angle.current);
  const sin = Math.sin(angle.current);
  const pts = {};
  for (const k in J) pts[k] = project(J[k], cos, sin);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div className="pointer-events-none absolute inset-6 rounded-[2rem] bg-accent/25 blur-[70px]" aria-hidden="true" />

      <div className="relative overflow-hidden rounded-[1.75rem] border border-line-strong bg-[#0d0d0d] shadow-float">
        <svg
          viewBox="0 0 360 440"
          className="block w-full cursor-grab touch-none active:cursor-grabbing"
          role="img"
          aria-label={t("coach.tracking")}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
        >
          <defs>
            <radialGradient id="pp-vig" cx="50%" cy="38%" r="75%">
              <stop offset="0%" stopColor="#1a1a1a" />
              <stop offset="100%" stopColor="#080808" />
            </radialGradient>
          </defs>
          <rect width="360" height="440" fill="url(#pp-vig)" />

          {/* ground shadow for grounding */}
          <ellipse cx={CX} cy="392" rx="66" ry="12" fill="#000" opacity="0.5" />

          {/* bones — width + opacity follow average depth */}
          <g stroke="var(--accent)" strokeLinecap="round">
            {BONES.map(([a, b], i) => {
              const pa = pts[a], pb = pts[b];
              const s = (pa.s + pb.s) / 2;
              return (
                <line
                  key={i}
                  x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                  strokeWidth={2.4 * s}
                  opacity={0.45 + 0.5 * Math.min(1, (s - 0.85) / 0.35)}
                />
              );
            })}
          </g>
          {/* joints */}
          <g>
            {Object.entries(pts).map(([k, p]) => (
              <circle
                key={k}
                cx={p.x} cy={p.y}
                r={(k === "head" ? 15 : 4.6) * p.s}
                fill="#0d0d0d"
                stroke="var(--accent)"
                strokeWidth={2.6 * p.s}
                opacity={0.55 + 0.45 * Math.min(1, (p.s - 0.85) / 0.35)}
              />
            ))}
          </g>

          {/* scan corners */}
          <g stroke="var(--accent)" strokeWidth="2.5" fill="none" opacity="0.9">
            <path d="M22 46 v-18 h18" /><path d="M338 46 v-18 h-18" />
            <path d="M22 394 v18 h18" /><path d="M338 394 v18 h-18" />
          </g>
        </svg>

        {/* floating glass chips */}
        <div className="glass pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full px-3 py-1.5">
          <span className="h-2 w-2 animate-pulse-ring rounded-full bg-accent" />
          <span className="text-[0.72rem] font-bold uppercase tracking-wider text-ink">{t("coach.tracking")}</span>
        </div>
        <div className="glass pointer-events-none absolute right-4 top-4 rounded-2xl px-3.5 py-2 text-right">
          <div className="font-mono text-2xl font-bold leading-none text-accent">12</div>
          <div className="mt-0.5 text-[0.62rem] font-semibold uppercase tracking-wider text-ink-2">{t("coach.reps")}</div>
        </div>
        <div className="glass pointer-events-none absolute bottom-4 left-4 rounded-2xl px-3.5 py-2">
          <div className="text-[0.62rem] font-semibold uppercase tracking-wider text-ink-2">{t("coach.formLive")}</div>
          <div className="font-mono text-2xl font-bold leading-none text-accent">94<span className="text-sm">%</span></div>
        </div>
        <div className="glass pointer-events-none absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full px-3 py-1.5">
          <DragIcon />
          <span className="text-[0.66rem] font-semibold uppercase tracking-wider text-ink-2">{t("home.dragHint")}</span>
        </div>
      </div>
    </div>
  );
}

function DragIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent" aria-hidden="true">
      <path d="M18 8l3 4-3 4M6 8l-3 4 3 4M8 6l4-3 4 3M8 18l4 3 4-3" />
    </svg>
  );
}
