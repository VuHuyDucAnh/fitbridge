import { Flame, Dumbbell, Layers, Star, Check, X, ArrowRight, CheckCircle2, RotateCcw, Save, Flame as FlameIcon } from "lucide-react";
import Button from "../ui/Button";
import StatTile from "../ui/StatTile";
import Reveal from "../ui/Reveal";
import { formatDuration } from "../../lib/fitness";
import { useI18n } from "../../i18n/LanguageContext";

export default function SessionReport({ report, exercise, onSave, onAgain, saved }) {
  const { t, locale } = useI18n();
  const isHold = exercise.detection.mode === "hold";

  return (
    <div className="space-y-4">
      <Reveal>
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-success-surface text-success">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <h2 className="font-display text-2xl font-extrabold">{t("coach.summaryTitle")}</h2>
        </div>
      </Reveal>

      {/* Stat tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Reveal><StatTile icon={<Flame className="h-4 w-4" />} label={t("coach.caloriesBurned")} value={report.calories} unit={t("common.kcal")} accent /></Reveal>
        <Reveal delay={60}>
          <StatTile
            icon={<Dumbbell className="h-4 w-4" />}
            label={isHold ? t("coach.duration") : t("coach.totalReps")}
            value={isHold ? `${report.holdSeconds}s` : report.reps}
          />
        </Reveal>
        <Reveal delay={120}><StatTile icon={<Layers className="h-4 w-4" />} label={t("coach.completedSets")} value={report.sets} /></Reveal>
        <Reveal delay={180}><StatTile icon={<Star className="h-4 w-4" />} label={t("coach.formScore")} value={report.formScore} unit="/10" /></Reveal>
      </div>

      {/* Good / Fix */}
      <div className="grid gap-4 md:grid-cols-2">
        <Reveal>
          <div className="card h-full p-6">
            <h3 className="mb-3 flex items-center gap-2 font-bold text-success">
              <Check className="h-5 w-5" /> {t("coach.wellDone")}
            </h3>
            <ul className="space-y-2.5">
              {report.good.map((g, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[0.92rem] text-ink-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {g}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="card h-full p-6">
            <h3 className="mb-3 flex items-center gap-2 font-bold text-warning">
              <X className="h-5 w-5" /> {t("coach.toFix")}
            </h3>
            <ul className="space-y-2.5">
              {report.fix.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[0.92rem] text-ink-2">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-warning" /> {f}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>

      {/* Next + Coach quote */}
      <div className="grid gap-4 md:grid-cols-2">
        <Reveal>
          <div className="card h-full p-6">
            <h3 className="mb-2 font-bold">{t("coach.nextSession")}</h3>
            <p className="text-[0.92rem] leading-relaxed text-ink-2">{report.next}</p>
            <p className="mt-3 text-[0.82rem] text-ink-3">
              {formatDuration(report.durationSec)} · {exercise.name[locale]}
            </p>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="card relative h-full overflow-hidden bg-ink p-6 text-bg">
            <FlameIcon className="absolute -right-3 -top-3 h-24 w-24 text-accent/20" />
            <div className="relative">
              <div className="text-[0.7rem] font-bold uppercase tracking-wide text-accent">{t("coach.coachSays")}</div>
              <p className="mt-2 font-display text-lg font-extrabold leading-snug text-bg">"{report.quote}"</p>
            </div>
          </div>
        </Reveal>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-1">
        {saved ? (
          <span className="inline-flex items-center gap-2 rounded-xl bg-success-surface px-4 py-2.5 text-[0.9rem] font-semibold text-success">
            <CheckCircle2 className="h-4.5 w-4.5" /> {t("coach.saved")}
          </span>
        ) : (
          <Button onClick={onSave} leftIcon={<Save className="h-4.5 w-4.5" />}>
            {t("coach.saveSession")}
          </Button>
        )}
        <Button variant="secondary" onClick={onAgain} leftIcon={<RotateCcw className="h-4 w-4" />}>
          {t("coach.startSession")}
        </Button>
      </div>
    </div>
  );
}
