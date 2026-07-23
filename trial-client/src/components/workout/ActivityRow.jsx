import { Dumbbell, Flame, Star, Timer } from "lucide-react";
import { getExercise } from "../../data/exercises";
import { formatDuration } from "../../lib/fitness";
import { useI18n } from "../../i18n/LanguageContext";

export default function ActivityRow({ workout }) {
  const { locale, t } = useI18n();
  const ex = getExercise(workout.exerciseId);
  const date = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(new Date(workout.date));

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 transition-colors hover:bg-sunken">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-surface text-accent-strong">
        <Dumbbell className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-semibold text-ink">{ex.name[locale]}</p>
          <span className="shrink-0 text-[0.75rem] text-ink-3">{date}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[0.78rem] text-ink-2">
          {workout.reps > 0 && (
            <span className="inline-flex items-center gap-1">
              <Dumbbell className="h-3.5 w-3.5" /> {workout.reps} {t("common.reps")}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Timer className="h-3.5 w-3.5" /> {formatDuration(workout.durationSec)}
          </span>
          <span className="inline-flex items-center gap-1 text-accent-strong">
            <Flame className="h-3.5 w-3.5" /> {workout.calories} {t("common.kcal")}
          </span>
          {workout.formScore != null && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5" /> {workout.formScore}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
