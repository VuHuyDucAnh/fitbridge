import { Navigate, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useApp } from "../../state/AppState";

/** Standard app chrome: fixed nav + main content + footer. */
export default function PageShell({ children, requireOnboarding = false, footer = true }) {
  const { profile, auth } = useApp();
  const location = useLocation();

  if (requireOnboarding && !(profile.onboarded || auth.signedIn)) {
    return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pt-24 sm:pt-28">{children}</main>
      {footer && <Footer />}
    </div>
  );
}
