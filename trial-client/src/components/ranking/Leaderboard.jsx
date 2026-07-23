import { Flame, Crown } from "lucide-react";
import Avatar from "../ui/Avatar";
import { useI18n } from "../../i18n/LanguageContext";

const MEDAL = ["#f6b100", "#b8bcc4", "#cd7f4b"];

export default function Leaderboard({ rows }) {
  const { t } = useI18n();
  return (
    <ul className="divide-y divide-line">
      {rows.map((r, i) => (
        <li
          key={r.id}
          className={`flex items-center gap-3 py-3 ${r.isYou ? "rounded-2xl bg-accent-surface px-3" : "px-1"}`}
        >
          <span className="grid w-7 shrink-0 place-items-center font-display text-sm font-extrabold">
            {i < 3 ? <Crown className="h-5 w-5" style={{ color: MEDAL[i] }} /> : <span className="text-ink-3">{i + 1}</span>}
          </span>
          <Avatar name={r.name} hue={r.hue} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-ink">
              {r.name} {r.isYou && <span className="text-accent-strong">· {t("common.you")}</span>}
            </p>
            <p className="truncate text-[0.78rem] text-ink-3">
              @{r.handle} · {t(`ranking.level.${r.tier}`)}
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-1 text-[0.82rem] font-semibold text-ink-2 sm:flex">
            <Flame className="h-4 w-4 text-accent-strong" /> {r.streak}
          </div>
          <div className="w-12 shrink-0 text-right font-display text-lg font-extrabold text-ink">{r.score}</div>
        </li>
      ))}
    </ul>
  );
}
