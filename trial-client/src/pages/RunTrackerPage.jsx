import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Square, Pause, MapPin, Timer, Gauge, Flame, Route as RouteIcon, AlertTriangle, TrendingUp } from "lucide-react";
import PageShell from "../components/layout/PageShell";
import Button from "../components/ui/Button";
import StatTile from "../components/ui/StatTile";
import Reveal from "../components/ui/Reveal";
import RouteMap from "../components/run/RouteMap";
import { useI18n } from "../i18n/LanguageContext";
import { useApp } from "../state/AppState";
import { formatDuration } from "../lib/fitness";
import {
  pathDistance,
  distanceValue,
  paceSecPerUnit,
  formatPace,
  runCalories,
  computeSplits,
} from "../lib/geo";

const IDLE = "idle";
const TRACKING = "tracking";
const PAUSED = "paused";

export default function RunTrackerPage() {
  const { t, locale } = useI18n();
  const { profile, runs, addRun } = useApp();

  const [unit, setUnit] = useState("km");
  const [phase, setPhase] = useState(IDLE);
  const [path, setPath] = useState([]);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [gpsError, setGpsError] = useState("");
  const [savedRun, setSavedRun] = useState(null);

  const watchId = useRef(null);
  const startT = useRef(0);
  const accumSec = useRef(0);
  const tickRef = useRef(null);

  const weightKg = profile.weight || 70;
  const unitLabel = unit === "mi" ? t("run.mi") : t("run.km");

  const distanceM = useMemo(() => pathDistance(path), [path]);
  const paceSec = paceSecPerUnit(distanceM, elapsed, unit);
  const calories = runCalories(distanceM, elapsed, weightKg);

  // Clean up on unmount / stop.
  const clearWatch = () => {
    if (watchId.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };
  useEffect(() => clearWatch, []);

  const beginWatch = () => {
    if (!navigator.geolocation) {
      setGpsError(t("run.noGps"));
      return false;
    }
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsError("");
        const { latitude, longitude, accuracy } = pos.coords;
        if (accuracy != null && accuracy > 50) return; // drop very rough fixes
        setPath((prev) => [...prev, { lat: latitude, lng: longitude, t: Date.now() - startT.current }]);
      },
      (err) => {
        setGpsError(err.code === 1 ? t("run.denied") : t("run.gpsError"));
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );
    return true;
  };

  const startTick = () => {
    tickRef.current = setInterval(() => {
      setElapsed(accumSec.current + (Date.now() - startT.current) / 1000);
    }, 250);
  };

  const start = () => {
    setPath([]);
    setElapsed(0);
    accumSec.current = 0;
    setSavedRun(null);
    startT.current = Date.now();
    if (!beginWatch()) return;
    startTick();
    setPhase(TRACKING);
  };

  const pause = () => {
    accumSec.current += (Date.now() - startT.current) / 1000;
    clearWatch();
    setPhase(PAUSED);
  };

  const resume = () => {
    startT.current = Date.now();
    if (!beginWatch()) return;
    startTick();
    setPhase(TRACKING);
  };

  const stop = async () => {
    if (phase === TRACKING) accumSec.current += (Date.now() - startT.current) / 1000;
    clearWatch();
    const finalSec = Math.round(accumSec.current);
    const finalDist = pathDistance(path);
    const run = {
      durationSec: finalSec,
      distanceM: finalDist,
      avgPaceSec: paceSecPerUnit(finalDist, finalSec, "km"), // always store per-km
      calories: runCalories(finalDist, finalSec, weightKg),
      path,
      date: new Date().toISOString(),
    };
    setPhase(IDLE);
    setElapsed(finalSec);
    const saved = await addRun(run);
    setSavedRun(saved || run);
  };

  const running = phase === TRACKING;
  const active = phase !== IDLE;
  const splits = savedRun ? computeSplits(savedRun.path, unit) : [];

  return (
    <PageShell requireOnboarding>
      <div className="mx-auto max-w-5xl px-5">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{t("run.title")}</h1>
              <p className="mt-1.5 text-ink-2">{t("run.subtitle")}</p>
            </div>
            {!active && (
              <div className="inline-flex rounded-xl border border-line bg-sunken p-1 text-[0.82rem] font-semibold">
                {["km", "mi"].map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnit(u)}
                    className={`glow rounded-lg px-3 py-1.5 ${unit === u ? "bg-accent-strong text-accent-contrast" : "text-ink-2"}`}
                  >
                    {u === "mi" ? t("run.mi") : t("run.km")}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Reveal>

        {gpsError && (
          <div role="alert" className="mt-5 flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-[0.88rem] font-medium text-danger">
            <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0" /> {gpsError}
          </div>
        )}

        {/* Live tracker */}
        <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_minmax(0,20rem)]">
          <Reveal>
            <div className="card p-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatTile
                  icon={<RouteIcon className="h-4 w-4" />}
                  label={t("run.distance")}
                  value={distanceValue(distanceM, unit).toFixed(2)}
                  unit={unitLabel}
                  accent
                />
                <StatTile icon={<Timer className="h-4 w-4" />} label={t("run.time")} value={formatDuration(Math.round(elapsed))} />
                <StatTile icon={<Gauge className="h-4 w-4" />} label={t("run.pace")} value={formatPace(paceSec)} sub={`/${unitLabel}`} />
                <StatTile icon={<Flame className="h-4 w-4" />} label={t("run.calories")} value={calories} unit={t("common.kcal")} />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {phase === IDLE && (
                  <Button size="lg" onClick={start} leftIcon={<Play className="h-5 w-5" />}>
                    {t("run.start")}
                  </Button>
                )}
                {phase === TRACKING && (
                  <>
                    <Button size="lg" variant="secondary" onClick={pause} leftIcon={<Pause className="h-4.5 w-4.5" />}>
                      {t("run.pause")}
                    </Button>
                    <Button size="lg" variant="destructive" onClick={stop} leftIcon={<Square className="h-4.5 w-4.5" />}>
                      {t("run.finish")}
                    </Button>
                  </>
                )}
                {phase === PAUSED && (
                  <>
                    <Button size="lg" onClick={resume} leftIcon={<Play className="h-5 w-5" />}>
                      {t("run.resume")}
                    </Button>
                    <Button size="lg" variant="destructive" onClick={stop} leftIcon={<Square className="h-4.5 w-4.5" />}>
                      {t("run.finish")}
                    </Button>
                  </>
                )}
                {active && (
                  <span className="inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-ink-3">
                    <MapPin className="h-4 w-4 text-accent" /> {t("run.points", { n: path.length })}
                  </span>
                )}
              </div>
              {phase === IDLE && !savedRun && (
                <p className="mt-3 text-[0.82rem] text-ink-3">{t("run.hint")}</p>
              )}
            </div>
          </Reveal>

          <Reveal delay={80}>
            <RouteMap path={active ? path : savedRun?.path || path} live={running} animate={!!savedRun && !active} className="h-full" />
          </Reveal>
        </section>

        {/* Post-run summary: splits */}
        {savedRun && splits.length > 0 && (
          <Reveal>
            <section className="mt-6 card p-6">
              <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
                <TrendingUp className="h-5 w-5 text-accent" /> {t("run.splits")}
              </h2>
              <div className="mt-4 space-y-2">
                {splits.map((s) => {
                  const paces = splits.map((x) => x.pace).filter((p) => p > 0);
                  const min = Math.min(...paces);
                  const max = Math.max(...paces);
                  const range = Math.max(max - min, 1);
                  const w = 30 + (1 - (s.pace - min) / range) * 70; // faster = longer bar
                  return (
                    <div key={s.index} className="flex items-center gap-3 text-[0.85rem]">
                      <span className="w-10 shrink-0 font-mono font-semibold text-ink-2">
                        {s.partial ? `~${s.index}` : s.index}
                      </span>
                      <div className="h-6 flex-1 overflow-hidden rounded-md bg-sunken">
                        <div className="flex h-full items-center rounded-md bg-accent/80 px-2" style={{ width: `${w}%` }}>
                          <span className="text-[0.72rem] font-bold text-accent-contrast">{formatPace(s.pace)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </Reveal>
        )}

        {/* Run history */}
        <section className="mt-8">
          <h2 className="font-display text-xl font-extrabold">{t("run.history")}</h2>
          {runs.length === 0 ? (
            <div className="card mt-3 grid place-items-center p-10 text-center">
              <RouteIcon className="h-9 w-9 text-ink-3" />
              <p className="mt-3 max-w-xs text-ink-2">{t("run.empty")}</p>
            </div>
          ) : (
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {runs.map((r) => (
                <article key={r.id} className="card card-hover overflow-hidden">
                  <RouteMap path={r.path} className="border-0 border-b border-line" />
                  <div className="p-4">
                    <div className="text-[0.78rem] text-ink-3">
                      {new Date(r.date).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="font-display text-2xl font-extrabold text-accent-strong">
                        {distanceValue(r.distanceM, unit).toFixed(2)}
                      </span>
                      <span className="text-[0.8rem] font-semibold text-ink-2">{unitLabel}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.8rem] text-ink-2">
                      <span className="inline-flex items-center gap-1"><Timer className="h-3.5 w-3.5" /> {formatDuration(r.durationSec)}</span>
                      <span className="inline-flex items-center gap-1"><Gauge className="h-3.5 w-3.5" /> {formatPace(paceSecPerUnit(r.distanceM, r.durationSec, unit))}/{unitLabel}</span>
                      <span className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5" /> {r.calories}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
