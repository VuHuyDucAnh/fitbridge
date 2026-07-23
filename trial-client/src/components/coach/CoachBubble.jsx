import { useEffect, useRef, useState } from "react";
import { Flame } from "lucide-react";
import { randomQuote } from "../../lib/coach";
import { useI18n } from "../../i18n/LanguageContext";

/** Tough-coach silhouette — a stylized avatar, not a real person's likeness. */
function CoachAvatar({ size = 40 }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-zinc-700 to-black ring-2 ring-accent/50"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="#e7e7e7">
        <circle cx="12" cy="8" r="4.4" />
        <path d="M4 21c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5z" />
      </svg>
    </span>
  );
}

/**
 * Beast Mode motivation. Shows a short, clean quote bubble in the corner
 * periodically (and on demand via `nudge`) while enabled. Auto-dismisses.
 */
export default function CoachBubble({ enabled, nudge = 0 }) {
  const { t, locale } = useI18n();
  const [quote, setQuote] = useState("");
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef();

  const pop = () => {
    setQuote(randomQuote(locale));
    setVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), 6000);
  };

  // periodic pop while enabled
  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      return;
    }
    const first = setTimeout(pop, 4000);
    const interval = setInterval(pop, 30000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
      clearTimeout(hideTimer.current);
    };
  }, [enabled, locale]); // eslint-disable-line react-hooks/exhaustive-deps

  // on-demand nudge (e.g. after a fault)
  useEffect(() => {
    if (enabled && nudge > 0) pop();
  }, [nudge]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!enabled) return null;

  return (
    <div
      className={`pointer-events-none absolute bottom-4 left-4 z-20 max-w-[15rem] transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
      aria-live="polite"
    >
      <div className="glass flex items-start gap-2.5 rounded-2xl rounded-bl-md p-3 shadow-float">
        <CoachAvatar />
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-[0.68rem] font-bold uppercase tracking-wide text-accent-strong">
            <Flame className="h-3 w-3" /> {t("coach.coachSays")}
          </div>
          <p className="mt-0.5 text-[0.82rem] font-semibold leading-snug text-ink">{quote}</p>
        </div>
      </div>
    </div>
  );
}
