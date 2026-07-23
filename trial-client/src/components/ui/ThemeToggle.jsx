import { Sun, Moon, MonitorSmartphone } from "lucide-react";
import { useTheme } from "../../theme/ThemeContext";
import { useI18n } from "../../i18n/LanguageContext";

const icons = { light: Sun, dark: Moon, system: MonitorSmartphone };

export default function ThemeToggle({ className = "" }) {
  const { mode, cycle } = useTheme();
  const { t } = useI18n();
  const Icon = icons[mode];
  const label = t(
    mode === "light" ? "nav.themeLight" : mode === "dark" ? "nav.themeDark" : "nav.themeSystem"
  );

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`${t("nav.theme")}: ${label}`}
      title={`${t("nav.theme")}: ${label}`}
      className={`glow grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-ink transition-colors hover:bg-sunken ${className}`}
    >
      <Icon className="h-[1.05rem] w-[1.05rem] transition-transform duration-200" aria-hidden="true" />
    </button>
  );
}
