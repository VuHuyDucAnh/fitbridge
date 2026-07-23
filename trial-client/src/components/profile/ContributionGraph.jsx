import { useMemo } from "react";
import { useI18n } from "../../i18n/LanguageContext";

// Local calendar day (YYYY-MM-DD) — must match AppState.dateKey so the cells
// line up with how each workout was bucketed.
function localKey(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function colorFor(count) {
  if (!count) return "var(--ramp-0)";
  if (count === 1) return "var(--ramp-2)";
  if (count === 2) return "var(--ramp-3)";
  if (count === 3) return "var(--ramp-4)";
  return "var(--ramp-5)";
}

export default function ContributionGraph({ contribution }) {
  const { t, locale } = useI18n();

  const { columns, total, monthLabels } = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const days = [];
    const start = new Date(today);
    start.setDate(today.getDate() - 370);
    start.setDate(start.getDate() - start.getDay()); // back to Sunday

    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      const key = localKey(d);
      days.push({ key, date: new Date(d), count: contribution[key] || 0 });
    }
    // chunk into weeks (columns of 7)
    const cols = [];
    for (let i = 0; i < days.length; i += 7) cols.push(days.slice(i, i + 7));

    const total = days.reduce((s, d) => s + d.count, 0);

    // month labels at the top of each column when the month changes
    const fmt = new Intl.DateTimeFormat(locale, { month: "short" });
    const monthLabels = cols.map((col, i) => {
      const first = col[0];
      if (!first) return null;
      const prev = cols[i - 1]?.[0];
      if (i === 0 || (prev && prev.date.getMonth() !== first.date.getMonth())) {
        return { i, label: fmt.format(first.date) };
      }
      return null;
    });

    return { columns: cols, total, monthLabels };
  }, [contribution, locale]);

  return (
    <div>
      <p className="mb-3 text-[0.85rem] text-ink-3">{t("profile.contributionSubtitle", { n: total })}</p>
      <div className="overflow-x-auto pb-2 hide-scrollbar">
        <div className="inline-block">
          {/* month row */}
          <div className="mb-1 flex gap-[3px] pl-[2px]">
            {monthLabels.map((m, i) => (
              <div key={i} className="w-[13px] text-[0.6rem] text-ink-3">
                {m ? <span className="relative -left-px whitespace-nowrap">{m.label}</span> : ""}
              </div>
            ))}
          </div>
          {/* grid */}
          <div className="flex gap-[3px]">
            {columns.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-[3px]">
                {col.map((day) => (
                  <span
                    key={day.key}
                    title={`${day.date.toLocaleDateString(locale)} · ${day.count} ${t("profile.workouts").toLowerCase()}`}
                    className="h-[13px] w-[13px] rounded-[3px]"
                    style={{ background: colorFor(day.count) }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[0.72rem] text-ink-3">
        <span>{t("profile.less")}</span>
        {[0, 1, 2, 3, 4].map((c) => (
          <span key={c} className="h-3 w-3 rounded-[3px]" style={{ background: colorFor(c) }} />
        ))}
        <span>{t("profile.more")}</span>
      </div>
    </div>
  );
}
