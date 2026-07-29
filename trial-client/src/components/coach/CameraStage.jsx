import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Play, Square, ShieldAlert, Loader2, Timer, CheckCircle2, AlertTriangle, MinusCircle, Star, Volume2, VolumeX, Flame, SwitchCamera } from "lucide-react";
import Button from "../ui/Button";
import StatusChip from "../ui/StatusChip";
import CoachBubble from "./CoachBubble";
import { usePoseDetection } from "../../hooks/usePoseDetection";
import { useSpeech } from "../../hooks/useSpeech";
import { useI18n } from "../../i18n/LanguageContext";
import { formatDuration } from "../../lib/fitness";
import { cueText, setupText, repMilestoneText, holdMilestoneText, sessionEndText } from "../../lib/coachCues";
import { HYPE_TRACKS, FIRST_TRACK_DELAY_MS, TRACK_REP_GAP, TRACK_STALL_MS } from "../../lib/hypeTrack";

const TRACK_TEXT = {
  front: { en: "Front view", vi: "Chính diện" },
  left: { en: "Left side", vi: "Bên trái" },
  right: { en: "Right side", vi: "Bên phải" },
  holding: { en: "Holding", vi: "Đang giữ" },
  adjust: { en: "Adjust", vi: "Chỉnh lại" },
  searching: { en: "Find your body", vi: "Tìm cơ thể" },
  "—": { en: "Ready", vi: "Sẵn sàng" },
};

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/* Ramp an audio element's volume instead of stepping it. Snapping the music
   down the instant the coach starts talking is audible as a click; over ~180ms
   it just sounds like the track making room. */
function rampVolume(el, to, ms = 180) {
  if (!el) return;
  clearInterval(el.__ramp);
  const from = el.volume;
  if (Math.abs(to - from) < 0.01) { el.volume = to; return; }
  const steps = Math.max(1, Math.round(ms / 30));
  let i = 0;
  el.__ramp = setInterval(() => {
    i += 1;
    const v = from + (to - from) * (i / steps);
    el.volume = clamp(v, 0, 1);
    if (i >= steps) clearInterval(el.__ramp);
  }, 30);
}

const JOINT_ROWS = ["shoulder", "elbow", "bodyLine", "hip", "knee", "ankle"];

/* Posture notes are all individually true at the same time — shoulders up AND
   chest closed AND head forward — so per-cue cooldowns alone let them queue up
   one after another. Sharing a bucket spaces them out. */
const CUE_GROUP = {
  shrug: "posture", chestOut: "posture", headNeutral: "posture",
  hips: "posture", hipsHigh: "posture",
};

/* Posture notes are paced by reps rather than by the clock — two reps of
   breathing room between them, so they arrive at the rhythm of the set instead
   of on a timer that ignores how fast you are moving. The time value is only a
   fallback: while reps are not registering, "two reps away" never arrives, and
   that is exactly when someone is still fixing their setup and most wants to
   hear something. */
const POSTURE_REP_GAP = 2;
const POSTURE_STALL_MS = 30000;

function HudPanel({ title, children, className = "" }) {
  return (
    <div className={`rounded-xl border border-accent/25 bg-black/55 px-2.5 py-2 backdrop-blur ${className}`}>
      <div className="mb-1 text-[0.58rem] font-bold uppercase tracking-wider text-accent">{title}</div>
      {children}
    </div>
  );
}

function Stars({ value }) {
  return (
    <div className="mt-1 flex gap-0.5" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          className={`h-2.5 w-2.5 ${i < Math.round(value) ? "fill-accent text-accent" : "text-white/25"}`}
        />
      ))}
    </div>
  );
}

export default function CameraStage({ exercise, beastMode, onEnd }) {
  const { t, locale } = useI18n();
  const faults = useRef({ depth: 0, hips: 0, elbows: 0 });
  const [nudge, setNudge] = useState(0);
  const isHold = exercise.detection.mode === "hold";

  const pose = usePoseDetection(exercise, {
    onFault: (type) => {
      faults.current[type] = (faults.current[type] || 0) + 1;
      // occasional coach nudge on repeated faults
      if (beastMode && faults.current[type] % 4 === 0) setNudge((n) => n + 1);
    },
  });

  const { videoRef, canvasRef, status, reps, stage, angle, tracking, cue, holdSeconds, elapsed, frameSize, joints, checks, quality, facingMode, switching, cameraCount } = pose;
  const running = status === "running";

  // Let the stage take the camera's own shape instead of forcing 16:9 — a phone
  // hands back a portrait stream and squeezing it into a landscape box is what
  // flattened the picture. Clamped so an extreme ratio can't blow up the layout.
  const stageStyle = frameSize
    ? { aspectRatio: `${clamp(frameSize.w / frameSize.h, 9 / 16, 16 / 9)}` }
    : undefined;

  /* ---- spoken coaching ----
     You cannot read a screen mid-set, so every cue is also said out loud. */
  const [voiceOn, setVoiceOn] = useState(true);
  const [hypeOn, setHypeOn] = useState(true);
  // The hook is deliberately not gated on `running`: stopping the session flips
  // that false in the same tick as the sign-off line, which would cancel it
  // mid-sentence. Each speaking effect below is gated on `running` itself.
  const trackRef = useRef(null);
  // The whole point of the second channel: a form correction must never be lost
  // under the music, so the track steps back while the coach is speaking.
  const speakingRef = useRef(false);
  const nowTrack = useRef(null);
  const duck = useCallback((speaking) => {
    speakingRef.current = speaking;
    const a = trackRef.current;
    const t = nowTrack.current;
    if (!a || a.paused || !t) return;
    rampVolume(a, speaking ? (t.duckedVolume ?? 0.14) : (t.volume ?? 0.6));
  }, []);
  const { speak, prime, cancel, reset, supported: voiceSupported, voiceLang } =
    useSpeech({ enabled: voiceOn || hypeOn, locale, onVoiceActivity: duck });
  // The two channels share one engine, so the engine stays enabled while either
  // is on — which means the per-channel mute has to be enforced here, or muting
  // form coaching would still let form cues through on the motivation channel's
  // ticket.
  const sayCoach = useCallback(
    (text, opts) => (voiceOn ? speak(text, opts) : false),
    [voiceOn, speak]
  );

  /* Nothing is said for the first few seconds. Starting a session and being
     talked at immediately gives you no chance to get into position, and the
     first frames are also the least reliable — the model is still settling and
     you are still walking into shot. Armed by the first counted rep, or by a
     short grace period if the reps are not registering. */
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!running) { setArmed(false); return; }
    const id = setTimeout(() => setArmed(true), 5000);
    return () => clearTimeout(id);
  }, [running]);
  useEffect(() => {
    if (running && reps >= 1) setArmed(true);
  }, [running, reps]);

  // Live coaching waits for the arm; the sign-off does not.
  const sayLive = useCallback(
    (text, opts) => (armed ? sayCoach(text, opts) : false),
    [armed, sayCoach]
  );

  // Must run inside the click, not after the camera resolves — see prime().
  const startSession = () => {
    prime();
    if (HYPE_TRACKS.length) {
      const a = trackRef.current || (trackRef.current = new Audio());
      a.src = HYPE_TRACKS[0].src;
      a.volume = 0;
      a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
    }
    pose.start();
  };
  // Speak in whatever language we have a real voice for. The screen stays in
  // the user's locale; only the spoken wording follows the available voice.
  const say = voiceLang || locale;
  const cueRef = useRef(null);
  cueRef.current = cue;
  const repsRef = useRef(0);
  repsRef.current = reps;
  const cueSeed = useRef(0);
  const spokenRep = useRef(0);
  const spokenHold = useRef(0);

  useEffect(() => {
    if (!running) return;
    reset();
    spokenRep.current = 0;
    spokenHold.current = 0;
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  // Corrections take precedence over everything else. On curls each fault is
  // called once and then left alone: the elbow-drift and shrug faults persist
  // for the whole set by nature, so repeating them every few seconds nags
  // through the one exercise where you most need to concentrate.
  const sayFaultOnce = exercise.detection.formKey === "curl";
  const lastPosture = useRef({ rep: -Infinity, at: -Infinity });
  useEffect(() => {
    if (!running || !cue) return;

    const isPosture = CUE_GROUP[cue] === "posture";
    if (isPosture) {
      const repsSince = reps - lastPosture.current.rep;
      const msSince = performance.now() - lastPosture.current.at;
      if (repsSince < POSTURE_REP_GAP && msSince < POSTURE_STALL_MS) return;
    }

    // Seed only advances on a line that is actually said, so the phrasings
    // rotate per utterance rather than per blocked attempt.
    const text = cueText(cue, say, cueSeed.current + 1);
    if (!text) return;
    const said = sayLive(text, {
      key: cue,
      priority: 2,
      keyGapMs: sayFaultOnce ? Infinity : 9000,
      group: CUE_GROUP[cue],
      groupGapMs: 4000, // floor only; reps do the real spacing above
    });
    if (said) {
      cueSeed.current += 1;
      if (isPosture) lastPosture.current = { rep: reps, at: performance.now() };
    }
  }, [cue, reps, running, say, sayLive, sayFaultOnce]);

  // Rep / hold milestones, so the count reaches you without looking.
  useEffect(() => {
    if (!running || isHold || reps === 0) return;
    if (reps % 5 === 0 && reps !== spokenRep.current) {
      spokenRep.current = reps;
      sayLive(repMilestoneText(reps, say), { priority: 1, minGapMs: 1200 });
    }
  }, [reps, running, isHold, say, sayLive]);

  useEffect(() => {
    if (!running || !isHold) return;
    const whole = Math.floor(holdSeconds);
    if (whole > 0 && whole % 15 === 0 && whole !== spokenHold.current) {
      spokenHold.current = whole;
      sayLive(holdMilestoneText(whole, say), { priority: 1, minGapMs: 1200 });
    }
  }, [holdSeconds, running, isHold, say, sayLive]);

  // Lost the body for a couple of seconds: say so, rather than going quiet and
  // leaving you wondering whether it is still counting.
  useEffect(() => {
    if (!running || tracking !== "searching") return;
    const id = setTimeout(() => {
      sayLive(cueText("offFrame", say, Math.floor(Date.now() / 1000)), {
        key: "offFrame", priority: 1, keyGapMs: 12000,
      });
    }, 2500);
    return () => clearTimeout(id);
  }, [tracking, running, say, sayLive]);

  /* Motivation queue — real audio files on their own channel, so they play
     underneath the spoken coaching instead of competing for the speech queue.
     The first starts once the camera has settled; each one after waits for the
     previous to finish AND for a few reps, so they never stack. The stall
     timeout matters because "a few reps from now" never arrives if reps are
     not registering, which would leave the rest of the queue unplayed. */
  useEffect(() => {
    if (!running || !hypeOn || !HYPE_TRACKS.length) return;
    const a = trackRef.current || (trackRef.current = new Audio());
    let index = -1;
    let armed = null; // { rep, at } captured when the previous track ended

    const play = (i) => {
      const t = HYPE_TRACKS[i];
      if (!t) return;
      index = i;
      nowTrack.current = t;
      armed = null;
      a.src = t.src;
      // Start already ducked if a correction happens to be in flight.
      a.volume = speakingRef.current ? (t.duckedVolume ?? 0.14) : (t.volume ?? 0.6);
      a.currentTime = 0;
      a.play().catch(() => { /* blocked before any interaction */ });
    };

    a.onended = () => { armed = { rep: repsRef.current, at: performance.now() }; };

    const first = setTimeout(() => play(0), FIRST_TRACK_DELAY_MS);
    const tick = setInterval(() => {
      if (!armed || index + 1 >= HYPE_TRACKS.length) return;
      const repsSince = repsRef.current - armed.rep;
      const msSince = performance.now() - armed.at;
      if (repsSince >= TRACK_REP_GAP || msSince >= TRACK_STALL_MS) play(index + 1);
    }, 1000);

    return () => {
      clearTimeout(first);
      clearInterval(tick);
      a.onended = null;
    };
  }, [running, hypeOn]);

  // Ending the session or muting motivation stops the track immediately.
  useEffect(() => {
    if (running && hypeOn) return;
    const a = trackRef.current;
    if (a) { clearInterval(a.__ramp); a.pause(); a.currentTime = 0; }
    nowTrack.current = null;
  }, [running, hypeOn]);

  // The setup reminder is the first thing you hear, right as coaching arms.
  useEffect(() => {
    if (!running || !armed) return;
    const line = setupText(exercise.detection.formKey, say);
    if (line) sayCoach(line, { key: "setup", priority: 2, keyGapMs: Infinity });
  }, [running, armed, say, sayCoach, exercise]);

  // Periodic reinforcement while the form is actually clean.
  useEffect(() => {
    if (!running) return;
    const pool = isHold ? ["holdStrong", "breathe"] : ["good", "good", "breathe"];
    let n = 0;
    const id = setInterval(() => {
      if (cueRef.current) return; // never talk over a correction
      const key = pool[n++ % pool.length];
      sayLive(cueText(key, say, Math.floor(Date.now() / 1000)), {
        key, priority: 0, minGapMs: 6000, keyGapMs: 24000,
      });
    }, 9000);
    return () => clearInterval(id);
  }, [running, isHold, say, sayLive]);

  const end = () => {
    const snap = pose.stop();
    cancel();
    sayCoach(sessionEndText(snap.reps, isHold, Math.round(snap.holdSeconds || 0), say), { priority: 2 });
    onEnd({ ...snap, faults: { ...faults.current } });
    faults.current = { depth: 0, hips: 0, elbows: 0 };
  };

  const trackLabel = (TRACK_TEXT[tracking] || TRACK_TEXT["—"])[locale];
  const cueLabel = cue ? cueText(cue, locale, cueSeed.current) : null;

  return (
    <div>
      <div
        className="relative aspect-[3/4] max-h-[68vh] w-full overflow-hidden rounded-3xl border border-line-strong bg-[#0d0d0d] sm:aspect-video"
        style={stageStyle}
      >
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="h-full w-full object-contain"
          // Mirrored for the selfie lens only: a mirror is what makes your own
          // movement readable, but applying it to the rear camera shows the
          // world backwards.
          style={{
            transform: facingMode === "user" ? "scaleX(-1)" : "none",
            display: running ? "block" : "none",
          }}
        />

        {/* Idle */}
        {status === "idle" && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/5 text-white/70">
                <CameraOff className="h-8 w-8" />
              </span>
              <p className="mt-4 text-lg font-bold text-white">{t("coach.cameraIdle")}</p>
              <p className="mx-auto mt-1.5 max-w-xs text-[0.88rem] text-white/60">{t("coach.cameraIdleBody")}</p>
              <Button size="lg" className="mt-5" onClick={startSession}>
                {t("coach.startSession")}
              </Button>
            </div>
          </div>
        )}

        {/* Loading */}
        {status === "loading" && (
          <div className="absolute inset-0 grid place-items-center bg-black/75 text-center">
            <div>
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" />
              <p className="mt-3 text-[0.9rem] font-semibold text-white/80">{t("coach.loadingModel")}</p>
            </div>
          </div>
        )}

        {/* Error / permission */}
        {status === "error" && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-danger-surface text-danger">
                <ShieldAlert className="h-7 w-7" />
              </span>
              <p className="mt-4 text-lg font-bold text-white">{t("coach.permissionTitle")}</p>
              <p className="mt-1.5 text-[0.88rem] text-white/60">{t("coach.permissionBody")}</p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={startSession}>
                {t("common.retry")}
              </Button>
            </div>
          </div>
        )}

        {/* Live overlays */}
        {running && (
          <>
            <div className="absolute left-4 top-4 glass rounded-2xl px-4 py-3">
              {isHold ? (
                <>
                  <div className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wide text-ink-3">
                    <Timer className="h-3.5 w-3.5" /> {t("coach.duration")}
                  </div>
                  <div className="font-display text-4xl font-extrabold leading-none text-ink">
                    {holdSeconds.toFixed(1)}<span className="text-lg">s</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[0.68rem] font-bold uppercase tracking-wide text-ink-3">{t("coach.reps")}</div>
                  <div className="font-display text-5xl font-extrabold leading-none text-accent-strong">{reps}</div>
                  <div className="mt-1 text-[0.72rem] font-semibold uppercase text-ink-2">{stage}</div>
                </>
              )}
            </div>

            <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
              <StatusChip status={tracking === "searching" ? "partial" : "active"} label={trackLabel} pulse />
              <span className="glass rounded-full px-3 py-1 font-mono text-[0.78rem] font-semibold text-ink">{Math.round(angle)}°</span>
              {voiceSupported && (
                <button
                  type="button"
                  onClick={() => setVoiceOn((v) => !v)}
                  aria-pressed={voiceOn}
                  aria-label={t(voiceOn ? "coach.voiceOn" : "coach.voiceOff")}
                  title={t(voiceOn ? "coach.voiceOn" : "coach.voiceOff")}
                  className={`glass grid h-9 w-9 place-items-center rounded-full transition-colors ${
                    voiceOn ? "text-accent" : "text-ink-3"
                  }`}
                >
                  {voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
              )}
              {cameraCount > 1 && (
                <button
                  type="button"
                  onClick={pose.switchCamera}
                  disabled={switching}
                  aria-label={t("coach.flipCamera")}
                  title={t("coach.flipCamera")}
                  className="glass grid h-9 w-9 place-items-center rounded-full text-ink transition-colors disabled:opacity-50"
                >
                  {switching
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <SwitchCamera className="h-4 w-4" />}
                </button>
              )}
              {voiceSupported && (
                <button
                  type="button"
                  onClick={() => setHypeOn((v) => !v)}
                  aria-pressed={hypeOn}
                  aria-label={t(hypeOn ? "coach.hypeOn" : "coach.hypeOff")}
                  title={t(hypeOn ? "coach.hypeOn" : "coach.hypeOff")}
                  className={`glass grid h-9 w-9 place-items-center rounded-full transition-colors ${
                    hypeOn ? "text-accent" : "text-ink-3"
                  }`}
                >
                  <Flame className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Live form verdict: amber cue when off, green "good form" otherwise */}
            {cueLabel ? (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-pop rounded-full bg-warning-surface px-4 py-2 text-[0.85rem] font-semibold text-warning shadow-float">
                ⚠ {t("coach.fixPrefix")}: {cueLabel}
              </div>
            ) : (
              tracking !== "searching" && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-success-surface px-4 py-2 text-[0.85rem] font-semibold text-success shadow-float">
                  ✓ {t("coach.goodForm")}
                </div>
              )
            )}

            <div className="absolute right-4 bottom-4 glass rounded-full px-3 py-1 text-[0.78rem] font-semibold text-ink">
              {formatDuration(elapsed)}
            </div>

            {/* Analysis HUD — desktop only. On a phone the camera box is barely
                wider than the person, so these panels would cover the very form
                they are describing. */}
            <div className="pointer-events-none absolute left-4 top-[6.5rem] hidden w-[10.5rem] xl:block">
              <HudPanel title={t("coach.jointsTitle")}>
                <ul className="space-y-0.5">
                  {JOINT_ROWS.map((k) => (
                    <li key={k} className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[0.62rem] text-white/55">{t(`coach.angle.${k}`)}</span>
                      <span className="font-mono text-[0.82rem] font-bold text-accent">
                        {joints?.[k] != null ? `${joints[k]}°` : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </HudPanel>

              {quality != null && (
                <HudPanel title={t("coach.overallTitle")} className="mt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-2xl font-extrabold leading-none text-white">
                      {(quality * 10).toFixed(1)}
                    </span>
                    <span className="text-[0.66rem] font-semibold text-white/45">/10</span>
                  </div>
                  <Stars value={quality * 5} />
                </HudPanel>
              )}
            </div>

            {checks?.length > 0 && (
              <div className="pointer-events-none absolute right-4 top-[6.5rem] hidden w-[12.5rem] xl:block">
                <HudPanel title={t("coach.formTitle")}>
                  <ul className="space-y-1">
                    {checks.map(({ key, ok }) => (
                      <li key={key} className="flex items-start gap-1.5">
                        {ok === null ? (
                          <MinusCircle className="mt-px h-3 w-3 shrink-0 text-white/35" />
                        ) : ok ? (
                          <CheckCircle2 className="mt-px h-3 w-3 shrink-0 text-success" />
                        ) : (
                          <AlertTriangle className="mt-px h-3 w-3 shrink-0 text-warning" />
                        )}
                        <span className={`text-[0.62rem] leading-snug ${ok === false ? "text-warning" : "text-white/70"}`}>
                          {t(`coach.check.${key}`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </HudPanel>
              </div>
            )}

            <CoachBubble enabled={beastMode} nudge={nudge} />
          </>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center gap-3">
        {!running ? (
          <Button size="lg" className="flex-1" onClick={startSession} disabled={status === "loading"} leftIcon={status === "loading" ? null : <Play className="h-5 w-5" />}>
            {status === "loading" ? t("common.loading") : t("coach.startSession")}
          </Button>
        ) : (
          <Button size="lg" variant="destructive" className="flex-1" onClick={end} leftIcon={<Square className="h-4.5 w-4.5" />}>
            {t("coach.endSession")}
          </Button>
        )}
        <span className="hidden items-center gap-2 text-[0.8rem] text-ink-3 sm:flex">
          <Camera className="h-4 w-4" /> {t("home.trustLine")}
        </span>
      </div>

      {/* Silence here is otherwise indistinguishable from a broken app: the
          engine exists but the machine has no installed voice to speak with. */}
      {voiceSupported && voiceLang === null && (
        <p className="mt-2.5 flex items-start gap-2 text-[0.8rem] text-warning">
          <VolumeX className="mt-0.5 h-4 w-4 shrink-0" />
          {t("coach.noVoiceInstalled")}
        </p>
      )}
    </div>
  );
}
