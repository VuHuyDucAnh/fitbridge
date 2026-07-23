import { useI18n } from "../../i18n/LanguageContext";
import { muscleName } from "../../data/muscles";

/*
  FitBridge muscle heat map — front + back anatomical figures.
  Each muscle group is a filled region driven by trained volume (accent ramp:
  gray = untrained, hot orange = high volume) and is individually selectable.
  Mirrors the reference: dark muscular bodies, active muscles glowing orange.
*/

function rampFor(volume, max) {
  const r = max ? volume / max : 0;
  const idx = Math.min(5, Math.round(r * 5));
  return `var(--ramp-${idx})`;
}

const BODY = "var(--ramp-0)"; // resting muscle tone
const SEP = "rgba(0,0,0,0.28)"; // muscle separations / outline

export default function BodyHeatmap({ muscleVolume, maxMuscle, selected, onSelect }) {
  const { locale } = useI18n();
  const fill = (key) => rampFor(muscleVolume[key] || 0, maxMuscle);

  // A selectable muscle region: one or more <path>/<ellipse> children.
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
        strokeWidth: selected === k ? 2.4 : 1,
      }}
    >
      {children}
    </g>
  );

  return (
    <div className="grid gap-4">
      <svg
        viewBox="0 0 340 320"
        className="mx-auto h-[380px] w-full max-w-[440px]"
        role="group"
        aria-label={locale === "vi" ? "Bản đồ nhiệt cơ bắp" : "Muscle heat map"}
      >
        {/* ============ FRONT (left) ============ */}
        <g transform="translate(10,0)">
          <text x="75" y="14" textAnchor="middle" className="fill-[var(--text-muted)] text-[9px] font-semibold uppercase tracking-wider">
            {locale === "vi" ? "Trước" : "Front"}
          </text>

          {/* silhouette base (head, neck, hands, feet — non-muscle) */}
          <g fill={BODY} stroke={SEP} strokeWidth="1">
            <path d="M75 22c-8 0-13 6-13 14 0 6 3 11 8 13l-1 8c-6 1-9 3-9 3h30s-3-2-9-3l-1-8c5-2 8-7 8-13 0-8-5-14-13-14z" />
            <path d="M40 150l-3 34c-2 8 6 10 8 2l4-30z" />
            <path d="M110 150l3 34c2 8-6 10-8 2l-4-30z" />
            <path d="M60 286l-2 20c0 4 12 4 12 0l-1-20z" />
            <path d="M82 286l1 20c0 4 12 4 12 0l-2-20z" />
          </g>

          {/* shoulders (front delts) */}
          <M k="shoulders">
            <ellipse cx="48" cy="70" rx="13" ry="12" />
            <ellipse cx="102" cy="70" rx="13" ry="12" />
          </M>
          {/* chest */}
          <M k="chest">
            <path d="M55 66c8-4 16-4 19 1v20c-8 5-17 4-22-3-2-7 0-14 3-18z" />
            <path d="M95 66c-8-4-16-4-19 1v20c8 5 17 4 22-3 2-7 0-14-3-18z" />
          </M>
          {/* biceps */}
          <M k="biceps">
            <path d="M40 84c-6 3-9 9-9 18l1 24c0 6 10 6 11 0l2-38c0-5-2-6-5-4z" />
            <path d="M110 84c6 3 9 9 9 18l-1 24c0 6-10 6-11 0l-2-38c0-5 2-6 5-4z" />
          </M>
          {/* forearms */}
          <M k="forearms">
            <path d="M34 128l3-4c5-2 8 0 8 6l-2 26c-1 6-9 6-11 0z" />
            <path d="M116 128l-3-4c-5-2-8 0-8 6l2 26c1 6 9 6 11 0z" />
          </M>
          {/* abs */}
          <M k="abs">
            <path d="M64 112h22c3 0 5 2 5 5l-2 50c0 4-3 6-7 6h-14c-4 0-7-2-7-6l-2-50c0-3 2-5 5-5z" />
            <g stroke={SEP} strokeWidth="0.8" opacity="0.5">
              <line x1="75" y1="112" x2="75" y2="173" />
              <line x1="62" y1="128" x2="88" y2="128" />
              <line x1="61" y1="144" x2="89" y2="144" />
              <line x1="61" y1="159" x2="89" y2="159" />
            </g>
          </M>
          {/* obliques */}
          <M k="obliques">
            <path d="M58 118c-4 16-3 34 4 50l4-3-2-49z" />
            <path d="M92 118c4 16 3 34-4 50l-4-3 2-49z" />
          </M>
          {/* quads */}
          <M k="quads">
            <path d="M58 176h16c3 0 5 2 5 6l-4 58c0 5-11 5-12 0l-8-58c-1-4 0-6 3-6z" />
            <path d="M92 176h-16c-3 0-5 2-5 6l4 58c0 5 11 5 12 0l8-58c1-4 0-6-3-6z" />
          </M>
          {/* calves (front shin/tibialis) */}
          <M k="calves">
            <path d="M60 244l10 2 -2 42c0 4-9 4-10 0z" />
            <path d="M90 244l-10 2 2 42c0 4 9 4 10 0z" />
          </M>
        </g>

        {/* ============ BACK (right) ============ */}
        <g transform="translate(180,0)">
          <text x="75" y="14" textAnchor="middle" className="fill-[var(--text-muted)] text-[9px] font-semibold uppercase tracking-wider">
            {locale === "vi" ? "Sau" : "Back"}
          </text>

          <g fill={BODY} stroke={SEP} strokeWidth="1">
            <path d="M75 22c-8 0-13 6-13 14 0 6 3 11 8 13l-1 8c-6 1-9 3-9 3h30s-3-2-9-3l-1-8c5-2 8-7 8-13 0-8-5-14-13-14z" />
            <path d="M40 150l-3 34c-2 8 6 10 8 2l4-30z" />
            <path d="M110 150l3 34c2 8-6 10-8 2l-4-30z" />
            <path d="M60 286l-2 20c0 4 12 4 12 0l-1-20z" />
            <path d="M82 286l1 20c0 4 12 4 12 0l-2-20z" />
          </g>

          {/* rear delts */}
          <M k="shoulders">
            <ellipse cx="48" cy="70" rx="13" ry="12" />
            <ellipse cx="102" cy="70" rx="13" ry="12" />
          </M>
          {/* back (traps + lats) */}
          <M k="back">
            <path d="M75 58c-9 0-15 4-19 9l-4 12c14 4 32 4 46 0l-4-12c-4-5-10-9-19-9z" />
            <path d="M56 82c-3 12-3 26 2 40 5-3 12-6 17-6V84c-7 0-14-1-19-2z" />
            <path d="M94 82c3 12 3 26-2 40-5-3-12-6-17-6V84c7 0 14-1 19-2z" />
          </M>
          {/* triceps */}
          <M k="triceps">
            <path d="M40 84c-6 3-9 9-9 18l1 24c0 6 10 6 11 0l2-38c0-5-2-6-5-4z" />
            <path d="M110 84c6 3 9 9 9 18l-1 24c0 6-10 6-11 0l-2-38c0-5 2-6 5-4z" />
          </M>
          {/* forearms (back) */}
          <M k="forearms">
            <path d="M34 128l3-4c5-2 8 0 8 6l-2 26c-1 6-9 6-11 0z" />
            <path d="M116 128l-3-4c-5-2-8 0-8 6l2 26c1 6 9 6 11 0z" />
          </M>
          {/* glutes */}
          <M k="glutes">
            <path d="M74 126c-4 0-16 1-18 12-1 9 4 16 12 16 5 0 8-3 10-8v-18c-1-2-2-2-4-2z" />
            <path d="M76 126c4 0 16 1 18 12 1 9-4 16-12 16-5 0-8-3-10-8v-18c1-2 2-2 4-2z" />
          </M>
          {/* hamstrings */}
          <M k="hamstrings">
            <path d="M58 168h16c3 0 5 2 5 6l-4 52c0 5-11 5-12 0l-8-52c-1-4 0-6 3-6z" />
            <path d="M92 168h-16c-3 0-5 2-5 6l4 52c0 5 11 5 12 0l8-52c1-4 0-6-3-6z" />
          </M>
          {/* calves (back) */}
          <M k="calves">
            <path d="M59 236l11 3-1 46c0 5-10 5-11 0z" />
            <path d="M91 236l-11 3 1 46c0 5 10 5 11 0z" />
          </M>
        </g>
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
