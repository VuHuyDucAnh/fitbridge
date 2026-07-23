import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, Dumbbell, User } from "lucide-react";
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
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);
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
    setAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!accountOpen) return;
    const onDown = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setAccountOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountOpen]);

  const logout = () => {
    setAccountOpen(false);
    signOut();
    navigate("/");
  };

  const links = authed
    ? [
        { to: "/dashboard", label: t("nav.dashboard") },
        { to: "/coach", label: t("nav.coach") },
        { to: "/run", label: t("nav.run") },
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
              <div ref={accountRef} className="relative hidden sm:block">
                <button
                  onClick={() => setAccountOpen((o) => !o)}
                  className="glow rounded-full"
                  aria-label={t("nav.account")}
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                >
                  <Avatar name={profile.name} hue={profile.avatarHue} src={profile.avatarUrl} size={38} />
                </button>
                {accountOpen && (
                  <div
                    role="menu"
                    className="glass animate-pop absolute right-0 top-[calc(100%+0.6rem)] w-56 rounded-2xl p-2 shadow-float"
                  >
                    <div className="px-3 py-2">
                      <p className="truncate font-display text-[0.95rem] font-extrabold text-ink">{profile.name || t("nav.account")}</p>
                      {profile.name && (
                        <p className="truncate text-[0.78rem] text-ink-3">@{profile.name}</p>
                      )}
                    </div>
                    <div className="my-1 h-px bg-line" />
                    <button
                      onClick={() => {
                        setAccountOpen(false);
                        navigate("/profile");
                      }}
                      role="menuitem"
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[0.9rem] font-semibold text-ink hover:bg-sunken"
                    >
                      <User className="h-4 w-4 text-ink-2" /> {t("nav.profile")}
                    </button>
                    <button
                      onClick={logout}
                      role="menuitem"
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[0.9rem] font-semibold text-danger hover:bg-danger/10"
                    >
                      <LogOut className="h-4 w-4" /> {t("nav.signOut")}
                    </button>
                  </div>
                )}
              </div>
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
                  onClick={logout}
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
