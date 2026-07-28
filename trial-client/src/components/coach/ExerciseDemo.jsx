import { useCallback, useEffect, useRef, useState } from "react";
import { Rotate3d } from "lucide-react";
import { useI18n } from "../../i18n/LanguageContext";
import {
  STICK_POSES, BONES, ANGLE_ROWS, CX,
  project, repPhase, lerpPose, measureAngle,
} from "../../lib/stickPoses";

/**
 * "How it's done" — the same pose-skeleton figure as the home page, performing
 * the selected exercise. Drag to orbit; depth reads through perspective (nearer
 * joints bigger and brighter). The left rail keeps the live joint-angle
 * readouts, measured in 3D off the same pose the figure is drawn from.
 *
 * Pure SVG + math: no WebGL. Pauses off-screen, on a hidden tab, and under
 * prefers-reduced-motion.
 */
/* Backdrop: the same ember contour lines and receding floor the 3D stage had.
   Static and precomputed once — it sits behind the figure and never animates,
   so there is no reason to rebuild these paths every frame. */
const CONTOURS = Array.from({ length: 14 }, (_, i) => {
  const yBase = 62 + i * 19;
  const amp = 2.2 + i * 0.45;
  let d = "";
  for (let x = 66; x <= 294; x += 8) {
    const y = yBase + Math.sin(x * 0.045 + i * 0.5) * amp;
    d += `${d ? " L" : "M"}${x} ${y.toFixed(1)}`;
  }
  return d;
});

const FLOOR = {
  h: Array.from({ length: 7 }, (_, i) => {
    const t = i / 6;
    const y = 302 + Math.pow(t, 1.8) * 56;
    const half = 30 + Math.pow(t, 1.5) * 150;
    return { y, x1: 180 - half, x2: 180 + half };
  }),
  v: Array.from({ length: 9 }, (_, i) => {
    const k = i - 4;
    return { x1: 180 + k * 7.5, y1: 302, x2: 180 + k * 45, y2: 358 };
  }),
};

export default function ExerciseDemo({ exercise, className = "" }) {
  const { t } = useI18n();
  const wrapRef = useRef(null);
  const angle = useRef(0.35);
  const vel = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const raf = useRef(0);
  const visible = useRef(true);
  const timeRef = useRef(0);
  const lastTs = useRef(0);
  const [, force] = useState(0);

  const id = STICK_POSES[exercise.id] ? exercise.id : "squat";
  const cfg = STICK_POSES[id];
  const rows = ANGLE_ROWS[id] || ANGLE_ROWS.squat;

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const tick = useCallback(
    (ts) => {
      const dt = lastTs.current ? Math.min(0.05, (ts - lastTs.current) / 1000) : 0.016;
      lastTs.current = ts;
      timeRef.current += dt;
      if (!dragging.current) {
        // reduced motion stops the idle orbit, never the exercise itself
        angle.current += vel.current + (reduced ? 0 : 0.0035);
        vel.current *= 0.94;
      }
      force((n) => (n + 1) & 0xffff);
      raf.current = requestAnimationFrame(tick);
    },
    [reduced]
  );

  useEffect(() => {
    const start = () => {
      if (!raf.current) {
        lastTs.current = 0;
        raf.current = requestAnimationFrame(tick);
      }
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
    start();
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      stop();
    };
  }, [tick]);

  const onDown = (e) => {
    dragging.current = true;
    lastX.current = e.clientX ?? 0;
    vel.current = 0;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (!dragging.current) return;
    const x = e.clientX ?? 0;
    const dx = (x - lastX.current) * 0.01;
    angle.current += dx;
    vel.current = dx;
    lastX.current = x;
    if (reduced) force((n) => (n + 1) & 0xffff);
  };
  const onUp = () => (dragging.current = false);

  const phase = repPhase(timeRef.current, cfg.speed);
  const pose = lerpPose(cfg.A, cfg.B, phase);
  const cos = Math.cos(angle.current);
  const sin = Math.sin(angle.current);
  const pts = {};
  for (const k in pose) pts[k] = project(pose[k], cos, sin);

  const bar = cfg.bar
    ? {
        a: project([-cfg.bar.halfWidth, cfg.bar.y, 0], cos, sin),
        b: project([cfg.bar.halfWidth, cfg.bar.y, 0], cos, sin),
      }
    : null;

  return (
    <div
      ref={wrapRef}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#141210] to-[#080808] ${className}`}
    >
      <div className="flex h-full w-full">
        {/* live joint angles, read off the same pose the figure is drawn from */}
        <div className="flex w-[38%] max-w-[9.5rem] shrink-0 flex-col justify-center gap-px border-r border-white/10">
          {rows.map((key) => (
            <div key={key} className="px-3 py-1.5">
              <div className="text-[0.62rem] font-semibold leading-tight text-accent-strong">
                {t(`coach.angle.${key}`)}
              </div>
              <div className="font-display text-[1.05rem] font-extrabold leading-tight text-white">
                {measureAngle(pose, key)}°
              </div>
            </div>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <svg
            /* Framed from the measured extent of every pose across a full
               rotation, so no exercise clips when the figure is orbited, and
               all six stay at one consistent scale. */
            viewBox="71 48 218 310"
            className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
            role="img"
            aria-label={exercise.name?.en || id}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
          >
            {/* ember contour backdrop */}
            <g stroke="var(--accent)" fill="none" strokeWidth="0.9" opacity="0.22">
              {CONTOURS.map((d, i) => <path key={i} d={d} />)}
            </g>

            {/* receding floor grid */}
            <g stroke="var(--accent)" strokeWidth="0.7" opacity="0.14">
              {FLOOR.h.map((l, i) => <line key={`h${i}`} x1={l.x1} y1={l.y} x2={l.x2} y2={l.y} />)}
              {FLOOR.v.map((l, i) => <line key={`v${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />)}
            </g>

            {/* ground contact shadow */}
            {cfg.ground && <ellipse cx={CX} cy="330" rx="78" ry="10" fill="#000" opacity="0.45" />}

            {/* pull-up bar, projected so it orbits with the figure */}
            {bar && (
              <line
                x1={bar.a.x} y1={bar.a.y} x2={bar.b.x} y2={bar.b.y}
                stroke="var(--text-muted)" strokeWidth={5} strokeLinecap="round" opacity="0.85"
              />
            )}

            {/* bones */}
            <g stroke="var(--accent)" strokeLinecap="round">
              {BONES.map(([a, b], i) => {
                const pa = pts[a], pb = pts[b];
                if (!pa || !pb) return null;
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
                  r={(k === "head" ? 14 : 4.4) * p.s}
                  fill="#0d0d0d"
                  stroke="var(--accent)"
                  strokeWidth={2.6 * p.s}
                  opacity={0.55 + 0.45 * Math.min(1, (p.s - 0.85) / 0.35)}
                />
              ))}
            </g>

            {cfg.dumbbells && (
              <>
                <Dumbbell p={pts.wristL} />
                <Dumbbell p={pts.wristR} />
              </>
            )}
          </svg>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-2.5 right-3 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[0.68rem] font-semibold text-white/65 backdrop-blur">
        <Rotate3d className="h-3.5 w-3.5" /> {t("coach.dragRotate")}
      </div>
    </div>
  );
}

/** A dumbbell at a wrist: a short bar with a plate at each end, billboarded. */
function Dumbbell({ p }) {
  if (!p) return null;
  const r = 7 * p.s;
  return (
    <g opacity={0.6 + 0.4 * Math.min(1, (p.s - 0.85) / 0.35)}>
      <line x1={p.x - r * 1.7} y1={p.y} x2={p.x + r * 1.7} y2={p.y} stroke="var(--text-primary)" strokeWidth={2.6 * p.s} strokeLinecap="round" />
      <circle cx={p.x - r * 1.7} cy={p.y} r={r * 0.78} fill="var(--text-primary)" stroke="var(--accent)" strokeWidth={1.4 * p.s} />
      <circle cx={p.x + r * 1.7} cy={p.y} r={r * 0.78} fill="var(--text-primary)" stroke="var(--accent)" strokeWidth={1.4 * p.s} />
    </g>
  );
}
