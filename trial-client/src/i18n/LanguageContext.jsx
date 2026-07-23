import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { strings } from "./strings";

const LanguageContext = createContext(null);
const STORAGE_KEY = "fb-locale";
const isDev = import.meta.env.DEV;

function getInitialLocale() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "vi" || stored === "en") return stored;
  const nav = (navigator.language || "en").toLowerCase();
  return nav.startsWith("vi") ? "vi" : "en";
}

// dot-path lookup: t("home.title1")
function lookup(obj, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) =>
    vars[k] != null ? String(vars[k]) : m
  );
}

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState(getInitialLocale);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.setAttribute("lang", locale);
  }, [locale]);

  const t = useCallback(
    (key, vars) => {
      let val = lookup(strings[locale], key);
      if (val == null) val = lookup(strings.en, key); // fall back to en
      if (val == null) {
        if (isDev) return `⟪${key}⟫`; // visible in dev, never a raw key silently
        return "";
      }
      return typeof val === "string" ? interpolate(val, vars) : val;
    },
    [locale]
  );

  const toggle = useCallback(
    () => setLocale((l) => (l === "vi" ? "en" : "vi")),
    []
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}
