import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, Dumbbell } from "lucide-react";
import Logo from "../ui/Logo";
import Button from "../ui/Button";
import ThemeToggle from "../ui/ThemeToggle";
import LangToggle from "../ui/LangToggle";
import Avatar from "../ui/Avatar";
import { useI18n } from "../../i18n/LanguageContext";
import { useApp } from "../../state/AppState";

export default function Navbar() {
  const { t } = useI18n();
  const { profile, auth, signOut } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const authed = auth.signedIn || profile.onboarded;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const links = authed
    ? [
        { to: "/dashboard", label: t("nav.dashboard") },
        { to: "/coach", label: t("nav.coach") },
        { to: "/ranking", label: t("nav.ranking") },
        { to: "/profile", label: t("nav.profile") },
      ]
    : [
        { to: "/", label: t("nav.home") },
        { hash: "/#features", label: t("nav.features") },
        { hash: "/#how", label: t("nav.how") },
      ];

  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-[0.9rem] font-semibold transition-colors ${
      isActive ? "text-accent-strong" : "text-ink-2 hover:text-ink"
    }`;

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <nav
        className={`glass mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl px-3 transition-all duration-300 sm:px-4 ${
          scrolled ? "py-1.5 shadow-float" : "py-2.5"
        }`}
      >
        <Logo size={scrolled ? 34 : 40} />

        {/* Desktop links */}
        <div className="hidden items-center gap-0.5 lg:flex">
          {links.map((l) =>
            l.hash ? (
              <a
                key={l.hash}
                href={l.hash}
                className="rounded-lg px-3 py-2 text-[0.9rem] font-semibold text-ink-2 transition-colors hover:text-ink"
              >
                {l.label}
              </a>
            ) : (
              <NavLink key={l.to} to={l.to} className={linkClass} end={l.to === "/"}>
                {l.label}
              </NavLink>
            )
          )}
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <LangToggle />
            <ThemeToggle />
          </div>

          {authed ? (
            <>
              <Button to="/coach" size="sm" className="hidden md:inline-flex" leftIcon={<Dumbbell className="h-4 w-4" />}>
                {t("dashboard.startWorkout")}
              </Button>
              <NavLink to="/profile" className="glow hidden rounded-full sm:inline-flex" aria-label={t("nav.profile")}>
                <Avatar name={profile.name} hue={profile.avatarHue} size={38} />
              </NavLink>
            </>
          ) : (
            <>
              <Button to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                {t("nav.signIn")}
              </Button>
              <Button to="/register" size="sm">
                {t("common.getStarted")}
              </Button>
            </>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label={t("nav.openMenu")}
            className="glow grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-ink lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-pop" onClick={() => setMenuOpen(false)} />
          <div className="glass animate-pop absolute right-3 top-3 w-[min(88vw,20rem)] rounded-3xl p-5">
            <div className="mb-5 flex items-center justify-between">
              <Logo />
              <button
                onClick={() => setMenuOpen(false)}
                aria-label={t("nav.closeMenu")}
                className="glow grid h-10 w-10 place-items-center rounded-xl text-ink-2 hover:bg-sunken"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {(authed
                ? [{ to: "/", label: t("nav.home") }, ...links]
                : [...links, { to: "/login", label: t("nav.signIn") }]
              ).map((l) =>
                l.hash ? (
                  <a
                    key={l.hash}
                    href={l.hash}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-4 py-3 text-[1rem] font-semibold text-ink hover:bg-sunken"
                  >
                    {l.label}
                  </a>
                ) : (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end={l.to === "/"}
                    className={({ isActive }) =>
                      `rounded-xl px-4 py-3 text-[1rem] font-semibold ${
                        isActive ? "bg-accent-surface text-accent-strong" : "text-ink hover:bg-sunken"
                      }`
                    }
                  >
                    {l.label}
                  </NavLink>
                )
              )}
            </div>
            <div className="mt-5 flex items-center gap-2">
              <LangToggle />
              <ThemeToggle />
              {authed && (
                <button
                  onClick={() => {
                    signOut();
                    navigate("/");
                  }}
                  className="glow ml-auto inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-[0.85rem] font-semibold text-ink-2 hover:bg-sunken"
                >
                  <LogOut className="h-4 w-4" /> {t("nav.signOut")}
                </button>
              )}
            </div>
            {!authed && (
              <Button to="/register" className="mt-4 w-full">
                {t("common.getStarted")}
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
