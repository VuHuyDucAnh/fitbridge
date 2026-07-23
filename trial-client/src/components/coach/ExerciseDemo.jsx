import { useEffect, useRef, useState } from "react";

/**
 * Animated range-of-motion demo. Visualizes exactly what the detector measures:
 * the tracked joint angle opening and closing between the exercise's flex and
 * extend thresholds. Honest (no stock video) and consistent with the tracker.
 */
const JOINT_LABEL = {
  elbow: { en: "Elbow angle", vi: "Góc khuỷu tay" },
  knee: { en: "Knee angle", vi: "Góc đầu gối" },
  hip: { en: "Body line", vi: "Đường thân" },
};

function polar(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, a0, a1) {
  const s = polar(cx, cy, r, a0);
  const e = polar(cx, cy, r, a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

export default function ExerciseDemo({ exercise, className = "" }) {
  const { detection } = exercise;
  const isHold = detection.mode === "hold";
  const flex = isHold ? 155 : detection.flex;
  const extend = isHold ? 178 : detection.extend;
  const [angle, setAngle] = useState(extend);
  const raf = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setAngle((flex + extend) / 2);
      return;
    }
    let start;
    const period = 2600;
    const loop = (ts) => {
      if (document.hidden) {
        raf.current = requestAnimationFrame(loop);
        return;
      }
      if (!start) start = ts;
      const p = ((ts - start) % period) / period;
      const t = (1 - Math.cos(p * 2 * Math.PI)) / 2; // ease 0..1..0
      setAngle(extend + (flex - extend) * t);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [flex, extend]);

  const cx = 90;
  const cy = 120;
  const boneLen = 62;
  const aFixed = 168; // fixed bone points left-down
  const bAbs = aFixed - angle;
  const endA = polar(cx, cy, boneLen, aFixed);
  const endB = polar(cx, cy, boneLen, bAbs);
  const arcR = 26;
  const contracted = angle <= (flex + extend) / 2;

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-ink ${className}`}>
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/25 blur-2xl" />
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <circle cx={cx} cy={cy} r="72" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        {/* angle arc */}
        <path d={arcPath(cx, cy, arcR, bAbs, aFixed)} fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
        {/* bones */}
        <line x1={cx} y1={cy} x2={endA.x} y2={endA.y} stroke="#fff" strokeOpacity="0.85" strokeWidth="7" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={endB.x} y2={endB.y} stroke={contracted ? "#ff3b6b" : "var(--accent)"} strokeWidth="7" strokeLinecap="round" style={{ transition: "stroke 0.3s" }} />
        {/* joints */}
        <circle cx={endA.x} cy={endA.y} r="6" fill="#fff" />
        <circle cx={endB.x} cy={endB.y} r="6" fill="var(--accent)" />
        <circle cx={cx} cy={cy} r="8" fill="#0c0c0b" stroke="#fff" strokeWidth="2.5" />
      </svg>
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-black/40 px-3 py-2 backdrop-blur">
        <span className="text-[0.72rem] font-semibold text-white/80">{joint(exercise)}</span>
        <span className="font-display text-lg font-extrabold text-accent">{Math.round(angle)}°</span>
      </div>
    </div>
  );
}

function joint(exercise) {
  const key = exercise.detection.joint;
  const lang = document.documentElement.getAttribute("lang") === "vi" ? "vi" : "en";
  return (JOINT_LABEL[key] || JOINT_LABEL.elbow)[lang];
}
