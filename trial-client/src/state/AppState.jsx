import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { getExercise } from "../data/exercises";
import { supabase } from "../lib/supabase";

const AppContext = createContext(null);

/* ---------- helpers ---------- */

function dateKey(d) {
  return d.toISOString().slice(0, 10);
}

/* ---------- defaults ---------- */

const DEFAULT_PROFILE = {
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
};

/* ---------- row <-> app mappers ---------- */

function rowToProfile(row) {
  if (!row) return { ...DEFAULT_PROFILE };
  return {
    name: row.name ?? "",
    gender: row.gender ?? "other",
    height: Number(row.height ?? 175),
    weight: Number(row.weight ?? 70),
    age: Number(row.age ?? 24),
    level: row.level ?? "beginner",
    goal: row.goal ?? "maintaining",
    metricsPublic: !!row.metrics_public,
    shareMetrics: !!row.share_metrics,
    beastMode: !!row.beast_mode,
    bio: row.bio ?? "",
    avatarHue: Number(row.avatar_hue ?? 22),
    joined: row.joined ?? null,
    onboarded: !!row.onboarded,
  };
}

/** Convert a (partial) app-shape profile patch into DB column names. */
function profileToRow(patch) {
  const map = {
    name: "name",
    gender: "gender",
    height: "height",
    weight: "weight",
    age: "age",
    level: "level",
    goal: "goal",
    metricsPublic: "metrics_public",
    shareMetrics: "share_metrics",
    beastMode: "beast_mode",
    bio: "bio",
    avatarHue: "avatar_hue",
    joined: "joined",
    onboarded: "onboarded",
  };
  const row = {};
  for (const [k, v] of Object.entries(patch)) {
    if (k in map) row[map[k]] = v;
  }
  return row;
}

function rowToWorkout(row) {
  const d = new Date(row.performed_at);
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    date: d.toISOString(),
    dateKey: dateKey(d),
    reps: Number(row.reps ?? 0),
    sets: Number(row.sets ?? 1),
    durationSec: Number(row.duration_sec ?? 0),
    formScore: Number(row.form_score ?? 0),
    calories: Number(row.calories ?? 0),
  };
}

function workoutToRow(w, userId) {
  return {
    user_id: userId,
    exercise_id: w.exerciseId,
    performed_at: w.date || new Date().toISOString(),
    reps: Math.round(w.reps ?? 0),
    sets: Math.round(w.sets ?? 1),
    duration_sec: Math.round(w.durationSec ?? 0),
    form_score: w.formScore ?? 0,
    calories: w.calories ?? 0,
  };
}

function rowToWeight(row) {
  const d = new Date(row.logged_at);
  return { date: d.toISOString(), dateKey: dateKey(d), weight: Number(row.weight) };
}

/* ---------- provider ---------- */

export function AppStateProvider({ children }) {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [profile, setProfile] = useState({ ...DEFAULT_PROFILE });
  const [workouts, setWorkouts] = useState([]);
  const [weightLog, setWeightLog] = useState([]);
  const [lastCheckin, setLastCheckin] = useState(null);

  const loadedUserId = useRef(null);

  const userId = session?.user?.id ?? null;

  const clearUserData = useCallback(() => {
    loadedUserId.current = null;
    setProfile({ ...DEFAULT_PROFILE });
    setWorkouts([]);
    setWeightLog([]);
    setLastCheckin(null);
  }, []);

  const loadUserData = useCallback(async (uid) => {
    setDataLoading(true);
    try {
      const [profRes, workRes, weightRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase
          .from("workouts")
          .select("*")
          .eq("user_id", uid)
          .order("performed_at", { ascending: false }),
        supabase
          .from("weight_logs")
          .select("*")
          .eq("user_id", uid)
          .order("logged_at", { ascending: true }),
      ]);

      if (profRes.data) {
        setProfile(rowToProfile(profRes.data));
        setLastCheckin(profRes.data.last_checkin ?? null);
      }
      setWorkouts((workRes.data || []).map(rowToWorkout));
      setWeightLog((weightRes.data || []).map(rowToWeight));
      loadedUserId.current = uid;
    } catch {
      /* network / RLS error — leave defaults; UI shows empty state */
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Resolve the session once, then react to auth changes.
  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const sess = data.session ?? null;
      setSession(sess);
      if (sess?.user) loadUserData(sess.user.id);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!active) return;
      setSession(sess ?? null);
      const uid = sess?.user?.id ?? null;
      if (!uid) {
        clearUserData();
      } else if (uid !== loadedUserId.current) {
        loadUserData(uid);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadUserData, clearUserData]);

  /* ---------- auth actions ---------- */

  const signUp = useCallback(async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name || "" } },
    });
    if (error) return { error: error.message };
    return { error: null, needsConfirmation: !data.session };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    const { data: prof } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", data.user.id)
      .maybeSingle();
    return { error: null, onboarded: !!prof?.onboarded };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    clearUserData();
  }, [clearUserData]);

  /* ---------- profile / data actions ---------- */

  const completeOnboarding = useCallback(
    async (data) => {
      const uid = session?.user?.id;
      const joined = profile.joined || new Date().toISOString();
      const nextProfile = { ...profile, ...data, joined, onboarded: true };

      // Optimistic local update so the UI advances immediately.
      setProfile(nextProfile);
      setLastCheckin(new Date().toISOString());

      if (!uid) return;

      // Record the starting weight as the first real data point, nothing fake.
      await supabase
        .from("profiles")
        .update({ ...profileToRow({ ...data, joined, onboarded: true }), last_checkin: new Date().toISOString() })
        .eq("id", uid);

      if (nextProfile.weight) {
        const { count } = await supabase
          .from("weight_logs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid);
        if (!count) {
          await supabase
            .from("weight_logs")
            .insert({ user_id: uid, logged_at: joined, weight: nextProfile.weight });
        }
      }

      await loadUserData(uid);
    },
    [session, profile, loadUserData]
  );

  const updateProfile = useCallback(
    async (patch) => {
      setProfile((p) => ({ ...p, ...patch }));
      const uid = session?.user?.id;
      if (!uid) return;
      await supabase.from("profiles").update(profileToRow(patch)).eq("id", uid);
    },
    [session]
  );

  const addWorkout = useCallback(
    async (entry) => {
      const uid = session?.user?.id;
      const now = new Date();
      const optimistic = {
        id: `w-${Date.now()}`,
        date: now.toISOString(),
        dateKey: dateKey(now),
        ...entry,
      };
      setWorkouts((prev) => [optimistic, ...prev]);
      if (!uid) return;
      const { data } = await supabase
        .from("workouts")
        .insert(workoutToRow({ ...entry, date: optimistic.date }, uid))
        .select()
        .maybeSingle();
      if (data) {
        // Replace the optimistic row with the persisted one (real id).
        setWorkouts((prev) => [rowToWorkout(data), ...prev.filter((w) => w.id !== optimistic.id)]);
      }
    },
    [session]
  );

  const updateWeight = useCallback(
    async (weight) => {
      const uid = session?.user?.id;
      const now = new Date();
      setProfile((p) => ({ ...p, weight }));
      setWeightLog((prev) => [
        ...prev,
        { date: now.toISOString(), dateKey: dateKey(now), weight },
      ]);
      setLastCheckin(now.toISOString());
      if (!uid) return;
      await Promise.all([
        supabase.from("profiles").update({ weight, last_checkin: now.toISOString() }).eq("id", uid),
        supabase.from("weight_logs").insert({ user_id: uid, logged_at: now.toISOString(), weight }),
      ]);
    },
    [session]
  );

  const dismissCheckin = useCallback(async () => {
    const uid = session?.user?.id;
    const now = new Date().toISOString();
    setLastCheckin(now);
    if (!uid) return;
    await supabase.from("profiles").update({ last_checkin: now }).eq("id", uid);
  }, [session]);

  const resetAll = useCallback(async () => {
    const uid = session?.user?.id;
    if (uid) {
      await Promise.all([
        supabase.from("workouts").delete().eq("user_id", uid),
        supabase.from("weight_logs").delete().eq("user_id", uid),
        supabase
          .from("profiles")
          .update({ onboarded: false, last_checkin: null })
          .eq("id", uid),
      ]);
    }
    setWorkouts([]);
    setWeightLog([]);
    setLastCheckin(null);
    setProfile((p) => ({ ...p, onboarded: false }));
  }, [session]);

  const auth = useMemo(
    () => ({
      signedIn: !!session,
      email: session?.user?.email ?? null,
      userId,
    }),
    [session, userId]
  );

  const value = useMemo(
    () => ({
      auth,
      authReady,
      dataLoading,
      profile,
      workouts,
      weightLog,
      lastCheckin,
      signUp,
      signIn,
      signOut,
      completeOnboarding,
      updateProfile,
      addWorkout,
      updateWeight,
      dismissCheckin,
      resetAll,
    }),
    [
      auth,
      authReady,
      dataLoading,
      profile,
      workouts,
      weightLog,
      lastCheckin,
      signUp,
      signIn,
      signOut,
      completeOnboarding,
      updateProfile,
      addWorkout,
      updateWeight,
      dismissCheckin,
      resetAll,
    ]
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

    const contribution = {};
    for (const w of workouts) contribution[w.dateKey] = (contribution[w.dateKey] || 0) + 1;

    let streak = 0;
    for (let i = 0; i < 400; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      if (contribution[key(d)]) streak++;
      else if (i === 0) continue;
      else break;
    }

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

    const muscleVolume = {};
    for (const w of last30) {
      const ex = getExercise(w.exerciseId);
      const v = (w.reps || w.durationSec / 6) * 1;
      for (const m of ex.targets) muscleVolume[m] = (muscleVolume[m] || 0) + v;
    }
    const maxMuscle = Math.max(1, ...Object.values(muscleVolume));

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
