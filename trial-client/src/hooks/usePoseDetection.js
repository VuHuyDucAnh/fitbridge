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

function angleAt(a, b, c) {
  const rad = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let deg = Math.abs((rad * 180) / Math.PI);
  if (deg > 180) deg = 360 - deg;
  return deg;
}

function vis(lm, ...idx) {
  return idx.reduce((s, i) => s + (lm[i]?.visibility ?? 0), 0) / idx.length;
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
  const m = useRef({
    reps: 0,
    stage: cfg.countPhase === "flex" ? "extend" : "flex",
    minAngle: 180,
    maxAngle: 0,
    qualitySum: 0,
    qualityCount: 0,
    holdMs: 0,
    lastTs: 0,
    cue: null,
    tracking: "—",
    angle: 0,
    startedAt: 0,
  });

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
    m.current = {
      reps: 0,
      stage: cfg.countPhase === "flex" ? "extend" : "flex",
      minAngle: 180, maxAngle: 0, qualitySum: 0, qualityCount: 0,
      holdMs: 0, lastTs: now(), cue: null, tracking: "—", angle: 0,
      startedAt: performance.now(),
    };
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

/* ---------- rep analysis ---------- */
function analyzeReps(lm, s, cfg, ctx, canvas, accent, onRep, onFault) {
  const joint = cfg.joint; // "elbow" | "knee"
  const tripL = joint === "elbow" ? [L.lShoulder, L.lElbow, L.lWrist] : [L.lHip, L.lKnee, L.lAnkle];
  const tripR = joint === "elbow" ? [L.rShoulder, L.rElbow, L.rWrist] : [L.rHip, L.rKnee, L.rAnkle];

  const visL = vis(lm, ...tripL);
  const visR = vis(lm, ...tripR);
  const shoulderDist = Math.abs(lm[L.lShoulder].x - lm[L.rShoulder].x);

  let angle = 0;
  if (visL > 0.5 && visR > 0.5 && shoulderDist > 0.15) {
    s.tracking = "front";
    angle = (angleAt(lm[tripL[0]], lm[tripL[1]], lm[tripL[2]]) +
      angleAt(lm[tripR[0]], lm[tripR[1]], lm[tripR[2]])) / 2;
  } else if (visL >= visR && visL > 0.4) {
    s.tracking = "left";
    angle = angleAt(lm[tripL[0]], lm[tripL[1]], lm[tripL[2]]);
    drawLimb(ctx, canvas, lm, tripL, s.stage === "flex" ? "#ff3b6b" : accent);
  } else if (visR > 0.4) {
    s.tracking = "right";
    angle = angleAt(lm[tripR[0]], lm[tripR[1]], lm[tripR[2]]);
    drawLimb(ctx, canvas, lm, tripR, s.stage === "flex" ? "#ff3b6b" : accent);
  } else {
    s.tracking = "searching";
    return;
  }

  s.angle = angle;
  s.minAngle = Math.min(s.minAngle, angle);
  s.maxAngle = Math.max(s.maxAngle, angle);

  // State machine + rep count on the configured transition.
  if (angle <= cfg.flex && s.stage !== "flex") {
    s.stage = "flex";
    if (cfg.countPhase === "flex") countRep(s, cfg, onRep, onFault);
  } else if (angle >= cfg.extend && s.stage !== "extend") {
    s.stage = "extend";
    if (cfg.countPhase === "extend") countRep(s, cfg, onRep, onFault);
  }

  // Live cue on form (depth + alignment), non-blocking.
  s.cue = liveCue(lm, cfg, angle, s);
}

function countRep(s, cfg, onRep, onFault) {
  s.reps += 1;
  // Quality from range of motion achieved this rep.
  const rom = s.maxAngle - s.minAngle;
  const target = Math.abs(cfg.extend - cfg.flex);
  let quality = Math.max(0.4, Math.min(1, rom / (target * 0.9)));
  // Depth bonus/penalty based on whether we truly reached the flexed position.
  if (cfg.formKey !== "plank") {
    const deepEnough = s.minAngle <= cfg.flex + 12;
    if (!deepEnough) {
      quality *= 0.8;
      onFault?.("depth");
    }
  }
  s.qualitySum += quality;
  s.qualityCount += 1;
  s.minAngle = 180;
  s.maxAngle = 0;
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
  const line = bodyLineAngle(lm);
  s.angle = line ?? 0;
  const dt = s.lastTs ? nowTs - s.lastTs : 0;
  s.lastTs = nowTs;

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
