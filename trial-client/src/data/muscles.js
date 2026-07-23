import { EXERCISES } from "./exercises";

// Muscle groups used by the heat map + suggestion engine.
export const MUSCLES = [
  { key: "chest", name: { en: "Chest", vi: "Ngực" } },
  { key: "shoulders", name: { en: "Shoulders", vi: "Vai" } },
  { key: "biceps", name: { en: "Biceps", vi: "Tay trước" } },
  { key: "triceps", name: { en: "Triceps", vi: "Tay sau" } },
  { key: "forearms", name: { en: "Forearms", vi: "Cẳng tay" } },
  { key: "abs", name: { en: "Abs", vi: "Bụng" } },
  { key: "obliques", name: { en: "Obliques", vi: "Cơ liên sườn" } },
  { key: "quads", name: { en: "Quads", vi: "Đùi trước" } },
  { key: "hamstrings", name: { en: "Hamstrings", vi: "Gân kheo" } },
  { key: "glutes", name: { en: "Glutes", vi: "Mông" } },
  { key: "calves", name: { en: "Calves", vi: "Bắp chân" } },
  { key: "back", name: { en: "Back", vi: "Lưng" } },
];

export function muscleName(key, locale) {
  const m = MUSCLES.find((x) => x.key === key);
  return m ? m.name[locale] || m.name.en : key;
}

// Exercises that train a given muscle (for the "tap a muscle" suggestions).
export function exercisesForMuscle(key) {
  return EXERCISES.filter((e) => e.targets.includes(key));
}
