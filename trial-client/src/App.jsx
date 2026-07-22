import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import AIAssistantPage from "./pages/AIAssistantPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/ai-assistant" element={<AIAssistantPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
    </Routes>
  );
}
