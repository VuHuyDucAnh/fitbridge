import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import BottomDock from "./BottomDock";
import { useApp } from "../../state/AppState";

/** Standard app chrome: fixed nav + main content + footer. */
export default function PageShell({ children, requireOnboarding = false, footer = true }) {
  const { profile, auth, authReady } = useApp();
  const location = useLocation();

  // Wait for the session to resolve before making any redirect decision,
  // otherwise a hard refresh flashes/redirects before auth is known.
  if (requireOnboarding && !authReady) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent-strong" aria-label="Loading" />
      </div>
    );
  }

  if (requireOnboarding && !(profile.onboarded || auth.signedIn)) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const authed = auth.signedIn || profile.onboarded;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className={`flex-1 pt-24 sm:pt-28 ${authed ? "pb-28 lg:pb-0" : ""}`}>{children}</main>
      {footer && <Footer />}
      {authed && <BottomDock />}
    </div>
  );
}
