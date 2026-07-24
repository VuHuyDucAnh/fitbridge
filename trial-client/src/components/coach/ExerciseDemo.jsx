import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n/LanguageContext";

/**
 * "How it's done" — an animated full-body figure that actually performs the
 * selected exercise, looping between its start and bottom positions. The body
 * part a beginner must watch (taken from each exercise's technique notes) is
 * coloured in the caution amber and gently pulsed, so the safety cue is shown
 * visually rather than as a raw joint-angle readout.
 */

// Skeleton bones as [from, to, key]. `spine` = torso/back line.
const BONES = [
  ["head", "neck", "headNeck"],
  ["neck", "shoulder", "shoulderLine"],
  ["neck", "hip", "spine"],
  ["shoulder", "elbow", "upperArm"],
  ["elbow", "wrist", "foreArm"],
  ["hip", "knee", "thigh"],
  ["knee", "ankle", "shin"],
  // optional back leg (lunge only)
  ["hip", "backKnee", "thighB"],
  ["backKnee", "backAnkle", "shinB"],
];

// Per-exercise start (A) + bottom (B) poses, plus the caution to highlight.
// Coordinates live in a 0..200 viewBox.
const P = {
  pushup: {
    a: { head: [44, 118], neck: [58, 122], shoulder: [72, 126], elbow: [74, 149], wrist: [76, 171], hip: [112, 130], knee: [143, 136], ankle: [170, 150] },
    b: { head: [44, 138], neck: [58, 141], shoulder: [72, 144], elbow: [92, 159], wrist: [76, 171], hip: [112, 150], knee: [143, 153], ankle: [170, 164] },
    caution: { bones: ["spine"], joint: "hip", label: { en: "Keep hips level — no sagging", vi: "Giữ hông ngang — không võng" } },
  },
  squat: {
    a: { head: [100, 42], neck: [100, 58], shoulder: [102, 62], elbow: [104, 88], wrist: [105, 112], hip: [100, 108], knee: [100, 142], ankle: [100, 174] },
    b: { head: [92, 72], neck: [96, 86], shoulder: [99, 90], elbow: [110, 102], wrist: [120, 110], hip: [95, 126], knee: [114, 148], ankle: [100, 174] },
    caution: { bones: ["thigh", "shin"], joint: "knee", label: { en: "Knees track over your toes", vi: "Gối đi theo mũi chân" } },
  },
  "bicep-curl": {
    a: { head: [100, 44], neck: [100, 60], shoulder: [104, 64], elbow: [104, 92], wrist: [104, 118], hip: [100, 110], knee: [100, 144], ankle: [100, 175] },
    b: { head: [100, 44], neck: [100, 60], shoulder: [104, 64], elbow: [104, 92], wrist: [113, 70], hip: [100, 110], knee: [100, 144], ankle: [100, 175] },
    caution: { bones: ["upperArm"], joint: "elbow", label: { en: "Pin your elbows to your sides", vi: "Ép khuỷu tay sát thân" } },
  },
  "pull-up": {
    a: { head: [100, 62], neck: [100, 72], shoulder: [100, 76], elbow: [100, 50], wrist: [100, 26], hip: [100, 120], knee: [100, 150], ankle: [100, 176] },
    b: { head: [100, 44], neck: [100, 52], shoulder: [100, 58], elbow: [92, 40], wrist: [100, 26], hip: [100, 100], knee: [100, 130], ankle: [100, 156] },
    caution: { bones: ["shoulderLine", "spine"], joint: "shoulder", label: { en: "Lower with control — no dropping", vi: "Hạ có kiểm soát — không thả rơi" } },
  },
  lunge: {
    a: { head: [100, 42], neck: [100, 58], shoulder: [101, 62], elbow: [101, 88], wrist: [101, 112], hip: [100, 108], knee: [100, 142], ankle: [100, 174], backKnee: [100, 142], backAnkle: [100, 174] },
    b: { head: [100, 60], neck: [100, 76], shoulder: [101, 80], elbow: [101, 104], wrist: [101, 124], hip: [100, 126], knee: [118, 150], ankle: [118, 174], backKnee: [82, 158], backAnkle: [70, 176] },
    caution: { bones: ["thigh", "shin"], joint: "knee", label: { en: "Front knee stays over the ankle", vi: "Gối trước giữ trên mắt cá" } },
  },
  plank: {
    a: { head: [44, 122], neck: [58, 126], shoulder: [72, 130], elbow: [78, 152], wrist: [88, 168], hip: [112, 134], knee: [143, 140], ankle: [170, 152] },
    b: { head: [44, 126], neck: [58, 130], shoulder: [72, 134], elbow: [78, 156], wrist: [88, 170], hip: [112, 138], knee: [143, 144], ankle: [170, 156] },
    caution: { bones: ["spine"], joint: "hip", label: { en: "Don't let the hips sag or pike", vi: "Đừng để hông võng hay nhô lên" } },
    hold: true,
  },
};

const CAUTION = "#ffb020";
const BONE = "#f4f4f2";

const lerp = (a, b, t) => a + (b - a) * t;
function lerpPose(a, b, t) {
  const out = {};
  for (const k of Object.keys(a)) {
    if (!b[k]) continue;
    out[k] = [lerp(a[k][0], b[k][0], t), lerp(a[k][1], b[k][1], t)];
  }
  return out;
}

export default function ExerciseDemo({ exercise, className = "" }) {
  const { locale } = useI18n();
  const conf = P[exercise.id] || P[exercise.detection.formKey] || P.pushup;
  const [t, setT] = useState(0);
  const [pulse, setPulse] = useState(1);
  const raf = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setT(0.5);
      return;
    }
    let start;
    const period = conf.hold ? 3200 : 2600;
    const loop = (ts) => {
      if (document.hidden) {
        raf.current = requestAnimationFrame(loop);
        return;
      }
      if (!start) start = ts;
      const p = ((ts - start) % period) / period;
      const ease = (1 - Math.cos(p * 2 * Math.PI)) / 2; // 0..1..0
      setT(conf.hold ? ease * 0.5 : ease); // planks barely move
      setPulse(0.55 + 0.45 * (1 - Math.cos(ts / 320)) / 2);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [conf]);

  const pose = lerpPose(conf.a, conf.b, t);
  const cautionBones = new Set(conf.caution.bones);
  const cj = conf.caution.joint;

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-[#0d0d0d] ${className}`}>
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/20 blur-2xl" />
      {/* faint ground line */}
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <line x1="20" y1="178" x2="180" y2="178" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" />

        {/* bones */}
        {BONES.map(([from, to, key]) => {
          const A = pose[from];
          const B = pose[to];
          if (!A || !B) return null;
          const isCaution = cautionBones.has(key);
          return (
            <line
              key={key}
              x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]}
              stroke={isCaution ? CAUTION : BONE}
              strokeWidth={isCaution ? 8 : 6.5}
              strokeLinecap="round"
              opacity={isCaution ? pulse : 0.92}
              style={isCaution ? { filter: `drop-shadow(0 0 6px ${CAUTION})` } : undefined}
            />
          );
        })}

        {/* joints */}
        {Object.entries(pose).map(([k, [x, y]]) => {
          if (k === "head") return null;
          const isCaution = k === cj;
          return <circle key={k} cx={x} cy={y} r={isCaution ? 5.5 : 4} fill={isCaution ? CAUTION : BONE} />;
        })}

        {/* caution joint ring */}
        {pose[cj] && (
          <circle
            cx={pose[cj][0]} cy={pose[cj][1]} r={13}
            fill="none" stroke={CAUTION} strokeWidth="2"
            opacity={pulse * 0.9}
          />
        )}

        {/* head */}
        {pose.head && (
          <circle cx={pose.head[0]} cy={pose.head[1]} r="9" fill="#0d0d0d" stroke={BONE} strokeWidth="3" />
        )}
      </svg>

      {/* caution cue — the watched body part, coloured, from the technique notes */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 rounded-xl bg-black/45 px-3 py-2 backdrop-blur">
        <span className="grid h-4 w-4 shrink-0 place-items-center">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full" style={{ background: CAUTION, boxShadow: `0 0 8px ${CAUTION}` }} />
        </span>
        <span className="text-[0.76rem] font-semibold leading-tight text-white/90">
          {conf.caution.label[locale] || conf.caution.label.en}
        </span>
      </div>
    </div>
  );
}
