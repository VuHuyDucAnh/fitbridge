import { useMemo, useState } from "react";
import { Dumbbell, Flame, Zap, Star, TrendingUp, ArrowRight, CalendarClock, Scale } from "lucide-react";
import PageShell from "../components/layout/PageShell";
import Button from "../components/ui/Button";
import StatTile from "../components/ui/StatTile";
import Reveal from "../components/ui/Reveal";
import Modal from "../components/ui/Modal";
import ActivityRow from "../components/workout/ActivityRow";
import { AreaLine, Bars, Sparkline } from "../components/charts/Charts";
import { useI18n } from "../i18n/LanguageContext";
import { useApp, useStats } from "../state/AppState";
import { EXERCISES } from "../data/exercises";

export default function DashboardPage() {
  const { t, locale } = useI18n();
  const { profile, weightLog, lastCheckin, updateWeight, dismissCheckin } = useApp();
  const stats = useStats();

  const weekAgo = Date.now() - 7 * 864e5;
  const needCheckin = !lastCheckin || new Date(lastCheckin).getTime() < weekAgo;
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [newWeight, setNewWeight] = useState(profile.weight);

  const volumeSeries = stats.weeklySeries.map((w) => ({ label: w.label, value: w.volume }));
  const calorieSeries = stats.weeklySeries.map((w) => ({ label: w.label, value: w.calories }));
  const weightSpark = weightLog.slice(-14).map((w) => w.weight);

  // Next planned: pick an exercise the user hasn't hit much recently.
  const nextExercise = useMemo(() => {
    const counts = {};
    for (const e of EXERCISES) counts[e.id] = 0;
    for (const w of stats.recent) counts[w.exerciseId] = (counts[w.exerciseId] || 0) + 1;
    return EXERCISES.slice().sort((a, b) => (counts[a.id] || 0) - (counts[b.id] || 0))[0];
  }, [stats.recent]);

  const empty = stats.totalWorkouts === 0;

  return (
    <PageShell requireOnboarding>
      <div className="mx-auto max-w-6xl px-5">
        {/* Header */}
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
                {t("dashboard.title", { name: profile.name || t("common.you") })}
              </h1>
              <p className="mt-1.5 text-ink-2">{t("dashboard.subtitle")}</p>
            </div>
            <Button to="/coach" size="lg" leftIcon={<Dumbbell className="h-4.5 w-4.5" />}>
              {t("dashboard.startWorkout")}
            </Button>
          </div>
        </Reveal>

        {/* Weekly check-in */}
        {needCheckin && !empty && (
          <Reveal>
            <div className="mt-6 flex flex-wrap items-center gap-4 rounded-3xl border border-accent/30 bg-accent-surface p-5">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-strong text-accent-contrast">
                <CalendarClock className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{t("profile.weeklyCheckin")}</p>
                <p className="text-[0.88rem] text-ink-2">{t("profile.weeklyCheckinBody")}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={dismissCheckin}>
                  {t("common.skip")}
                </Button>
                <Button size="sm" onClick={() => setCheckinOpen(true)} leftIcon={<Scale className="h-4 w-4" />}>
                  {t("profile.updateWeight")}
                </Button>
              </div>
            </div>
          </Reveal>
        )}

        {empty ? (
          <EmptyState />
        ) : (
          <>
            {/* Stat tiles */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Reveal><StatTile icon={<TrendingUp className="h-4 w-4" />} label={t("dashboard.weeklyVolume")} value={stats.weekVolume} unit={t("common.reps")} /></Reveal>
              <Reveal delay={60}><StatTile icon={<Flame className="h-4 w-4" />} label={t("dashboard.caloriesWeek")} value={stats.weekCalories} unit={t("common.kcal")} accent /></Reveal>
              <Reveal delay={120}><StatTile icon={<Zap className="h-4 w-4" />} label={t("dashboard.activeStreak")} value={stats.streak} unit={t("common.days")} /></Reveal>
              <Reveal delay={180}><StatTile icon={<Star className="h-4 w-4" />} label={t("dashboard.avgForm")} value={stats.avgForm} unit="/10" /></Reveal>
            </div>

            {/* Charts */}
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Reveal>
                <div className="card p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-bold">{t("dashboard.volumeTrend")}</h2>
                    <span className="text-[0.78rem] text-ink-3">12 {locale === "vi" ? "tuần" : "weeks"}</span>
                  </div>
                  <AreaLine data={volumeSeries} ariaLabel={t("dashboard.volumeTrend")} unit={` ${t("common.reps")}`} />
                </div>
              </Reveal>
              <Reveal delay={80}>
                <div className="card p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-bold">{t("dashboard.caloriesTrend")}</h2>
                    <span className="text-[0.78rem] text-ink-3">12 {locale === "vi" ? "tuần" : "weeks"}</span>
                  </div>
                  <Bars data={calorieSeries} unit=" kcal" />
                </div>
              </Reveal>
            </div>

            {/* Recent + side column */}
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <Reveal className="lg:col-span-2">
                <div className="card p-6">
                  <h2 className="mb-4 font-bold">{t("dashboard.recent")}</h2>
                  <div className="grid gap-2.5">
                    {stats.recent.map((w) => (
                      <ActivityRow key={w.id} workout={w} />
                    ))}
                  </div>
                </div>
              </Reveal>

              <Reveal delay={80}>
                <div className="grid gap-4">
                  {/* Next session */}
                  <div className="card p-6">
                    <h2 className="mb-3 font-bold">{t("dashboard.planTitle")}</h2>
                    <div className="rounded-2xl bg-sunken p-4">
                      <p className="font-display text-xl font-extrabold text-ink">{nextExercise.name[locale]}</p>
                      <p className="mt-1 text-[0.85rem] text-ink-2">{nextExercise.volume[locale]}</p>
                      <Button to="/coach" variant="secondary" size="sm" className="mt-4 w-full" rightIcon={<ArrowRight className="h-4 w-4" />}>
                        {t("dashboard.startWorkout")}
                      </Button>
                    </div>
                  </div>
                  {/* Weight trend */}
                  <div className="card p-6">
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold">{t("profile.weight")}</h2>
                      <span className="font-display text-xl font-extrabold text-accent-strong">
                        {profile.weight}<span className="ml-0.5 text-sm text-ink-3">kg</span>
                      </span>
                    </div>
                    <div className="mt-3">
                      <Sparkline data={weightSpark} width={260} height={44} />
                    </div>
                    <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setCheckinOpen(true)}>
                      {t("profile.updateWeight")}
                    </Button>
                  </div>
                </div>
              </Reveal>
            </div>
          </>
        )}
      </div>

      {/* Update weight modal */}
      <Modal open={checkinOpen} onClose={() => setCheckinOpen(false)} title={t("profile.updateWeight")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCheckinOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={() => { updateWeight(newWeight); setCheckinOpen(false); }}>{t("common.save")}</Button>
          </>
        }>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[0.82rem] font-semibold text-ink-2">{t("profile.weight")}</span>
            <span className="font-display text-3xl font-extrabold">{newWeight}<span className="ml-1 text-sm text-ink-3">kg</span></span>
          </div>
          <input type="range" min={38} max={160} value={newWeight} onChange={(e) => setNewWeight(+e.target.value)}
            className="mt-3 h-2 w-full" style={{ accentColor: "var(--accent)" }} aria-label={t("profile.weight")} />
        </div>
      </Modal>
    </PageShell>
  );
}

function EmptyState() {
  const { t } = useI18n();
  return (
    <div className="mt-10 grid place-items-center rounded-4xl border border-dashed border-line-strong p-12 text-center">
      <Dumbbell className="h-12 w-12 text-ink-3" />
      <h2 className="mt-4 text-xl font-bold">{t("dashboard.noData")}</h2>
      <p className="mt-2 max-w-sm text-ink-2">{t("dashboard.noDataBody")}</p>
      <Button to="/coach" className="mt-6">{t("dashboard.startWorkout")}</Button>
    </div>
  );
}
