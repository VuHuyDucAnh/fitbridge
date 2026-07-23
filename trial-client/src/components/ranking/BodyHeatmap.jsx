import { useI18n } from "../../i18n/LanguageContext";
import { muscleName } from "../../data/muscles";

/* Front-facing muscle map. Front-visible groups are clickable regions;
   remaining groups appear as chips beside it. Intensity → accent ramp. */

const OTHER = ["back", "triceps", "glutes", "hamstrings"];

function rampFor(volume, max) {
  const r = max ? volume / max : 0;
  const idx = Math.min(5, Math.round(r * 5));
  return `var(--ramp-${idx})`;
}

export default function BodyHeatmap({ muscleVolume, maxMuscle, selected, onSelect }) {
  const { locale } = useI18n();
  const fill = (key) => rampFor(muscleVolume[key] || 0, maxMuscle);

  const Region = ({ keyName, children }) => (
    <g
      role="button"
      tabIndex={0}
      aria-label={muscleName(keyName, locale)}
      aria-pressed={selected === keyName}
      onClick={() => onSelect(keyName)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(keyName);
        }
      }}
      className="cursor-pointer outline-none transition-opacity focus-visible:opacity-100"
      style={{ fill: fill(keyName) }}
    >
      <g
        stroke={selected === keyName ? "var(--accent)" : "rgba(0,0,0,0.12)"}
        strokeWidth={selected === keyName ? 3 : 1}
      >
        {children}
      </g>
    </g>
  );

  return (
    <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
      <svg viewBox="0 0 200 380" className="mx-auto h-[420px] max-w-full">
        {/* body base */}
        <g fill="var(--surface-sunken)" stroke="var(--border)" strokeWidth="1">
          <circle cx="100" cy="30" r="20" />
          <rect x="94" y="48" width="12" height="14" rx="4" />
          <path d="M64 66 q36 -12 72 0 l6 120 q-42 14 -84 0 z" />
          <rect x="52" y="70" width="16" height="110" rx="8" />
          <rect x="132" y="70" width="16" height="110" rx="8" />
          <circle cx="60" cy="192" r="9" />
          <circle cx="140" cy="192" r="9" />
          <path d="M72 188 h24 l-2 174 h-20 z" />
          <path d="M104 188 h24 l-2 174 h-20 z" />
        </g>

        {/* shoulders */}
        <Region keyName="shoulders">
          <ellipse cx="60" cy="76" rx="14" ry="12" />
          <ellipse cx="140" cy="76" rx="14" ry="12" />
        </Region>
        {/* chest */}
        <Region keyName="chest">
          <path d="M70 84 q14 -6 26 0 v20 q-16 8 -26 0 z" />
          <path d="M104 84 q14 -6 26 0 v20 q-10 8 -26 0 z" />
        </Region>
        {/* biceps */}
        <Region keyName="biceps">
          <rect x="52" y="108" width="16" height="42" rx="8" />
          <rect x="132" y="108" width="16" height="42" rx="8" />
        </Region>
        {/* forearms */}
        <Region keyName="forearms">
          <rect x="52" y="152" width="16" height="34" rx="8" />
          <rect x="132" y="152" width="16" height="34" rx="8" />
        </Region>
        {/* abs */}
        <Region keyName="abs">
          <rect x="86" y="112" width="28" height="60" rx="7" />
        </Region>
        {/* obliques */}
        <Region keyName="obliques">
          <path d="M74 116 q-6 26 6 52 l6 -4 v-48 z" />
          <path d="M126 116 q6 26 -6 52 l-6 -4 v-48 z" />
        </Region>
        {/* quads */}
        <Region keyName="quads">
          <path d="M74 190 h22 l-2 68 h-18 z" />
          <path d="M106 190 h22 l-2 68 h-18 z" />
        </Region>
        {/* calves */}
        <Region keyName="calves">
          <path d="M76 286 h18 l-2 56 h-14 z" />
          <path d="M108 286 h18 l-2 56 h-14 z" />
        </Region>
      </svg>

      {/* other groups + legend */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 sm:max-w-[9rem]">
          {OTHER.map((k) => (
            <button
              key={k}
              onClick={() => onSelect(k)}
              aria-pressed={selected === k}
              className={`glow rounded-full border px-3 py-1.5 text-[0.78rem] font-semibold transition-colors ${
                selected === k ? "border-accent bg-accent-surface text-accent-strong" : "border-line-strong bg-surface text-ink-2 hover:bg-sunken"
              }`}
              style={{ borderLeft: `4px solid ${fill(k)}` }}
            >
              {muscleName(k, locale)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[0.72rem] text-ink-3">
          <span>{locale === "vi" ? "Ít" : "Less"}</span>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className="h-3.5 w-3.5 rounded" style={{ background: `var(--ramp-${i})` }} />
          ))}
          <span>{locale === "vi" ? "Nhiều" : "More"}</span>
        </div>
      </div>
    </div>
  );
}
