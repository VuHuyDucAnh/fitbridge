import { useI18n } from "../../i18n/LanguageContext";

/*
  The signature element: a live camera frame with an orange pose-skeleton traced
  over a lifter mid-squat, plus floating rep/form chips. This is the proof that
  "the camera can see your form" — it appears nowhere a generic AI product could
  reuse it. Motion is a single ambient scan line, disabled under reduced-motion.
*/

// joint coordinates in the 360x440 frame
const J = {
  head: [180, 78],
  shoulderL: [150, 118], shoulderR: [212, 118],
  elbowL: [132, 168], elbowR: [230, 168],
  wristL: [150, 210], wristR: [212, 210],
  hipL: [162, 224], hipR: [200, 224],
  kneeL: [150, 300], kneeR: [214, 300],
  ankleL: [156, 372], ankleR: [206, 372],
};
const BONES = [
  ["shoulderL", "shoulderR"], ["shoulderL", "elbowL"], ["elbowL", "wristL"],
  ["shoulderR", "elbowR"], ["elbowR", "wristR"],
  ["shoulderL", "hipL"], ["shoulderR", "hipR"], ["hipL", "hipR"],
  ["hipL", "kneeL"], ["kneeL", "ankleL"], ["hipR", "kneeR"], ["kneeR", "ankleR"],
];

export default function PoseProof({ className = "" }) {
  const { t } = useI18n();

  return (
    <div className={`relative ${className}`}>
      {/* soft color field so the glass chips have something to sit on */}
      <div className="pointer-events-none absolute inset-6 rounded-[2rem] bg-accent/25 blur-[70px]" aria-hidden="true" />

      <div className="relative overflow-hidden rounded-[1.75rem] border border-line-strong bg-[#0d0d0d] shadow-float">
        <svg viewBox="0 0 360 440" className="block w-full" role="img" aria-label={t("coach.tracking")}>
          <defs>
            <radialGradient id="pp-vig" cx="50%" cy="38%" r="75%">
              <stop offset="0%" stopColor="#1a1a1a" />
              <stop offset="100%" stopColor="#080808" />
            </radialGradient>
          </defs>
          <rect width="360" height="440" fill="url(#pp-vig)" />

          {/* silhouette of the lifter behind the skeleton */}
          <path
            d="M180 60c14 0 24 10 24 24 0 8-3 14-8 18l30 14c10 5 14 12 14 24l-6 60 10 78c1 8-14 10-16 2l-14-70-4 4 4 70c0 9-18 9-18 0l-6-76-6 76c0 9-18 9-18 0l4-70-4-4-14 70c-2 8-17 6-16-2l10-78-6-60c0-12 4-19 14-24l30-14c-5-4-8-10-8-18 0-14 10-24 24-24z"
            fill="#161616"
          />

          {/* bones */}
          <g stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" opacity="0.95">
            {BONES.map(([a, b], i) => (
              <line key={i} x1={J[a][0]} y1={J[a][1]} x2={J[b][0]} y2={J[b][1]} />
            ))}
          </g>
          {/* joints */}
          <g>
            {Object.entries(J).map(([k, [x, y]]) => (
              <circle key={k} cx={x} cy={y} r={k === "head" ? 15 : 5} fill="#0d0d0d" stroke="var(--accent)" strokeWidth="3" />
            ))}
          </g>

          {/* knee angle callout */}
          <g fill="var(--accent)" opacity="0.9">
            <path d="M214 300 l26 -6 M214 300 l6 26" stroke="var(--accent)" strokeWidth="2" fill="none" />
          </g>

          {/* scan corners */}
          <g stroke="var(--accent)" strokeWidth="2.5" fill="none" opacity="0.9">
            <path d="M22 46 v-18 h18" /><path d="M338 46 v-18 h-18" />
            <path d="M22 394 v18 h18" /><path d="M338 394 v18 h-18" />
          </g>

          {/* ambient scan line */}
          <rect className="pp-scan" x="22" y="40" width="316" height="2" fill="var(--accent)" opacity="0.55" />
        </svg>

        {/* floating glass chips */}
        <div className="glass absolute left-4 top-4 flex items-center gap-2 rounded-full px-3 py-1.5">
          <span className="h-2 w-2 animate-pulse-ring rounded-full bg-accent" />
          <span className="text-[0.72rem] font-bold uppercase tracking-wider text-ink">{t("coach.tracking")}</span>
        </div>

        <div className="glass absolute right-4 top-4 rounded-2xl px-3.5 py-2 text-right">
          <div className="font-mono text-2xl font-bold leading-none text-accent">12</div>
          <div className="mt-0.5 text-[0.62rem] font-semibold uppercase tracking-wider text-ink-2">{t("coach.reps")}</div>
        </div>

        <div className="glass absolute bottom-4 left-4 rounded-2xl px-3.5 py-2">
          <div className="text-[0.62rem] font-semibold uppercase tracking-wider text-ink-2">{t("coach.formLive")}</div>
          <div className="font-mono text-2xl font-bold leading-none text-accent">94<span className="text-sm">%</span></div>
        </div>

        <div className="glass absolute bottom-4 right-4 rounded-2xl px-3.5 py-2">
          <div className="text-[0.62rem] font-semibold uppercase tracking-wider text-ink-2">Knee</div>
          <div className="font-mono text-2xl font-bold leading-none text-ink">92°</div>
        </div>
      </div>
    </div>
  );
}
