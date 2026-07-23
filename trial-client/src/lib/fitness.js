// Pure fitness math — no UI, fully testable.

// MET (metabolic equivalent) estimates for calorie burn.
export const EXERCISE_MET = {
  pushup: 4.0,
  squat: 5.0,
  "bicep-curl": 3.5,
  plank: 3.0,
  "pull-up": 6.0,
  lunge: 4.5,
};

// Approx work done per rep (seconds), used to estimate active time.
export const SECONDS_PER_REP = {
  pushup: 2.4,
  squat: 3.0,
  "bicep-curl": 2.6,
  "pull-up": 3.2,
  lunge: 3.4,
};

/** Calories burned. Rep-based: derive active minutes from reps; time-based: use seconds. */
export function calories({ exerciseId, reps = 0, seconds = 0, weightKg = 70 }) {
  const met = EXERCISE_MET[exerciseId] ?? 4;
  let activeSeconds = seconds;
  if (!activeSeconds && reps) {
    activeSeconds = reps * (SECONDS_PER_REP[exerciseId] ?? 2.8);
  }
  const hours = activeSeconds / 3600;
  return Math.round(met * (weightKg || 70) * hours * 1.05);
}

export function bmi(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return +(weightKg / (m * m)).toFixed(1);
}

export function bmiBand(value) {
  if (value == null) return null;
  if (value < 18.5) return "under";
  if (value < 25) return "normal";
  if (value < 30) return "over";
  return "obese";
}

export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// Consistency + intensity -> tiered athlete level.
export const LEVEL_TIERS = [
  { key: "beginner", min: 0, color: "#8a8f98" },
  { key: "novice", min: 20, color: "#3b82f6" },
  { key: "intermediate", min: 40, color: "#1f9d55" },
  { key: "advanced", min: 60, color: "#8b5cf6" },
  { key: "elite", min: 80, color: "#ff8a00" },
  { key: "world", min: 95, color: "#e11d48" },
];

export function tierForScore(score) {
  let tier = LEVEL_TIERS[0];
  for (const t of LEVEL_TIERS) if (score >= t.min) tier = t;
  return tier;
}

/** Composite ranking score from consistency (0-100) and avg intensity (0-100). */
export function rankScore({ consistency = 0, intensity = 0 }) {
  return Math.round(consistency * 0.6 + intensity * 0.4);
}

// Pace: average seconds between reps within a session (tempo quality).
export function tempoLabel(secondsPerRep) {
  if (secondsPerRep == null) return null;
  if (secondsPerRep < 1.4) return "fast";
  if (secondsPerRep <= 3.2) return "controlled";
  return "slow";
}
