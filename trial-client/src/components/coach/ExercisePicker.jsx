import { Dumbbell } from "lucide-react";
import { EXERCISES, DIFFICULTY_LABEL } from "../../data/exercises";
import { useI18n } from "../../i18n/LanguageContext";

export default function ExercisePicker({ value, onChange }) {
  const { locale } = useI18n();
  return (
    <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-2 hide-scrollbar">
      {EXERCISES.map((ex) => {
        const active = ex.id === value;
        return (
          <button
            key={ex.id}
            onClick={() => onChange(ex.id)}
            aria-pressed={active}
            className={`glow flex shrink-0 items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-left transition-all ${
              active ? "border-accent bg-accent-surface" : "border-line-strong bg-surface hover:bg-sunken"
            }`}
          >
            <span className={`grid h-9 w-9 place-items-center rounded-xl ${active ? "bg-accent-strong text-accent-contrast" : "bg-sunken text-ink-2"}`}>
              <Dumbbell className="h-4.5 w-4.5" />
            </span>
            <span>
              <span className="block whitespace-nowrap font-semibold text-ink">{ex.name[locale]}</span>
              <span className="block text-[0.72rem] text-ink-3">{DIFFICULTY_LABEL[ex.difficulty][locale]}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
