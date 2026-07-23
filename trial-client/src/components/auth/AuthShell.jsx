import { Link } from "react-router-dom";
import { ScanLine, Gauge, Flame, Lock } from "lucide-react";
import Logo from "../ui/Logo";
import ThemeToggle from "../ui/ThemeToggle";
import LangToggle from "../ui/LangToggle";
import { useI18n } from "../../i18n/LanguageContext";

export default function AuthShell({ children }) {
  const { t } = useI18n();
  const feats = [
    { Icon: ScanLine, label: t("auth.leftF1") },
    { Icon: Gauge, label: t("auth.leftF2") },
    { Icon: Flame, label: t("auth.leftF3") },
    { Icon: Lock, label: t("auth.leftF4") },
  ];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <div className="pointer-events-none absolute -left-24 top-0 h-96 w-96 rounded-full bg-accent/12 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-24 -right-10 h-96 w-96 rounded-full bg-accent/10 blur-[120px]" />

      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <LangToggle />
        <ThemeToggle />
      </div>

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-4xl border border-line bg-surface shadow-float lg:grid-cols-2">
        {/* Brand side */}
        <div className="relative hidden flex-col justify-between bg-ink p-10 text-bg lg:flex">
          <div className="pointer-events-none absolute -right-16 top-10 h-56 w-56 rounded-full bg-accent/30 blur-3xl animate-drift" />
          <Logo />
          <div className="relative">
            <h2 className="font-display text-4xl font-extrabold leading-tight text-bg">
              {t("auth.leftTitle")}
            </h2>
            <p className="mt-4 max-w-sm leading-relaxed text-ink-3">{t("auth.leftBody")}</p>
            <ul className="mt-8 space-y-3">
              {feats.map((f) => (
                <li key={f.label} className="flex items-center gap-3 text-[0.95rem] text-bg/90">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-accent">
                    <f.Icon className="h-4.5 w-4.5" />
                  </span>
                  {f.label}
                </li>
              ))}
            </ul>
          </div>
          <p className="relative text-[0.78rem] text-ink-3">© {new Date().getFullYear()} FitBridge</p>
        </div>

        {/* Form side */}
        <div className="p-7 sm:p-10">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function TermsLinks() {
  const { t } = useI18n();
  return (
    <>
      {t("auth.agree")}{" "}
      <Link to="/terms" className="font-semibold text-accent-strong hover:underline">
        {t("legal.title")}
      </Link>
    </>
  );
}
