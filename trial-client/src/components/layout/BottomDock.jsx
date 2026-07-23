import { NavLink } from "react-router-dom";
import { LayoutDashboard, Dumbbell, Route as RouteIcon, Users, User } from "lucide-react";
import { useI18n } from "../../i18n/LanguageContext";

/* iOS-style magnified liquid-glass dock for mobile. The active tab lifts and
   scales up (the "magnified" dock feel); tabs glow on tap via the shared ring.
   Shown only on small screens for signed-in users; the top navbar covers wide
   layouts. Dependency-free so it behaves identically on every device. */
const TABS = [
  { to: "/dashboard", Icon: LayoutDashboard, key: "dashboard" },
  { to: "/feed", Icon: Users, key: "feed" },
  { to: "/coach", Icon: Dumbbell, key: "coach" },
  { to: "/run", Icon: RouteIcon, key: "run" },
  { to: "/profile", Icon: User, key: "profile" },
];

export default function BottomDock() {
  const { t } = useI18n();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
      aria-label={t("nav.account")}
    >
      <div className="glass flex items-end gap-1 rounded-[1.75rem] px-2.5 py-2 shadow-float">
        {TABS.map(({ to, Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            aria-label={t(`nav.${key}`)}
            className="group glow relative grid place-items-center rounded-2xl"
          >
            {({ isActive }) => (
              <span
                className={`grid place-items-center transition-all duration-300 ease-out ${
                  isActive
                    ? "-translate-y-2 h-12 w-12 rounded-2xl bg-accent-strong text-accent-contrast shadow-float"
                    : "h-11 w-11 text-ink-2 group-hover:text-ink group-active:scale-90"
                }`}
              >
                <Icon className={isActive ? "h-6 w-6" : "h-5 w-5"} />
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
