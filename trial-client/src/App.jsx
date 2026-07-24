import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import HomePage from "./pages/HomePage";
import OnboardingPage from "./pages/OnboardingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import AIAssistantPage from "./pages/AIAssistantPage";
import RunTrackerPage from "./pages/RunTrackerPage";
import FeedPage from "./pages/FeedPage";
import NutritionPage from "./pages/NutritionPage";
import RankingPage from "./pages/RankingPage";
import ProfilePage from "./pages/ProfilePage";
import NotFoundPage from "./pages/NotFoundPage";
import TermsPage from "./pages/TermsPage";
import AchievementToaster from "./components/ui/AchievementToaster";

function ScrollToTop() {
  const { pathname } = useLocation();
  // Braces matter: a concise arrow would return scrollTo's result to React as an
  // effect "cleanup", which crashes on browsers where scrollTo returns a value.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <AchievementToaster />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/coach" element={<AIAssistantPage />} />
        <Route path="/ai-assistant" element={<AIAssistantPage />} />
        <Route path="/run" element={<RunTrackerPage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/nutrition" element={<NutritionPage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
