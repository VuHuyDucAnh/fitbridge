import { useState } from "react";
import { Plus, Trash2, Play, X, ListOrdered, CheckCircle2, GripVertical } from "lucide-react";
import Button from "../ui/Button";
import { EXERCISES, getExercise } from "../../data/exercises";
import { useI18n } from "../../i18n/LanguageContext";

/* Sequence builder — queue several exercises (push-up ×12 → squat ×15 → plank 40s)
   and the coach auto-advances through them. Pure UI + local queue state; the page
   owns running the queue through the camera stage. */
export default function SequenceBuilder({ queue, onQueueChange, onStart, running, activeIndex, doneCount }) {
  const { t, locale } = useI18n();
  const [pickId, setPickId] = useState(EXERCISES[0].id);

  const add = () => {
    const ex = getExercise(pickId);
    const isHold = ex.detection.mode === "hold";
    onQueueChange([
      ...queue,
      { key: `${pickId}-${Date.now()}`, exerciseId: pickId, target: isHold ? 40 : 12 },
    ]);
  };

  const remove = (key) => onQueueChange(queue.filter((q) => q.key !== key));
  const setTarget = (key, value) =>
    onQueueChange(queue.map((q) => (q.key === key ? { ...q, target: Math.max(1, value | 0) } : q)));

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-surface text-accent-strong">
          <ListOrdered className="h-4 w-4" />
        </span>
        <h3 className="font-display text-lg font-extrabold">{t("coach.seqTitle")}</h3>
        {running && (
          <span className="ml-auto rounded-full bg-accent-surface px-3 py-1 text-[0.78rem] font-bold text-accent-strong">
            {t("coach.seqProgress", { n: Math.min(activeIndex + 1, queue.length), total: queue.length })}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[0.88rem] text-ink-2">{t("coach.seqSubtitle")}</p>

      {/* Queue */}
      {queue.length > 0 && (
        <ul className="mt-4 space-y-2">
          {queue.map((q, i) => {
            const ex = getExercise(q.exerciseId);
            const isHold = ex.detection.mode === "hold";
            const done = running && i < activeIndex;
            const active = running && i === activeIndex;
            return (
              <li
                key={q.key}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                  active ? "border-accent bg-accent-surface" : "border-line bg-sunken"
                }`}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface text-[0.8rem] font-bold text-ink-2">
                  {done ? <CheckCircle2 className="h-4 w-4 text-success" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink">{ex.name[locale]}</div>
                  <div className="text-[0.78rem] text-ink-3">
                    {isHold ? `${q.target}s ${t("coach.seqHold")}` : `${q.target} ${t("coach.reps").toLowerCase()}`}
                  </div>
                </div>
                {!running && (
                  <>
                    <input
                      type="number"
                      min={1}
                      value={q.target}
                      onChange={(e) => setTarget(q.key, Number(e.target.value))}
                      aria-label={t("coach.seqTarget")}
                      className="w-16 rounded-lg border border-line bg-surface px-2 py-1.5 text-center text-[0.85rem] font-semibold text-ink outline-none focus:border-accent"
                    />
                    <button
                      onClick={() => remove(q.key)}
                      aria-label={t("common.remove")}
                      className="glow grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
                {active && <GripVertical className="h-4 w-4 shrink-0 animate-pulse text-accent" />}
              </li>
            );
          })}
        </ul>
      )}

      {/* Add + start controls */}
      {!running && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select
            value={pickId}
            onChange={(e) => setPickId(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2.5 text-[0.9rem] font-semibold text-ink outline-none focus:border-accent"
          >
            {EXERCISES.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name[locale]}
              </option>
            ))}
          </select>
          <Button variant="secondary" size="sm" onClick={add} leftIcon={<Plus className="h-4 w-4" />}>
            {t("coach.seqAdd")}
          </Button>
          {queue.length >= 2 && (
            <Button size="sm" onClick={onStart} leftIcon={<Play className="h-4 w-4" />}>
              {t("coach.seqStart")}
            </Button>
          )}
        </div>
      )}

      {running && (
        <div className="mt-4">
          <Button variant="ghost" size="sm" onClick={onStart} leftIcon={<X className="h-4 w-4" />}>
            {t("coach.seqStop")}
          </Button>
        </div>
      )}

      {doneCount > 0 && !running && (
        <p className="mt-3 flex items-center gap-1.5 text-[0.85rem] font-semibold text-success">
          <CheckCircle2 className="h-4 w-4" /> {t("coach.seqDone", { n: doneCount })}
        </p>
      )}
    </div>
  );
}
