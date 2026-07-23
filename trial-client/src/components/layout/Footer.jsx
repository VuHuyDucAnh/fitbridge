import { Link } from "react-router-dom";
import Logo from "../ui/Logo";
import { useI18n } from "../../i18n/LanguageContext";
import { useApp } from "../../state/AppState";

export default function Footer() {
  const { t } = useI18n();
  const { profile, auth } = useApp();
  const authed = auth.signedIn || profile.onboarded;

  const cols = authed
    ? [
        { to: "/dashboard", label: t("nav.dashboard") },
        { to: "/coach", label: t("nav.coach") },
        { to: "/ranking", label: t("nav.ranking") },
        { to: "/profile", label: t("nav.profile") },
      ]
    : [
        { to: "/", label: t("nav.home") },
        { to: "/login", label: t("nav.signIn") },
        { to: "/onboarding", label: t("common.getStarted") },
      ];

  return (
    <footer className="mt-24 border-t border-line px-5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-[0.85rem] text-ink-3">{t("common.tagline")}</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
          {cols.map((c) => (
            <Link key={c.to} to={c.to} className="text-[0.85rem] font-medium text-ink-2 hover:text-accent-strong">
              {c.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-6xl text-[0.75rem] text-ink-3">
        © {new Date().getFullYear()} FitBridge · {t("home.trustLine")}
      </p>
    </footer>
  );
}
