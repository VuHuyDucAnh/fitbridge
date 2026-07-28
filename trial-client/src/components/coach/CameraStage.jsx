import { useRef, useState } from "react";
import { Camera, CameraOff, Play, Square, ShieldAlert, Loader2, Timer, CheckCircle2, AlertTriangle, MinusCircle, Star } from "lucide-react";
import Button from "../ui/Button";
import StatusChip from "../ui/StatusChip";
import CoachBubble from "./CoachBubble";
import { usePoseDetection } from "../../hooks/usePoseDetection";
import { useI18n } from "../../i18n/LanguageContext";
import { formatDuration } from "../../lib/fitness";

const CUE_TEXT = {
  hips: { en: "Keep your hips in line", vi: "Giữ hông thẳng hàng" },
  deeper: { en: "Go a little deeper", vi: "Hạ sâu hơn một chút" },
  elbows: { en: "Pin your elbows in", vi: "Ép sát khuỷu tay" },
  position: { en: "Get into the exercise position", vi: "Vào đúng tư thế bài tập" },
};
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

const JOINT_ROWS = ["shoulder", "elbow", "bodyLine", "hip", "knee", "ankle"];

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

  const { videoRef, canvasRef, status, reps, stage, angle, tracking, cue, holdSeconds, elapsed, frameSize, joints, checks, quality } = pose;
  const running = status === "running";

  // Let the stage take the camera's own shape instead of forcing 16:9 — a phone
  // hands back a portrait stream and squeezing it into a landscape box is what
  // flattened the picture. Clamped so an extreme ratio can't blow up the layout.
  const stageStyle = frameSize
    ? { aspectRatio: `${clamp(frameSize.w / frameSize.h, 9 / 16, 16 / 9)}` }
    : undefined;

  const end = () => {
    const snap = pose.stop();
    onEnd({ ...snap, faults: { ...faults.current } });
    faults.current = { depth: 0, hips: 0, elbows: 0 };
  };

  const trackLabel = (TRACK_TEXT[tracking] || TRACK_TEXT["—"])[locale];
  const cueLabel = cue ? (CUE_TEXT[cue] || {})[locale] : null;

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
          style={{ transform: "scaleX(-1)", display: running ? "block" : "none" }}
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
              <Button size="lg" className="mt-5" onClick={pose.start}>
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
              <Button variant="secondary" size="sm" className="mt-4" onClick={pose.start}>
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
          <Button size="lg" className="flex-1" onClick={pose.start} disabled={status === "loading"} leftIcon={status === "loading" ? null : <Play className="h-5 w-5" />}>
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
    </div>
  );
}
