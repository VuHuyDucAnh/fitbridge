import { supabase } from "./supabase";

export const SLOTS = ["breakfast", "lunch", "dinner", "snack"];

// Mifflin-St Jeor BMR → daily calorie target from the user's real profile.
export function dailyKcalTarget(profile) {
  if (profile.kcalTarget && profile.kcalTarget > 0) return Math.round(profile.kcalTarget);
  const w = profile.weight || 70;
  const h = profile.height || 175;
  const age = profile.age || 25;
  const s = profile.gender === "female" ? -161 : 5;
  const bmr = 10 * w + 6.25 * h - 5 * age + s;
  const activity = { beginner: 1.35, intermediate: 1.5, advanced: 1.7 }[profile.level] || 1.4;
  let tdee = bmr * activity;
  if (profile.goal === "losing") tdee -= 400;
  else if (profile.goal === "gaining") tdee += 350;
  return Math.round(tdee / 10) * 10;
}

// Macro split targets (grams) from a calorie target. Balanced default.
export function macroTargets(kcal, goal) {
  const p = goal === "gaining" ? 0.3 : goal === "losing" ? 0.35 : 0.3;
  const f = 0.28;
  const c = 1 - p - f;
  return {
    protein: Math.round((kcal * p) / 4),
    carbs: Math.round((kcal * c) / 4),
    fat: Math.round((kcal * f) / 9),
  };
}

// Ask the edge function to estimate a meal from a photo. Returns
// { configured, items, kcal, protein, carbs, fat }. On any failure returns
// { configured: false } so the UI falls back to manual entry.
export async function analyzeMealPhoto(dataUrl) {
  try {
    const { data, error } = await supabase.functions.invoke("analyze-meal", {
      body: { image: dataUrl },
    });
    if (error || !data) return { configured: false };
    return data;
  } catch {
    return { configured: false };
  }
}

// Read a File as a compressed JPEG data URL (keeps the payload small for the
// vision call and the storage upload).
export function fileToDataUrl(file, maxSize = 900) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function todayKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function shiftDay(key, delta) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d + delta);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}
