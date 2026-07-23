import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { EXERCISES, getExercise } from "../data/exercises";
import { calories as calcCalories } from "../lib/fitness";

const AppContext = createContext(null);
const STORAGE_KEY = "fb-state-v1";

/* ---------- helpers ---------- */

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateKey(d) {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

/** Deterministic ~1 year of plausible history, personalized to the profile. */
function seedHistory(profile) {
  const rand = mulberry32(hashString(profile.name || "athlete") + 7);
  const workouts = [];
  const weightKg = profile.weight || 70;

  for (let i = 365; i >= 0; i--) {
    const day = daysAgo(i);
    const dow = day.getDay(); // 0 Sun .. 6 Sat
    // Higher chance on weekdays; recent weeks more consistent.
    let chance = dow === 0 || dow === 6 ? 0.32 : 0.55;
    if (i < 42) chance += 0.15;
    if (rand() > chance) continue;

    const sessions = rand() > 0.8 ? 2 : 1;
    for (let s = 0; s < sessions; s++) {
      const ex = EXERCISES[Math.floor(rand() * EXERCISES.length)];
      const sets = 3 + Math.floor(rand() * 3);
      const perSet = ex.detection.mode === "hold" ? 0 : 8 + Math.floor(rand() * 8);
      const reps = perSet * sets;
      const durationSec =
        ex.detection.mode === "hold"
          ? sets * (40 + Math.floor(rand() * 30))
          : Math.round(reps * 2.8 + sets * 45);
      const formScore = +(7 + rand() * 2.7).toFixed(1);
      workouts.push({
        id: `seed-${i}-${s}`,
        exerciseId: ex.id,
        date: day.toISOString(),
        dateKey: dateKey(day),
        reps,
        sets,
        durationSec,
        formScore,
        calories: calcCalories({
          exerciseId: ex.id,
          reps,
          seconds: ex.detection.mode === "hold" ? durationSec : 0,
          weightKg,
        }),
      });
    }
  }

  // Weekly weight log trending gently toward the goal.
  const weightLog = [];
  let w = weightKg + (profile.goal === "cutting" ? 4 : profile.goal === "bulking" ? -3 : 0);
  for (let i = 52; i >= 0; i--) {
    const day = daysAgo(i * 7);
    const drift =
      profile.goal === "cutting" ? -0.14 : profile.goal === "bulking" ? 0.12 : 0;
    w = +(w + drift + (rand() - 0.5) * 0.4).toFixed(1);
    weightLog.push({ date: day.toISOString(), dateKey: dateKey(day), weight: w });
  }
  // keep the latest weight consistent with the profile
  weightLog[weightLog.length - 1].weight = weightKg;

  return { workouts: workouts.sort((a, b) => (a.date < b.date ? 1 : -1)), weightLog };
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const DEFAULT_STATE = {
  auth: { signedIn: false, email: null },
  profile: {
    name: "",
    gender: "other",
    height: 175,
    weight: 70,
    age: 24,
    level: "beginner",
    goal: "maintaining",
    metricsPublic: false,
    shareMetrics: true,
    beastMode: true,
    bio: "",
    avatarHue: 22,
    joined: null,
    onboarded: false,
  },
  workouts: [],
  weightLog: [],
  lastCheckin: null,
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed, profile: { ...DEFAULT_STATE.profile, ...parsed.profile } };
  } catch {
    return DEFAULT_STATE;
  }
}

/* ---------- provider ---------- */

export function AppStateProvider({ children }) {
  const [state, setState] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full / unavailable — non-fatal */
    }
  }, [state]);

  const signIn = useCallback((email) => {
    setState((s) => ({ ...s, auth: { signedIn: true, email } }));
  }, []);

  const signOut = useCallback(() => {
    setState((s) => ({ ...s, auth: { signedIn: false, email: null } }));
  }, []);

  const completeOnboarding = useCallback((data) => {
    setState((s) => {
      const profile = {
        ...s.profile,
        ...data,
        joined: s.profile.joined || new Date().toISOString(),
        onboarded: true,
      };
      const seeded = seedHistory(profile);
      return {
        ...s,
        profile,
        auth: { signedIn: true, email: s.auth.email || `${(profile.name || "athlete").toLowerCase().replace(/\s+/g, "")}@fitbridge.app` },
        workouts: seeded.workouts,
        weightLog: seeded.weightLog,
        lastCheckin: new Date().toISOString(),
      };
    });
  }, []);

  const updateProfile = useCallback((patch) => {
    setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  }, []);

  const addWorkout = useCallback((session) => {
    setState((s) => {
      const now = new Date();
      const entry = {
        id: `w-${Date.now()}`,
        date: now.toISOString(),
        dateKey: dateKey(now),
        ...session,
      };
      return { ...s, workouts: [entry, ...s.workouts] };
    });
  }, []);

  const updateWeight = useCallback((weight) => {
    setState((s) => {
      const now = new Date();
      return {
        ...s,
        profile: { ...s.profile, weight },
        weightLog: [
          ...s.weightLog,
          { date: now.toISOString(), dateKey: dateKey(now), weight },
        ],
        lastCheckin: now.toISOString(),
      };
    });
  }, []);

  const dismissCheckin = useCallback(() => {
    setState((s) => ({ ...s, lastCheckin: new Date().toISOString() }));
  }, []);

  const resetAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(DEFAULT_STATE);
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      signIn,
      signOut,
      completeOnboarding,
      updateProfile,
      addWorkout,
      updateWeight,
      dismissCheckin,
      resetAll,
    }),
    [state, signIn, signOut, completeOnboarding, updateProfile, addWorkout, updateWeight, dismissCheckin, resetAll]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppStateProvider");
  return ctx;
}

/* ---------- derived selectors ---------- */

export function useStats() {
  const { workouts, weightLog } = useApp();

  return useMemo(() => {
    const now = new Date();
    const key = (d) => d.toISOString().slice(0, 10);

    // contribution map (date -> session count), last 371 days
    const contribution = {};
    for (const w of workouts) contribution[w.dateKey] = (contribution[w.dateKey] || 0) + 1;

    // streak (consecutive days up to today/yesterday)
    let streak = 0;
    for (let i = 0; i < 400; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      if (contribution[key(d)]) streak++;
      else if (i === 0) continue; // today not done yet is fine
      else break;
    }

    // last 7 days & 30 days
    const cutoff7 = new Date(now); cutoff7.setDate(now.getDate() - 7);
    const cutoff30 = new Date(now); cutoff30.setDate(now.getDate() - 30);
    const last7 = workouts.filter((w) => new Date(w.date) >= cutoff7);
    const last30 = workouts.filter((w) => new Date(w.date) >= cutoff30);

    const sum = (arr, f) => arr.reduce((a, w) => a + f(w), 0);
    const weekVolume = sum(last7, (w) => w.reps * (w.sets || 1) || w.durationSec / 6);
    const weekCalories = sum(last7, (w) => w.calories);
    const totalWorkouts = workouts.length;
    const avgForm = workouts.length
      ? +(sum(workouts.slice(0, 30), (w) => w.formScore) / Math.min(30, workouts.length)).toFixed(1)
      : 0;

    // muscle volume over 30 days (reps*sets per targeted muscle)
    const muscleVolume = {};
    for (const w of last30) {
      const ex = getExercise(w.exerciseId);
      const v = (w.reps || w.durationSec / 6) * 1;
      for (const m of ex.targets) muscleVolume[m] = (muscleVolume[m] || 0) + v;
    }
    const maxMuscle = Math.max(1, ...Object.values(muscleVolume));

    // weekly volume series (last 12 weeks) for charts
    const weeklySeries = [];
    for (let wk = 11; wk >= 0; wk--) {
      const start = new Date(now); start.setDate(now.getDate() - wk * 7 - 6);
      const end = new Date(now); end.setDate(now.getDate() - wk * 7);
      const inWeek = workouts.filter((w) => {
        const d = new Date(w.date);
        return d >= start && d <= end;
      });
      weeklySeries.push({
        label: `${end.getMonth() + 1}/${end.getDate()}`,
        volume: Math.round(sum(inWeek, (w) => w.reps * (w.sets || 1) || w.durationSec / 6)),
        calories: Math.round(sum(inWeek, (w) => w.calories)),
      });
    }

    // consistency: % of last 30 days with a session; intensity: normalized weekly volume
    const activeDays = new Set(last30.map((w) => w.dateKey)).size;
    const consistency = Math.min(100, Math.round((activeDays / 30) * 100));
    const intensity = Math.min(100, Math.round((weekVolume / 900) * 100));

    return {
      contribution,
      streak,
      weekVolume: Math.round(weekVolume),
      weekCalories: Math.round(weekCalories),
      totalWorkouts,
      avgForm,
      muscleVolume,
      maxMuscle,
      weeklySeries,
      weightSeries: weightLog,
      consistency,
      intensity,
      last7,
      recent: workouts.slice(0, 8),
    };
  }, [workouts, weightLog]);
}
