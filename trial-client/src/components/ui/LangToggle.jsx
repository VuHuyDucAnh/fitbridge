import { useI18n } from "../../i18n/LanguageContext";

export default function LangToggle({ className = "" }) {
  const { locale, toggle, t } = useI18n();
  const next = locale === "vi" ? "English" : "Tiếng Việt";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`${t("nav.language")}: ${locale === "vi" ? "Tiếng Việt" : "English"}. → ${next}`}
      title={`${t("nav.language")} → ${next}`}
      className={`glow inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-[0.82rem] font-semibold text-ink transition-colors hover:bg-sunken ${className}`}
    >
      <span className={locale === "vi" ? "text-accent-strong" : "text-ink-3"}>VI</span>
      <span className="text-ink-3/50">/</span>
      <span className={locale === "en" ? "text-accent-strong" : "text-ink-3"}>EN</span>
    </button>
  );
}
