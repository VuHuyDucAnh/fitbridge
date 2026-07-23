import { useEffect, useRef, useState } from "react";
import { Sparkles, BadgeCheck, Flame, Trophy, X } from "lucide-react";
import { computeAchievements } from "../../lib/achievements";
import { useApp, useStats } from "../../state/AppState";
import { useI18n } from "../../i18n/LanguageContext";

const ICONS = { Sparkles, BadgeCheck, Flame, Trophy };

/* Watches real achievement state and pops a celebratory toast the moment a new
   one unlocks. The first computed set (on load / sign-in) is recorded silently
   so only genuinely NEW unlocks toast. Self-contained: renders its own stack. */
export default function AchievementToaster() {
  const { workouts } = useApp();
  const stats = useStats();
  const { t, locale } = useI18n();

  const seen = useRef(null); // Set of unlocked ids; null until first compute
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unlocked = computeAchievements({ workouts, stats }).filter((a) => a.unlocked);
    const ids = new Set(unlocked.map((a) => a.id));

    if (seen.current === null) {
      seen.current = ids; // baseline — don't toast pre-existing achievements
      return;
    }
    const fresh = unlocked.filter((a) => !seen.current.has(a.id));
    seen.current = ids;
    if (fresh.length) {
      setToasts((prev) => [...prev, ...fresh.map((a) => ({ ...a, key: `${a.id}-${Date.now()}` }))]);
    }
  }, [workouts, stats]);

  const dismiss = (key) => setToasts((prev) => prev.filter((x) => x.key !== key));

  // auto-dismiss each toast after a beat
  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((x) => setTimeout(() => dismiss(x.key), 6000));
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[70] flex flex-col items-center gap-2 px-4 sm:top-24">
      {toasts.map((a) => {
        const Icon = ICONS[a.icon] || Trophy;
        return (
          <div
            key={a.key}
            className="glass animate-pop pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-accent/30 p-3 shadow-float"
            role="status"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-strong text-accent-contrast">
              <Icon className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[0.7rem] font-bold uppercase tracking-wide text-accent-strong">
                {t("profile.achievementUnlocked")}
              </div>
              <div className="truncate font-display font-extrabold text-ink">{a.name[locale]}</div>
              <div className="truncate text-[0.8rem] text-ink-2">{a.desc[locale]}</div>
            </div>
            <button
              onClick={() => dismiss(a.key)}
              aria-label={t("common.close")}
              className="glow grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-sunken"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
