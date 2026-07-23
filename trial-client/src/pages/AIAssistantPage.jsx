import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Dumbbell, Target, BarChart3, Info } from "lucide-react";
import PageShell from "../components/layout/PageShell";
import Select from "../components/ui/Select";
import ExercisePicker from "../components/coach/ExercisePicker";
import ExerciseDemo from "../components/coach/ExerciseDemo";
import CameraStage from "../components/coach/CameraStage";
import SessionReport from "../components/coach/SessionReport";
import SequenceBuilder from "../components/coach/SequenceBuilder";
import Reveal from "../components/ui/Reveal";
import { EXERCISES, getExercise, DIFFICULTY_LABEL } from "../data/exercises";
import { muscleName } from "../data/muscles";
import { buildReport } from "../lib/report";
import { useI18n } from "../i18n/LanguageContext";
import { useApp } from "../state/AppState";

export default function AIAssistantPage() {
  const { t, locale } = useI18n();
  const { profile, addWorkout } = useApp();
  const [searchParams] = useSearchParams();
  const initialId = EXERCISES.some((e) => e.id === searchParams.get("ex"))
    ? searchParams.get("ex")
    : EXERCISES[0].id;
  const [selectedId, setSelectedId] = useState(initialId);
  const [report, setReport] = useState(null);
  const [saved, setSaved] = useState(false);
  const reportRef = useRef(null);
  const cameraRef = useRef(null);

  // Sequence builder state
  const [queue, setQueue] = useState([]);
  const [seqIndex, setSeqIndex] = useState(-1); // -1 = not running a sequence
  const [seqDone, setSeqDone] = useState(0);
  const seqActive = seqIndex >= 0 && seqIndex < queue.length;

  const exercise = getExercise(selectedId);

  const selectOptions = useMemo(
    () =>
      EXERCISES.map((e) => ({
        value: e.id,
        label: e.name[locale],
        secondary: `${DIFFICULTY_LABEL[e.difficulty][locale]} · ${e.targets.map((m) => muscleName(m, locale)).join(", ")}`,
        icon: <Dumbbell className="h-4 w-4" />,
      })),
    [locale]
  );

  const changeExercise = (id) => {
    if (seqActive) return; // locked while a sequence runs
    setSelectedId(id);
    setReport(null);
    setSaved(false);
  };

  const persist = (r) =>
    addWorkout({
      exerciseId: r.exerciseId,
      reps: r.reps,
      sets: r.sets,
      calories: r.calories,
      formScore: r.formScore,
      durationSec: r.durationSec,
    });

  const onEnd = (snap) => {
    const r = buildReport({ exercise, snap, profile, locale });
    setReport(r);
    setSaved(false);

    if (seqActive) {
      // Auto-save real work and advance to the next queued exercise.
      if (!r.noWork) {
        persist(r);
        setSaved(true);
        setSeqDone((d) => d + 1);
      }
      const next = seqIndex + 1;
      if (next < queue.length) {
        setSeqIndex(next);
        setSelectedId(queue[next].exerciseId);
        requestAnimationFrame(() => cameraRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
        return;
      }
      // Sequence finished
      setSeqIndex(-1);
    }
    requestAnimationFrame(() => reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const save = () => {
    persist(report);
    setSaved(true);
  };

  const startSequence = () => {
    if (seqActive) {
      // stop
      setSeqIndex(-1);
      return;
    }
    if (queue.length < 2) return;
    setSeqDone(0);
    setSeqIndex(0);
    setSelectedId(queue[0].exerciseId);
    setReport(null);
    setSaved(false);
    requestAnimationFrame(() => cameraRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  return (
    <PageShell requireOnboarding>
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{t("coach.title")}</h1>
          <p className="mt-1.5 text-ink-2">{t("coach.subtitle")}</p>
        </Reveal>

        {/* Section 1 — choose exercise */}
        <Reveal>
          <section className="mt-7">
            <SectionLabel icon={<Dumbbell className="h-4 w-4" />} step="1" text={t("coach.pickExercise")} />
            <div className="mt-3 hidden lg:block">
              <ExercisePicker value={selectedId} onChange={changeExercise} />
            </div>
            <div className="mt-3 lg:hidden">
              <Select options={selectOptions} value={selectedId} onChange={changeExercise} searchLabel={t("common.search")} />
            </div>
          </section>
        </Reveal>

        {/* Sequence builder */}
        <Reveal>
          <section className="mt-6">
            <SequenceBuilder
              queue={queue}
              onQueueChange={setQueue}
              onStart={startSequence}
              running={seqActive}
              activeIndex={seqIndex}
              doneCount={seqDone}
            />
          </section>
        </Reveal>

        {/* Section 2 — demo + camera */}
        <section ref={cameraRef} className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <Reveal>
            <div className="card flex h-full flex-col p-6">
              <SectionLabel icon={<Info className="h-4 w-4" />} step="" text={t("coach.demoTitle")} />
              <ExerciseDemo exercise={exercise} className="mt-3 aspect-square" />
              <h2 className="mt-4 font-display text-xl font-extrabold">{exercise.name[locale]}</h2>
              <p className="mt-1.5 text-[0.9rem] leading-relaxed text-ink-2">{exercise.description[locale]}</p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {exercise.targets.map((m) => (
                  <span key={m} className="inline-flex items-center gap-1 rounded-full bg-accent-surface px-2.5 py-1 text-[0.74rem] font-semibold text-accent-strong">
                    <Target className="h-3 w-3" /> {muscleName(m, locale)}
                  </span>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-[0.82rem]">
                <div className="rounded-xl bg-sunken p-3">
                  <div className="text-ink-3">{t("coach.difficulty")}</div>
                  <div className="font-semibold text-ink">{DIFFICULTY_LABEL[exercise.difficulty][locale]}</div>
                </div>
                <div className="rounded-xl bg-sunken p-3">
                  <div className="text-ink-3">{t("coach.volume")}</div>
                  <div className="font-semibold text-ink">{exercise.volume[locale]}</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 text-[0.82rem] font-semibold text-ink-2">{t("coach.techniqueNotes")}</div>
                <ul className="space-y-1.5">
                  {exercise.notes[locale].map((n, i) => (
                    <li key={i} className="flex items-start gap-2 text-[0.85rem] text-ink-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" /> {n}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="card p-6">
              <SectionLabel icon={<BarChart3 className="h-4 w-4" />} step="2" text={t("coach.cameraTitle")} />
              {seqActive && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-accent/30 bg-accent-surface px-4 py-2.5 text-[0.85rem] font-semibold text-accent-strong">
                  <span className="rounded-full bg-accent-strong px-2.5 py-0.5 text-[0.75rem] text-accent-contrast">
                    {t("coach.seqProgress", { n: seqIndex + 1, total: queue.length })}
                  </span>
                  <span>{exercise.name[locale]}</span>
                  {seqIndex + 1 < queue.length && (
                    <span className="text-accent-strong/70">
                      · {t("coach.seqUpNext", { name: getExercise(queue[seqIndex + 1].exerciseId).name[locale] })}
                    </span>
                  )}
                </div>
              )}
              <div className="mt-3">
                <CameraStage key={selectedId} exercise={exercise} beastMode={profile.beastMode} onEnd={onEnd} />
              </div>
            </div>
          </Reveal>
        </section>

        {/* Section 3 — report */}
        <section ref={reportRef} className="mt-8 scroll-mt-28">
          <SectionLabel icon={<BarChart3 className="h-4 w-4" />} step="3" text={t("coach.summaryTitle")} />
          <div className="mt-3">
            {report ? (
              <SessionReport report={report} exercise={exercise} onSave={save} onAgain={() => setReport(null)} saved={saved} />
            ) : (
              <div className="card grid place-items-center p-12 text-center">
                <BarChart3 className="h-10 w-10 text-ink-3" />
                <p className="mt-3 max-w-sm text-ink-2">{t("coach.summaryEmpty")}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function SectionLabel({ icon, step, text }) {
  return (
    <div className="flex items-center gap-2.5">
      {step ? (
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-strong text-[0.8rem] font-bold text-accent-contrast">{step}</span>
      ) : (
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-surface text-accent-strong">{icon}</span>
      )}
      <h2 className="text-[0.95rem] font-bold uppercase tracking-wide text-ink-2">{text}</h2>
    </div>
  );
}
