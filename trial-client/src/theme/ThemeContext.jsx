import { createContext, useContext, useEffect, useState, useCallback } from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "fb-theme";

function resolve(mode) {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode;
}

function apply(resolved) {
  document.documentElement.setAttribute("data-theme", resolved);
  const meta = document.getElementById("meta-theme-color");
  if (meta) meta.setAttribute("content", resolved === "dark" ? "#0c0c0b" : "#f7f7f5");
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(
    () => localStorage.getItem(STORAGE_KEY) || "system"
  );
  const [resolved, setResolved] = useState(() => resolve(mode));

  useEffect(() => {
    const r = resolve(mode);
    setResolved(r);
    apply(r);
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  // React live to OS changes while in system mode
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (mode === "system") {
        const r = resolve("system");
        setResolved(r);
        apply(r);
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  // Cycle light -> dark -> system
  const cycle = useCallback(() => {
    setMode((m) => (m === "light" ? "dark" : m === "dark" ? "system" : "light"));
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode, cycle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
