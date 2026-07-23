import { useEffect, useRef, useState, useCallback } from "react";
import { useI18n } from "../../i18n/LanguageContext";

/*
  The signature: an interactive 3D pose-skeleton that actually performs the
  exercises FitBridge tracks. Pick a movement and the figure does clean,
  keyframed reps — squat, push-up, bicep curl (with dumbbells) — while the rep
  counter counts real animation cycles. Drag to orbit; depth reads through
  perspective (nearer joints bigger and brighter). Pure SVG + math: no WebGL,
  no dependency. Pauses off-screen / hidden tab / reduced-motion.
*/

const CX = 180, CY = 208, FOCAL = 260;

// ---------- exercise keyframes (y down, chest-ish origin, z toward viewer) ----
// Each exercise defines pose A (start) and pose B (end of the rep's hard phase).
const EXERCISE_POSES = {
  squat: {
    speed: 0.5, // reps per second
    A: { // tall stand, arms down by the sides
      head: [0, -96, 2], neck: [0, -70, 0],
      shoulderL: [-27, -62, 0], shoulderR: [27, -62, 0],
      elbowL: [-30, -30, 4], elbowR: [30, -30, 4],
      wristL: [-31, 2, 6], wristR: [31, 2, 6],
      hip: [0, 6, 0], hipL: [-17, 14, 0], hipR: [17, 14, 0],
      kneeL: [-19, 58, 8], kneeR: [19, 58, 8],
      ankleL: [-19, 104, 2], ankleR: [19, 104, 2],
    },
    B: { // deep squat: hips drop below knees, thighs ~horizontal, arms out front
      head: [0, -46, 24], neck: [0, -22, 16],
      shoulderL: [-28, -16, 14], shoulderR: [28, -16, 14],
      elbowL: [-30, -22, 46], elbowR: [30, -22, 46],
      wristL: [-27, -30, 72], wristR: [27, -30, 72],
      hip: [0, 52, -10], hipL: [-19, 58, -10], hipR: [19, 58, -10],
      kneeL: [-26, 62, 46], kneeR: [26, 62, 46], // knees drive forward + out
      ankleL: [-19, 104, 2], ankleR: [19, 104, 2],
    },
  },
  pushup: {
    speed: 0.6,
    A: { // top of the push-up: straight plank, arms extended
      head: [-84, 28, 0], neck: [-62, 34, 0],
      shoulderL: [-56, 36, -13], shoulderR: [-56, 36, 13],
      elbowL: [-54, 66, -17], elbowR: [-54, 66, 17],
      wristL: [-52, 96, -19], wristR: [-52, 96, 19],
      hip: [4, 48, 0], hipL: [6, 50, -9], hipR: [6, 50, 9],
      kneeL: [42, 60, -9], kneeR: [42, 60, 9],
      ankleL: [78, 72, -9], ankleR: [78, 72, 9],
    },
    B: { // bottom: chest near the floor, elbows bent back
      head: [-88, 62, 0], neck: [-64, 68, 0],
      shoulderL: [-58, 72, -13], shoulderR: [-58, 72, 13],
      elbowL: [-38, 84, -26], elbowR: [-38, 84, 26],
      wristL: [-52, 96, -19], wristR: [-52, 96, 19],
      hip: [2, 66, 0], hipL: [4, 68, -9], hipR: [4, 68, 9],
      kneeL: [42, 74, -9], kneeR: [42, 74, 9],
      ankleL: [78, 80, -9], ankleR: [78, 80, 9],
    },
  },
  "bicep-curl": {
    speed: 0.75,
    dumbbells: true,
    A: { // arms fully extended down, dumbbells hanging at the thighs
      head: [0, -96, 2], neck: [0, -70, 0],
      shoulderL: [-27, -62, 0], shoulderR: [27, -62, 0],
      elbowL: [-30, -24, 6], elbowR: [30, -24, 6],
      wristL: [-31, 16, 12], wristR: [31, 16, 12],
      hip: [0, 6, 0], hipL: [-17, 14, 0], hipR: [17, 14, 0],
      kneeL: [-19, 58, 6], kneeR: [19, 58, 6],
      ankleL: [-19, 104, 2], ankleR: [19, 104, 2],
    },
    B: { // full curl: forearms rotate right up to the shoulders, elbows pinned,
         // tiny torso lean from the effort
      head: [0, -95, 4], neck: [0, -69, 2],
      shoulderL: [-27, -61, 2], shoulderR: [27, -61, 2],
      elbowL: [-29, -26, 10], elbowR: [29, -26, 10],
      wristL: [-20, -60, 30], wristR: [20, -60, 30],
      hip: [0, 6, 0], hipL: [-17, 14, 0], hipR: [17, 14, 0],
      kneeL: [-19, 58, 6], kneeR: [19, 58, 6],
      ankleL: [-19, 104, 2], ankleR: [19, 104, 2],
    },
  },
};

const EXERCISE_LABELS = {
  squat: { en: "Squat", vi: "Squat" },
  pushup: { en: "Push-up", vi: "Chống đẩy" },
  "bicep-curl": { en: "Bicep curl", vi: "Cuốn tạ tay" },
};

const BONES = [
  ["head", "neck"], ["neck", "shoulderL"], ["neck", "shoulderR"], ["shoulderL", "shoulderR"],
  ["shoulderL", "elbowL"], ["elbowL", "wristL"], ["shoulderR", "elbowR"], ["elbowR", "wristR"],
  ["neck", "hip"], ["hip", "hipL"], ["hip", "hipR"], ["hipL", "hipR"],
  ["hipL", "kneeL"], ["kneeL", "ankleL"], ["hipR", "kneeR"], ["kneeR", "ankleR"],
];

function project(p, cos, sin) {
  const x = p[0] * cos + p[2] * sin;
  const z = -p[0] * sin + p[2] * cos;
  const s = FOCAL / (FOCAL - z);
  return { x: CX + x * s, y: CY + p[1] * s, s };
}

// smooth ping-pong 0→1→0 with an easeInOut on each half — reads like a real rep
function repPhase(time, speed) {
  const cycle = (time * speed) % 1;
  const half = cycle < 0.5 ? cycle * 2 : (1 - cycle) * 2;
  return half * half * (3 - 2 * half); // smoothstep
}

function lerpPose(A, B, t) {
  const out = {};
  for (const k in A) {
    out[k] = [
      A[k][0] + (B[k][0] - A[k][0]) * t,
      A[k][1] + (B[k][1] - A[k][1]) * t,
      A[k][2] + (B[k][2] - A[k][2]) * t,
    ];
  }
  return out;
}

// A dumbbell at a wrist: a short bar with a plate at each end, billboarded.
function Dumbbell({ p }) {
  const r = 7 * p.s;
  return (
    <g opacity={0.6 + 0.4 * Math.min(1, (p.s - 0.85) / 0.35)}>
      <line x1={p.x - r * 1.7} y1={p.y} x2={p.x + r * 1.7} y2={p.y} stroke="var(--text-primary)" strokeWidth={2.6 * p.s} strokeLinecap="round" />
      <circle cx={p.x - r * 1.7} cy={p.y} r={r * 0.78} fill="var(--text-primary)" stroke="var(--accent)" strokeWidth={1.4 * p.s} />
      <circle cx={p.x + r * 1.7} cy={p.y} r={r * 0.78} fill="var(--text-primary)" stroke="var(--accent)" strokeWidth={1.4 * p.s} />
    </g>
  );
}

export default function PoseProof({ className = "" }) {
  const { t, locale } = useI18n();
  const wrapRef = useRef(null);
  const angle = useRef(0.35);
  const vel = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const raf = useRef(0);
  const visible = useRef(true);
  const timeRef = useRef(0);
  const lastTs = useRef(0);
  const repsRef = useRef(0);
  const lastCycle = useRef(0);
  const [exercise, setExercise] = useState("pushup");
  const [, force] = useState(0);

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const tick = useCallback(
    (ts) => {
      const dt = lastTs.current ? Math.min(0.05, (ts - lastTs.current) / 1000) : 0.016;
      lastTs.current = ts;
      timeRef.current += dt;
      if (!dragging.current) {
        // reduced-motion only stops the idle auto-rotation, never the exercise
        angle.current += vel.current + (reduced ? 0 : 0.0035);
        vel.current *= 0.94;
      }
      // count completed rep cycles
      const cfg = EXERCISE_POSES[exercise];
      const cycle = Math.floor(timeRef.current * cfg.speed);
      if (cycle > lastCycle.current) {
        repsRef.current += cycle - lastCycle.current;
        lastCycle.current = cycle;
      }
      force((n) => (n + 1) & 0xffff);
      raf.current = requestAnimationFrame(tick);
    },
    [reduced, exercise]
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
  }, [tick, reduced]);

  const pickExercise = (id) => {
    setExercise(id);
    repsRef.current = 0;
    lastCycle.current = Math.floor(timeRef.current * EXERCISE_POSES[id].speed);
  };

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

  const cfg = EXERCISE_POSES[exercise];
  const phase = repPhase(timeRef.current, cfg.speed);
  const pose = lerpPose(cfg.A, cfg.B, phase);
  const cos = Math.cos(angle.current);
  const sin = Math.sin(angle.current);
  const pts = {};
  for (const k in pose) pts[k] = project(pose[k], cos, sin);

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

          {/* ground */}
          <ellipse cx={CX} cy="392" rx="86" ry="12" fill="#000" opacity="0.5" />

          {/* bones */}
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
                r={(k === "head" ? 14 : 4.4) * p.s}
                fill="#0d0d0d"
                stroke="var(--accent)"
                strokeWidth={2.6 * p.s}
                opacity={0.55 + 0.45 * Math.min(1, (p.s - 0.85) / 0.35)}
              />
            ))}
          </g>

          {/* dumbbells for curl */}
          {cfg.dumbbells && (
            <>
              <Dumbbell p={pts.wristL} />
              <Dumbbell p={pts.wristR} />
            </>
          )}

        </svg>

        {/* status chips */}
        <div className="glass pointer-events-none absolute left-4 top-4 inline-flex w-max max-w-[calc(100%-2rem)] items-center gap-2 overflow-hidden whitespace-nowrap rounded-full px-3 py-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
          <span className="text-[0.72rem] font-bold uppercase tracking-wider text-ink">{t("coach.tracking")}</span>
        </div>
        <div className="glass pointer-events-none absolute right-4 top-4 rounded-2xl px-3.5 py-2 text-right">
          <div className="font-mono text-2xl font-bold leading-none text-accent">{repsRef.current}</div>
          <div className="mt-0.5 text-[0.62rem] font-semibold uppercase tracking-wider text-ink-2">{t("coach.reps")}</div>
        </div>
        <div className="glass pointer-events-none absolute bottom-16 right-4 flex w-max items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5">
          <DragIcon />
          <span className="text-[0.66rem] font-semibold uppercase tracking-wider text-ink-2">{t("home.dragHint")}</span>
        </div>

        {/* exercise picker */}
        <div className="glass absolute inset-x-4 bottom-4 flex items-center gap-1.5 rounded-2xl p-1.5">
          {Object.keys(EXERCISE_POSES).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => pickExercise(id)}
              aria-pressed={exercise === id}
              className={`glow min-w-0 flex-1 truncate rounded-xl px-2 py-2 text-[0.78rem] font-bold transition-colors ${
                exercise === id
                  ? "bg-accent-strong text-accent-contrast"
                  : "text-ink-2 hover:text-ink"
              }`}
            >
              {EXERCISE_LABELS[id][locale] || EXERCISE_LABELS[id].en}
            </button>
          ))}
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
