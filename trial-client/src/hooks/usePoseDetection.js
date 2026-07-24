import { useCallback, useEffect, useRef, useState } from "react";

/* ---------- MediaPipe loader (CDN, on-device inference) ---------- */
const CDN = "https://cdn.jsdelivr.net/npm/@mediapipe";
let mpPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.crossOrigin = "anonymous";
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

function loadMediaPipe() {
  if (mpPromise) return mpPromise;
  mpPromise = (async () => {
    await loadScript(`${CDN}/camera_utils/camera_utils.js`);
    await loadScript(`${CDN}/drawing_utils/drawing_utils.js`);
    await loadScript(`${CDN}/pose/pose.js`);
  })();
  return mpPromise;
}

/* ---------- geometry ---------- */
const L = {
  lShoulder: 11, rShoulder: 12, lElbow: 13, rElbow: 14, lWrist: 15, rWrist: 16,
  lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28,
};

/* ---------- strictness tuning ----------
   These make rep counting refuse anything that isn't the real exercise. */
const MIN_VIS = 0.55;       // required visibility of the tracked joint triple
const MIN_TORSO_VIS = 0.4;  // required visibility of shoulders+hips for the pose gate
const DWELL_FRAMES = 2;     // frames the joint must stay in an extreme before it registers
const MIN_REP_MS = 400;     // debounce: no two reps closer than this (kills jitter/shakes)
const MAX_JUMP = 45;        // deg/frame; a bigger swing is treated as tracking noise
const MIN_ROM_FRAC = 0.55;  // a rep must span at least this fraction of the full range

function angleAt(a, b, c) {
  const rad = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let deg = Math.abs((rad * 180) / Math.PI);
  if (deg > 180) deg = 360 - deg;
  return deg;
}

function vis(lm, ...idx) {
  return idx.reduce((s, i) => s + (lm[i]?.visibility ?? 0), 0) / idx.length;
}

function avgY(lm, ...idx) {
  return idx.reduce((s, i) => s + (lm[i]?.y ?? 0), 0) / idx.length;
}

// Tilt of the torso (shoulder→hip) from vertical: 0° = standing upright, 90° = lying flat.
function torsoTilt(lm) {
  const sx = (lm[L.lShoulder].x + lm[L.rShoulder].x) / 2;
  const sy = (lm[L.lShoulder].y + lm[L.rShoulder].y) / 2;
  const hx = (lm[L.lHip].x + lm[L.rHip].x) / 2;
  const hy = (lm[L.lHip].y + lm[L.rHip].y) / 2;
  const dx = hx - sx, dy = hy - sy;
  if (Math.hypot(dx, dy) < 0.06) return null; // too small to trust
  const deg = Math.abs((Math.atan2(dx, dy) * 180) / Math.PI);
  return deg > 90 ? 180 - deg : deg;
}

/* Spatial gate: the whole-body posture must match the selected exercise, or NO
   rep can be counted. This is what stops "select push-up, shake your head" from
   scoring — a head shake while upright fails the horizontal-body requirement. */
function poseGate(lm, formKey) {
  if (vis(lm, L.lShoulder, L.rShoulder, L.lHip, L.rHip) < MIN_TORSO_VIS)
    return { ok: false, reason: "searching" };
  const tilt = torsoTilt(lm);
  if (tilt == null) return { ok: false, reason: "searching" };

  const shoulderY = avgY(lm, L.lShoulder, L.rShoulder);
  const wristVis = vis(lm, L.lWrist, L.rWrist);
  const wristY = avgY(lm, L.lWrist, L.rWrist);

  switch (formKey) {
    case "pushup":
      // Body must be roughly horizontal and the hands planted (not overhead).
      if (tilt < 40) return { ok: false, reason: "wrongpose" };
      if (wristVis > 0.4 && wristY < shoulderY - 0.03) return { ok: false, reason: "wrongpose" };
      return { ok: true };
    case "pullup":
      // Upright/hanging with hands overhead.
      if (tilt > 55) return { ok: false, reason: "wrongpose" };
      if (wristVis > 0.4 && wristY > shoulderY) return { ok: false, reason: "wrongpose" };
      return { ok: true };
    case "squat":
      // Standing upright (some forward lean allowed).
      if (tilt > 60) return { ok: false, reason: "wrongpose" };
      return { ok: true };
    case "curl": {
      // Upright, with the upper arm hanging down and pinned — reject raising the
      // whole arm / random hand waving.
      if (tilt > 60) return { ok: false, reason: "wrongpose" };
      const elbowY = avgY(lm, L.lElbow, L.rElbow);
      if (elbowY < shoulderY) return { ok: false, reason: "wrongpose" };
      return { ok: true };
    }
    default:
      return { ok: true };
  }
}

/**
 * Pose detection + rep counting + live form analysis for one exercise.
 * Everything runs on-device; nothing leaves the browser.
 */
export function usePoseDetection(exercise, { onRep, onFault } = {}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const accentRef = useRef("#ff5a1f");

  const cfg = exercise.detection;

  // Machine state kept in a ref (updated per-frame without re-rendering).
  const m = useRef(freshMachine());

  const [status, setStatus] = useState("idle"); // idle|loading|running|error
  const [error, setError] = useState(null);
  const [live, setLive] = useState({
    reps: 0, stage: m.current.stage, angle: 0, tracking: "—",
    cue: null, quality: null, holdSeconds: 0, elapsed: 0,
  });
  const frameRef = useRef(0);

  const pushLive = useCallback(() => {
    const s = m.current;
    setLive({
      reps: s.reps,
      stage: s.stage,
      angle: Math.round(s.angle),
      tracking: s.tracking,
      cue: s.cue,
      quality: s.qualityCount ? s.qualitySum / s.qualityCount : null,
      holdSeconds: s.holdMs / 1000,
      elapsed: s.startedAt ? (performance.now() - s.startedAt) / 1000 : 0,
    });
  }, []);

  /* ---- per-frame analysis ---- */
  const onResults = useCallback(
    (results) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      const lm = results.poseLandmarks;
      const s = m.current;
      frameRef.current++;

      if (!lm) {
        s.tracking = "searching";
        if (frameRef.current % 5 === 0) pushLive();
        return;
      }

      // draw skeleton
      if (window.drawConnectors && window.POSE_CONNECTIONS) {
        window.drawConnectors(ctx, lm, window.POSE_CONNECTIONS, {
          color: "rgba(255,255,255,0.22)", lineWidth: 2,
        });
        window.drawLandmarks(ctx, lm, { color: accentRef.current, lineWidth: 1, radius: 2.5 });
      }

      const now = performance.now();

      if (cfg.mode === "hold") {
        analyzeHold(lm, s, cfg, now, onFault);
      } else {
        analyzeReps(lm, s, cfg, ctx, canvas, accentRef.current, onRep, onFault);
      }

      if (frameRef.current % 4 === 0) pushLive();
    },
    [cfg, onRep, onFault, pushLive]
  );

  const start = useCallback(async () => {
    setError(null);
    setStatus("loading");
    // reset machine
    m.current = freshMachine();
    setLive((v) => ({ ...v, reps: 0, cue: null, quality: null, holdSeconds: 0, elapsed: 0 }));

    try {
      accentRef.current =
        getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#ff5a1f";

      await loadMediaPipe();

      const pose = new window.Pose({ locateFile: (f) => `${CDN}/pose/${f}` });
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });
      pose.onResults(onResults);
      poseRef.current = pose;

      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (poseRef.current && videoRef.current)
            await poseRef.current.send({ image: videoRef.current });
        },
        width: 1280,
        height: 720,
      });
      cameraRef.current = camera;
      await camera.start();
      setStatus("running");
    } catch (err) {
      setStatus("error");
      setError(err?.message || "camera");
    }
  }, [cfg, onResults]);

  const stop = useCallback(() => {
    try {
      cameraRef.current?.stop?.();
    } catch { /* ignore */ }
    const stream = videoRef.current?.srcObject;
    stream?.getTracks?.().forEach((tr) => tr.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    try {
      poseRef.current?.close?.();
    } catch { /* ignore */ }
    poseRef.current = null;
    cameraRef.current = null;
    setStatus("idle");
    pushLive();
    // Return a snapshot of the session for the report.
    const s = m.current;
    return {
      reps: s.reps,
      formScore: s.qualityCount ? +(s.qualitySum / s.qualityCount * 10).toFixed(1) : null,
      holdSeconds: s.holdMs / 1000,
      elapsed: s.startedAt ? (performance.now() - s.startedAt) / 1000 : 0,
    };
  }, [pushLive]);

  useEffect(() => () => stop(), []); // cleanup on unmount

  return { videoRef, canvasRef, status, error, ...live, start, stop };
}

function now() {
  return performance.now();
}

function freshMachine() {
  return {
    reps: 0,
    stage: "start",          // "start" | "flex" | "extend"
    smoothAngle: null,       // EMA-smoothed joint angle
    inFlexFrames: 0,
    inExtendFrames: 0,
    reachedFlex: false,      // did this cycle genuinely hit the flexed extreme?
    reachedExtend: false,    // …and the extended extreme?
    cycleMin: 180,
    cycleMax: 0,
    lastRepTs: 0,
    qualitySum: 0,
    qualityCount: 0,
    holdMs: 0,
    lastTs: now(),
    cue: null,
    tracking: "—",
    angle: 0,
    startedAt: performance.now(),
  };
}

/* ---------- rep analysis (strict) ----------
   Four gates must ALL pass before an angle transition can count as a rep:
   (1) the body posture matches the exercise, (2) the tracked joint is clearly
   visible, (3) the angle is smoothed and single-frame spikes are rejected, and
   (4) a full down→up (or up→down) cycle with real range of motion completes,
   with dwell time in each extreme and a debounce between reps. */
function analyzeReps(lm, s, cfg, ctx, canvas, accent, onRep, onFault) {
  const joint = cfg.joint; // "elbow" | "knee"
  const tripL = joint === "elbow" ? [L.lShoulder, L.lElbow, L.lWrist] : [L.lHip, L.lKnee, L.lAnkle];
  const tripR = joint === "elbow" ? [L.rShoulder, L.rElbow, L.rWrist] : [L.rHip, L.rKnee, L.rAnkle];

  // (1) Whole-body posture gate. On failure, freeze the cycle so nothing counts.
  const gate = poseGate(lm, cfg.formKey);
  if (!gate.ok) {
    s.tracking = gate.reason === "searching" ? "searching" : "adjust";
    s.cue = gate.reason === "wrongpose" ? "position" : null;
    s.reachedFlex = false;
    s.reachedExtend = false;
    s.inFlexFrames = 0;
    s.inExtendFrames = 0;
    s.cycleMin = 180;
    s.cycleMax = 0;
    return;
  }

  // (2) Pick the clearest side and require solid joint visibility.
  const visL = vis(lm, ...tripL);
  const visR = vis(lm, ...tripR);
  const shoulderDist = Math.abs(lm[L.lShoulder].x - lm[L.rShoulder].x);

  let angle = null;
  let trip = null;
  if (visL > MIN_VIS && visR > MIN_VIS && shoulderDist > 0.12) {
    s.tracking = "front";
    angle = (angleAt(lm[tripL[0]], lm[tripL[1]], lm[tripL[2]]) +
      angleAt(lm[tripR[0]], lm[tripR[1]], lm[tripR[2]])) / 2;
  } else if (visL >= visR && visL > MIN_VIS) {
    s.tracking = "left";
    trip = tripL;
    angle = angleAt(lm[tripL[0]], lm[tripL[1]], lm[tripL[2]]);
  } else if (visR > MIN_VIS) {
    s.tracking = "right";
    trip = tripR;
    angle = angleAt(lm[tripR[0]], lm[tripR[1]], lm[tripR[2]]);
  } else {
    s.tracking = "searching";
    return;
  }
  if (trip) drawLimb(ctx, canvas, lm, trip, s.stage === "flex" ? "#ff3b6b" : accent);

  // (3) Noise filter: EMA smoothing; damp single-frame spikes from tracking glitches.
  if (s.smoothAngle == null) s.smoothAngle = angle;
  const jump = angle - s.smoothAngle;
  if (Math.abs(jump) > MAX_JUMP) {
    s.smoothAngle += Math.sign(jump) * MAX_JUMP * 0.3; // clamp the spike
  } else {
    s.smoothAngle = s.smoothAngle * 0.6 + angle * 0.4;
  }
  const a = s.smoothAngle;
  s.angle = a;
  s.cycleMin = Math.min(s.cycleMin, a);
  s.cycleMax = Math.max(s.cycleMax, a);

  // (4) Strict state machine: dwell + full cycle + minimum ROM + debounce.
  s.inFlexFrames = a <= cfg.flex ? s.inFlexFrames + 1 : 0;
  s.inExtendFrames = a >= cfg.extend ? s.inExtendFrames + 1 : 0;

  if (s.inFlexFrames >= DWELL_FRAMES) s.reachedFlex = true;
  if (s.inExtendFrames >= DWELL_FRAMES) s.reachedExtend = true;

  const nowTs = performance.now();
  const romOk = s.cycleMax - s.cycleMin >= Math.abs(cfg.extend - cfg.flex) * MIN_ROM_FRAC;
  const debounced = nowTs - s.lastRepTs >= MIN_REP_MS;

  if (s.inFlexFrames >= DWELL_FRAMES && s.stage !== "flex") {
    s.stage = "flex";
    if (cfg.countPhase === "flex" && s.reachedExtend && romOk && debounced)
      countRep(s, cfg, onRep, onFault, nowTs);
  } else if (s.inExtendFrames >= DWELL_FRAMES && s.stage !== "extend") {
    s.stage = "extend";
    if (cfg.countPhase === "extend" && s.reachedFlex && romOk && debounced)
      countRep(s, cfg, onRep, onFault, nowTs);
  }

  // Live form cue (depth + alignment), non-blocking.
  s.cue = liveCue(lm, cfg, a, s);
}

function countRep(s, cfg, onRep, onFault, nowTs) {
  s.reps += 1;
  const rom = s.cycleMax - s.cycleMin;
  const target = Math.abs(cfg.extend - cfg.flex);
  let quality = Math.max(0.4, Math.min(1, rom / (target * 0.9)));
  // Depth check: did we truly reach the flexed extreme?
  const deepEnough = s.cycleMin <= cfg.flex + 12;
  if (!deepEnough) {
    quality *= 0.8;
    onFault?.("depth");
  }
  s.qualitySum += quality;
  s.qualityCount += 1;
  s.lastRepTs = nowTs;
  // Reset the cycle: a new rep must earn both extremes again.
  s.reachedFlex = false;
  s.reachedExtend = false;
  s.cycleMin = 180;
  s.cycleMax = 0;
  onRep?.(s.reps, quality);
}

function liveCue(lm, cfg, angle, s) {
  if (cfg.formKey === "pushup" || cfg.formKey === "plank") {
    const line = bodyLineAngle(lm);
    if (line != null && line < 158) return "hips";
  }
  if (cfg.formKey === "squat" && s.stage === "flex") {
    if (angle > cfg.flex + 25) return "deeper";
  }
  if (cfg.formKey === "curl") {
    // elbow drifting forward from torso → swinging
    const drift = Math.abs(lm[L.lElbow].x - lm[L.lShoulder].x);
    if (drift > 0.14) return "elbows";
  }
  return null;
}

function bodyLineAngle(lm) {
  const l = vis(lm, L.lShoulder, L.lHip, L.lAnkle);
  const r = vis(lm, L.rShoulder, L.rHip, L.rAnkle);
  if (Math.max(l, r) < 0.4) return null;
  return l >= r
    ? angleAt(lm[L.lShoulder], lm[L.lHip], lm[L.lAnkle])
    : angleAt(lm[L.rShoulder], lm[L.rHip], lm[L.rAnkle]);
}

/* ---------- hold analysis (plank) ---------- */
function analyzeHold(lm, s, cfg, nowTs, onFault) {
  const dt = s.lastTs ? nowTs - s.lastTs : 0;
  s.lastTs = nowTs;

  // A plank is a HORIZONTAL hold. Standing upright (torso vertical) makes a
  // straight shoulder-hip-ankle line too, so gate on body orientation first —
  // otherwise just standing there would rack up "hold" time.
  const tilt = torsoTilt(lm);
  if (tilt == null) {
    s.tracking = "searching";
    return;
  }
  if (tilt < 40) {
    s.tracking = "adjust";
    s.cue = "position";
    return;
  }

  const line = bodyLineAngle(lm);
  s.angle = line ?? 0;

  if (line != null && line >= cfg.straight) {
    s.tracking = "holding";
    s.holdMs += dt;
    s.cue = null;
    s.qualitySum += 1;
    s.qualityCount += 1;
  } else if (line != null) {
    s.tracking = "adjust";
    s.cue = "hips";
    s.qualitySum += 0.5;
    s.qualityCount += 1;
    onFault?.("hips");
  } else {
    s.tracking = "searching";
  }
}

function drawLimb(ctx, canvas, lm, trip, color) {
  ctx.beginPath();
  ctx.moveTo(lm[trip[0]].x * canvas.width, lm[trip[0]].y * canvas.height);
  ctx.lineTo(lm[trip[1]].x * canvas.width, lm[trip[1]].y * canvas.height);
  ctx.lineTo(lm[trip[2]].x * canvas.width, lm[trip[2]].y * canvas.height);
  ctx.lineWidth = 6;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.stroke();
}
