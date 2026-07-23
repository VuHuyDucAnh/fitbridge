import { useId } from "react";
import { useI18n } from "../../i18n/LanguageContext";
import { muscleName } from "../../data/muscles";

/*
  FitBridge muscle heat map — v2.
  One continuous anatomical silhouette per view (front + back). The body is a
  single smooth outline built by mirroring a right-half point list, and every
  muscle region is clipped INSIDE that outline, so the figure reads as one real
  person rather than disjointed blocks. Muscles glow along the accent ramp
  (resting tone → hot orange) by trained volume and stay individually selectable.
*/

function rampFor(volume, max) {
  const r = max ? volume / max : 0;
  const idx = Math.min(5, Math.round(r * 5));
  return `var(--ramp-${idx})`;
}

const BODY = "var(--ramp-0)"; // resting muscle tone
const SEP = "rgba(0,0,0,0.22)"; // subtle muscle separations

// Right half of the body outline, top of head → crotch centre. x≥75 = right side.
const HALF = [
  [75, 22], [89, 30], [88, 44], [80, 53], [95, 60], [112, 71], [117, 90],
  [118, 118], [115, 145], [112, 158], [106, 158], [103, 140], [99, 112],
  [93, 92], [90, 112], [92, 140], [94, 168], [96, 198], [91, 228], [89, 250],
  [91, 276], [85, 300], [90, 312], [80, 312], [79, 298], [79, 252], [75, 246],
];

// Build a full symmetric closed loop by mirroring the half across x = 75.
function buildLoop(half) {
  const mirror = ([x, y]) => [150 - x, y];
  const left = half.slice(1, -1).reverse().map(mirror);
  return [...half, ...left];
}

// Smooth closed path through points (Catmull-Rom → cubic bezier).
function smoothClosed(pts) {
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + "Z";
}

const OUTLINE = smoothClosed(buildLoop(HALF));

export default function BodyHeatmap({ muscleVolume, maxMuscle, selected, onSelect }) {
  const { locale } = useI18n();
  const uid = useId().replace(/:/g, "");
  const fill = (key) => rampFor(muscleVolume[key] || 0, maxMuscle);

  // A selectable muscle region, drawn INSIDE the body clip.
  const M = ({ k, children }) => (
    <g
      role="button"
      tabIndex={0}
      aria-label={muscleName(k, locale)}
      aria-pressed={selected === k}
      onClick={() => onSelect(k)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(k);
        }
      }}
      className="cursor-pointer outline-none [transition:fill_.35s_ease] focus-visible:[filter:brightness(1.25)]"
      style={{
        fill: fill(k),
        stroke: selected === k ? "var(--accent)" : SEP,
        strokeWidth: selected === k ? 2.2 : 0.8,
      }}
    >
      {children}
    </g>
  );

  // One figure: continuous silhouette + clipped muscle regions + one outline.
  const Figure = ({ side, label, children }) => {
    const clipId = `${uid}-${side}`;
    return (
      <g transform={side === "front" ? "translate(10,0)" : "translate(180,0)"}>
        <text x="75" y="14" textAnchor="middle" className="fill-[var(--text-muted)] text-[9px] font-semibold uppercase tracking-wider">
          {label}
        </text>
        <defs>
          <clipPath id={clipId}>
            <path d={OUTLINE} />
          </clipPath>
        </defs>
        {/* base silhouette fills every gap so there are no dark holes */}
        <path d={OUTLINE} fill={BODY} />
        {/* muscles, clipped to the body so nothing spills past the outline */}
        <g clipPath={`url(#${clipId})`}>{children}</g>
        {/* single continuous body outline on top */}
        <path d={OUTLINE} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="1.4" strokeLinejoin="round" />
      </g>
    );
  };

  return (
    <div className="grid gap-4">
      <svg
        viewBox="0 0 340 320"
        className="mx-auto h-[400px] w-full max-w-[460px]"
        role="group"
        aria-label={locale === "vi" ? "Bản đồ nhiệt cơ bắp" : "Muscle heat map"}
      >
        {/* ============ FRONT ============ */}
        <Figure side="front" label={locale === "vi" ? "Trước" : "Front"}>
          <M k="shoulders">
            <ellipse cx="46" cy="72" rx="15" ry="14" />
            <ellipse cx="104" cy="72" rx="15" ry="14" />
          </M>
          <M k="chest">
            <path d="M56 64c9-5 17-4 20 2v22c-9 6-19 4-24-4-2-8 1-16 4-20z" />
            <path d="M94 64c-9-5-17-4-20 2v22c9 6 19 4 24-4 2-8-1-16-4-20z" />
          </M>
          <M k="biceps">
            <path d="M38 86c-7 4-10 10-10 20l1 26c0 7 12 7 13 0l2-42c0-6-3-7-6-4z" />
            <path d="M112 86c7 4 10 10 10 20l-1 26c0 7-12 7-13 0l-2-42c0-6 3-7 6-4z" />
          </M>
          <M k="forearms">
            <path d="M31 132l3-5c6-2 9 0 9 7l-2 28c-1 7-10 7-12 0z" />
            <path d="M119 132l-3-5c-6-2-9 0-9 7l2 28c1 7 10 7 12 0z" />
          </M>
          <M k="abs">
            <path d="M63 108h24c3 0 5 2 5 6l-2 56c0 5-4 7-8 7h-14c-4 0-8-2-8-7l-2-56c0-4 2-6 5-6z" />
            <g stroke={SEP} strokeWidth="0.7" opacity="0.55" fill="none">
              <line x1="75" y1="108" x2="75" y2="176" />
              <line x1="62" y1="126" x2="88" y2="126" />
              <line x1="61" y1="144" x2="89" y2="144" />
              <line x1="61" y1="161" x2="89" y2="161" />
            </g>
          </M>
          <M k="obliques">
            <path d="M57 116c-4 18-3 38 5 55l4-3-2-54z" />
            <path d="M93 116c4 18 3 38-5 55l-4-3 2-54z" />
          </M>
          <M k="quads">
            <path d="M57 178h17c3 0 5 3 5 7l-5 62c0 6-12 6-13 0l-8-62c-1-5 1-7 4-7z" />
            <path d="M93 178h-17c-3 0-5 3-5 7l5 62c0 6 12 6 13 0l8-62c1-5-1-7-4-7z" />
          </M>
          <M k="calves">
            <path d="M59 246l11 2-2 46c0 5-10 5-11 0z" />
            <path d="M91 246l-11 2 2 46c0 5 10 5 11 0z" />
          </M>
        </Figure>

        {/* ============ BACK ============ */}
        <Figure side="back" label={locale === "vi" ? "Sau" : "Back"}>
          <M k="shoulders">
            <ellipse cx="46" cy="72" rx="15" ry="14" />
            <ellipse cx="104" cy="72" rx="15" ry="14" />
          </M>
          <M k="back">
            <path d="M75 56c-10 0-16 4-21 10l-4 13c15 5 35 5 50 0l-4-13c-5-6-11-10-21-10z" />
            <path d="M54 82c-3 13-3 28 2 43 6-3 13-6 19-6V84c-8 0-15-1-21-2z" />
            <path d="M96 82c3 13 3 28-2 43-6-3-13-6-19-6V84c8 0 15-1 21-2z" />
          </M>
          <M k="triceps">
            <path d="M38 86c-7 4-10 10-10 20l1 26c0 7 12 7 13 0l2-42c0-6-3-7-6-4z" />
            <path d="M112 86c7 4 10 10 10 20l-1 26c0 7-12 7-13 0l-2-42c0-6 3-7 6-4z" />
          </M>
          <M k="forearms">
            <path d="M31 132l3-5c6-2 9 0 9 7l-2 28c-1 7-10 7-12 0z" />
            <path d="M119 132l-3-5c-6-2-9 0-9 7l2 28c1 7 10 7 12 0z" />
          </M>
          <M k="glutes">
            <path d="M74 126c-5 0-18 1-20 14-1 10 5 18 13 18 6 0 9-4 11-9v-20c-1-2-2-3-4-3z" />
            <path d="M76 126c5 0 18 1 20 14 1 10-5 18-13 18-6 0-9-4-11-9v-20c1-2 2-3 4-3z" />
          </M>
          <M k="hamstrings">
            <path d="M57 170h17c3 0 5 3 5 7l-5 56c0 6-12 6-13 0l-8-56c-1-5 1-7 4-7z" />
            <path d="M93 170h-17c-3 0-5 3-5 7l5 56c0 6 12 6 13 0l8-56c1-5-1-7-4-7z" />
          </M>
          <M k="calves">
            <path d="M58 240l12 3-1 50c0 5-11 5-11 0z" />
            <path d="M92 240l-12 3 1 50c0 5 11 5 11 0z" />
          </M>
        </Figure>
      </svg>

      {/* legend */}
      <div className="flex items-center justify-center gap-1.5 text-[0.72rem] text-ink-3">
        <span>{locale === "vi" ? "Ít" : "Less"}</span>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="h-3.5 w-3.5 rounded" style={{ background: `var(--ramp-${i})` }} />
        ))}
        <span>{locale === "vi" ? "Nhiều" : "More"}</span>
      </div>
    </div>
  );
}
