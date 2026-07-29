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
  nose: 0,
  lShoulder: 11, rShoulder: 12, lElbow: 13, rElbow: 14, lWrist: 15, rWrist: 16,
  lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28,
  lFoot: 31, rFoot: 32,
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

/* ---------- live readouts for the on-screen HUD ----------
   The rep counter only needs one joint; the desktop overlay shows the whole
   chain, so measure every joint on whichever side the camera can see best. */
function bestSide(lm) {
  const l = vis(lm, L.lShoulder, L.lHip, L.lKnee, L.lElbow);
  const r = vis(lm, L.rShoulder, L.rHip, L.rKnee, L.rElbow);
  return l >= r ? "l" : "r";
}

export function measureJoints(lm) {
  const s = bestSide(lm);
  const P = s === "l"
    ? { sh: L.lShoulder, el: L.lElbow, wr: L.lWrist, hp: L.lHip, kn: L.lKnee, an: L.lAnkle, ft: L.lFoot }
    : { sh: L.rShoulder, el: L.rElbow, wr: L.rWrist, hp: L.rHip, kn: L.rKnee, an: L.rAnkle, ft: L.rFoot };
  // a joint the camera cannot see is reported as null, never as a wrong number
  const A = (a, b, c) => (vis(lm, a, b, c) < 0.35 ? null : Math.round(angleAt(lm[a], lm[b], lm[c])));
  return {
    shoulder: A(P.el, P.sh, P.hp),
    elbow: A(P.sh, P.el, P.wr),
    hip: A(P.sh, P.hp, P.kn),
    knee: A(P.hp, P.kn, P.an),
    ankle: A(P.kn, P.an, P.ft),
    bodyLine: A(P.sh, P.hp, P.an),
  };
}

// How far the elbow sits from the shoulder->wrist line, as a fraction of torso
// width — scale-free, so it reads the same near or far from the camera.
function elbowFlare(lm) {
  const w = Math.abs(lm[L.lShoulder].x - lm[L.rShoulder].x) || 0.001;
  const side = bestSide(lm);
  const sh = lm[side === "l" ? L.lShoulder : L.rShoulder];
  const el = lm[side === "l" ? L.lElbow : L.rElbow];
  return Math.abs(el.x - sh.x) / w;
}

/* Signed hip offset from the shoulder->ankle line, in normalized units.
   Positive = hips below the line (sagging), negative = above it (piking).
   A plain angle cannot tell those apart — both close it the same way. */
function hipDeviation(lm) {
  const side = bestSide(lm);
  const S = side === "l" ? L.lShoulder : L.rShoulder;
  const A = side === "l" ? L.lAnkle : L.rAnkle;
  const H = side === "l" ? L.lHip : L.rHip;
  if (vis(lm, S, A, H) < 0.45) return null;
  const dx = lm[A].x - lm[S].x;
  if (Math.abs(dx) < 0.08) return null; // body pointing at the lens: unstable
  const t = (lm[H].x - lm[S].x) / dx;
  return lm[H].y - (lm[S].y + (lm[A].y - lm[S].y) * t);
}

/* Knee width over ankle width. Below ~0.85 the knees are collapsing inward. */
function kneeCave(lm) {
  if (vis(lm, L.lKnee, L.rKnee, L.lAnkle, L.rAnkle) < 0.45) return null;
  const ankles = Math.abs(lm[L.lAnkle].x - lm[L.rAnkle].x);
  if (ankles < 0.03) return null;
  return Math.abs(lm[L.lKnee].x - lm[L.rKnee].x) / ankles;
}

/* Shoulders creeping toward the ears, as a multiple of this person's own
   relaxed posture. Returns e.g. 1.15 for "15% higher than their normal".

   Measured as shoulder-to-hip height over shoulder width, deliberately *not*
   against the head: dropping the chin lowers the nose, which any nose-relative
   metric reads as the shoulders rising, so a chin tuck would be reported as a
   shrug. Hip width cannot be moved by the neck. The baseline is learned
   per session because torso proportions vary far too much between people for a
   fixed threshold to mean anything. */
function shrugExcess(lm, s) {
  if (vis(lm, L.lShoulder, L.rShoulder, L.lHip, L.rHip) < 0.45) return null;
  // Scaled by HIP width, not shoulder width: rolling the shoulders forward
  // foreshortens them, which a shoulder-scaled metric reads as a shrug — so a
  // hunch got reported as "shoulders down" instead of "chest out". Hips do not
  // roll, so they stay a trustworthy ruler.
  const width = Math.abs(lm[L.lHip].x - lm[L.rHip].x);
  if (width < 0.03) return null; // turned side-on: width is not measurable
  const shY = (lm[L.lShoulder].y + lm[L.rShoulder].y) / 2;
  const hipY = (lm[L.lHip].y + lm[L.rHip].y) / 2;
  const ratio = (hipY - shY) / width;
  if (!Number.isFinite(ratio) || ratio <= 0) return null;
  // The baseline only ever tracks *downward*, toward the most relaxed posture
  // seen this session. Letting it rise at all means a shrug held through a long
  // set slowly becomes the new normal and the fault stops being reported —
  // exactly backwards. Easing down rather than snapping keeps one glitched
  // frame from permanently redefining "relaxed".
  if (s.shrugBase == null) s.shrugBase = ratio;
  else if (ratio < s.shrugBase) s.shrugBase = s.shrugBase * 0.98 + ratio * 0.02;
  return ratio / s.shrugBase;
}

/* Chest collapsing / shoulders rolling forward, as a fraction of this person's
   most open posture. Below 1 means narrower than their best.

   Rounding forward is motion along the camera's depth axis, so from the front —
   which is how a curl is actually filmed — torso tilt does not move at all and
   is blind to it. Shoulder width relative to hip width does move: rolled-in
   shoulders foreshorten. Same learned-baseline trick as the shrug check, since
   shoulder-to-hip width varies hugely between people. */
function chestCollapse(lm, s) {
  if (vis(lm, L.lShoulder, L.rShoulder, L.lHip, L.rHip) < 0.45) return null;
  const shW = Math.abs(lm[L.lShoulder].x - lm[L.rShoulder].x);
  const hipW = Math.abs(lm[L.lHip].x - lm[L.rHip].x);
  if (shW < 0.05 || hipW < 0.03) return null; // side-on: widths are meaningless
  const ratio = shW / hipW;
  if (!Number.isFinite(ratio) || ratio <= 0) return null;
  // Baseline tracks the *widest* chest seen, for the same reason the shrug
  // baseline only tracks downward: a fault held all set must not become normal.
  if (s.chestBase == null) s.chestBase = ratio;
  else if (ratio > s.chestBase) s.chestBase = s.chestBase * 0.98 + ratio * 0.02;
  return ratio / s.chestBase;
}

function headLine(lm) {
  if (vis(lm, L.nose) < 0.3) return null;
  const side = bestSide(lm);
  return angleAt(lm[L.nose], lm[side === "l" ? L.lShoulder : L.rShoulder], lm[side === "l" ? L.lHip : L.rHip]);
}

/* Per-exercise form checklist. Each entry resolves to true (good) / false
   (needs work) / null (cannot tell yet) so the UI can stay honest about what it
   can actually see. Keyed by detection.formKey, so lunge reuses squat. */
const FORM_CHECKS = {
  pushup: [
    { key: "straightBody", test: (j) => (j.bodyLine == null ? null : j.bodyLine >= 158) },
    { key: "elbowTuck", test: (j, lm) => elbowFlare(lm) < 0.55 },
    { key: "depth", test: (j, lm, s) => (s.cycleMin > 179 ? null : s.cycleMin <= 105) },
    { key: "headNeutral", test: (j, lm) => { const h = headLine(lm); return h == null ? null : h >= 115; } },
  ],
  plank: [
    { key: "straightBody", test: (j) => (j.bodyLine == null ? null : j.bodyLine >= 165) },
    { key: "hipLevel", test: (j) => (j.hip == null ? null : j.hip >= 160) },
    { key: "elbowStack", test: (j, lm) => elbowFlare(lm) < 0.5 },
    { key: "headNeutral", test: (j, lm) => { const h = headLine(lm); return h == null ? null : h >= 115; } },
  ],
  squat: [
    { key: "depth", test: (j, lm, s) => (s.cycleMin > 179 ? null : s.cycleMin <= 100) },
    { key: "backNeutral", test: (j, lm) => { const h = headLine(lm); return h == null ? null : h >= 140; } },
    { key: "kneeTrack", test: (j, lm) => {
        const side = bestSide(lm);
        const kn = lm[side === "l" ? L.lKnee : L.rKnee];
        const an = lm[side === "l" ? L.lAnkle : L.rAnkle];
        const w = Math.abs(lm[L.lHip].x - lm[L.rHip].x) || 0.001;
        return Math.abs(kn.x - an.x) / w < 1.1;
      } },
    { key: "chestUp", test: (j) => (j.hip == null ? null : j.hip >= 45) },
  ],
  curl: [
    { key: "armPinned", test: (j, lm) => Math.abs(lm[L.lElbow].x - lm[L.lShoulder].x) < 0.14 },
    { key: "fullExtension", test: (j, lm, s) => (s.cycleMax < 1 ? null : s.cycleMax >= 150) },
    { key: "fullFlexion", test: (j, lm, s) => (s.cycleMin > 179 ? null : s.cycleMin <= 60) },
    { key: "noSwing", test: (j) => (j.bodyLine == null ? null : j.bodyLine >= 160) },
  ],
  pullup: [
    { key: "deadHang", test: (j, lm, s) => (s.cycleMax < 1 ? null : s.cycleMax >= 150) },
    { key: "chinOverBar", test: (j, lm, s) => (s.cycleMin > 179 ? null : s.cycleMin <= 80) },
    { key: "noKip", test: (j) => (j.bodyLine == null ? null : j.bodyLine >= 155) },
    { key: "legsControlled", test: (j) => (j.knee == null ? null : j.knee >= 130) },
  ],
};

export function runChecks(lm, cfg, joints, s) {
  const list = FORM_CHECKS[cfg.formKey] || [];
  // If the camera cannot see the torso, every check is unknown. Some tests read
  // machine state rather than landmarks and would otherwise happily report
  // "good form" at an empty room.
  const seen = vis(lm, L.lShoulder, L.rShoulder, L.lHip, L.rHip) >= MIN_TORSO_VIS;
  return list.map(({ key, test }) => {
    if (!seen) return { key, ok: null };
    let ok = null;
    try { ok = test(joints, lm, s); } catch { ok = null; }
    return { key, ok };
  });
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
    joints: null, checks: [],
  });
  // Real width/height of the camera frames. Phones hand back a portrait stream
  // (e.g. 720×1280), so the stage can't assume 16:9 — see setFrameSize below.
  const [frameSize, setFrameSize] = useState(null);
  const frameRef = useRef(0);
  const [facingMode, setFacingMode] = useState("user");
  const facingRef = useRef("user");
  const [switching, setSwitching] = useState(false);
  const switchingRef = useRef(false);
  const [cameraCount, setCameraCount] = useState(0);

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
      joints: s.joints,
      checks: s.checks,
    });
  }, []);

  /* ---- per-frame analysis ---- */
  const onResults = useCallback(
    (results) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Match the backing store to the frame we actually got. Blitting a
      // portrait phone stream into a hardcoded 1280×720 canvas is what squashed
      // the picture; at 1:1 the frame keeps its own proportions and the CSS
      // object-fit does the rest.
      const src = results.image;
      const sw = src?.width || src?.videoWidth || videoRef.current?.videoWidth || 0;
      const sh = src?.height || src?.videoHeight || videoRef.current?.videoHeight || 0;
      if (sw && sh && (canvas.width !== sw || canvas.height !== sh)) {
        canvas.width = sw;
        canvas.height = sh;
        setFrameSize({ w: sw, h: sh });
      }

      const ctx = canvas.getContext("2d");
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(src, 0, 0, canvas.width, canvas.height);

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

      // Measured first: the cue logic below reads these, so computing them
      // afterwards would coach against the previous frame.
      s.joints = measureJoints(lm);

      if (cfg.mode === "hold") {
        analyzeHold(lm, s, cfg, now, onFault);
      } else {
        analyzeReps(lm, s, cfg, ctx, canvas, accentRef.current, onRep, onFault);
      }

      s.checks = runChecks(lm, cfg, s.joints, s);

      // Running tallies the end-of-session report grades against.
      s.frames++;
      if (s.tracking !== "searching" && s.tracking !== "adjust") s.framesTracked++;
      for (const c of s.checks) {
        if (c.ok === null) continue;
        const e = (s.checkStats[c.key] ||= { pass: 0, total: 0 });
        e.total++;
        if (c.ok) e.pass++;
      }

      if (frameRef.current % 4 === 0) pushLive();
    },
    [cfg, onRep, onFault, pushLive]
  );

  /* Bringing the camera up is separate from starting a session, because
     switching lenses mid-set must not reset the rep count — it rebuilds the
     pipeline while leaving the machine state alone. */
  const boot = useCallback(async (mode) => {
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
      facingMode: mode,
    });
    cameraRef.current = camera;
    await camera.start();
  }, [onResults]);

  // Release the stream and the model without touching session state.
  const teardown = useCallback(() => {
    try { cameraRef.current?.stop?.(); } catch { /* ignore */ }
    const stream = videoRef.current?.srcObject;
    stream?.getTracks?.().forEach((tr) => tr.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    try { poseRef.current?.close?.(); } catch { /* ignore */ }
    poseRef.current = null;
    cameraRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStatus("loading");
    // reset machine
    m.current = freshMachine();
    setLive((v) => ({ ...v, reps: 0, cue: null, quality: null, holdSeconds: 0, elapsed: 0 }));

    try {
      await boot(facingRef.current);
      setStatus("running");
    } catch (err) {
      setStatus("error");
      setError(err?.message || "camera");
    }
  }, [boot]);

  /** Flip between the selfie and rear lens without ending the set. */
  const switchCamera = useCallback(async () => {
    if (switchingRef.current || !cameraRef.current) return;
    switchingRef.current = true;
    setSwitching(true);
    const previous = facingRef.current;
    const next = previous === "user" ? "environment" : "user";
    try {
      teardown();
      facingRef.current = next;
      setFacingMode(next);
      await boot(next);
    } catch {
      // No rear lens, or it refused: go back to the one that was working
      // rather than leaving the session with a dead stream.
      try {
        facingRef.current = previous;
        setFacingMode(previous);
        await boot(previous);
      } catch (err2) {
        setStatus("error");
        setError(err2?.message || "camera");
      }
    } finally {
      switchingRef.current = false;
      setSwitching(false);
    }
  }, [boot, teardown]);

  const stop = useCallback(() => {
    teardown();
    setStatus("idle");
    pushLive();
    // Return a snapshot of the session for the report.
    const s = m.current;
    return {
      reps: s.reps,
      formScore: s.qualityCount ? +(s.qualitySum / s.qualityCount * 10).toFixed(1) : null,
      holdSeconds: s.holdMs / 1000,
      elapsed: s.startedAt ? (performance.now() - s.startedAt) / 1000 : 0,
      metrics: summarise(s),
    };
  }, [pushLive, teardown]);

  /* Only offer the flip when there is something to flip to. Device labels are
     hidden until permission is granted, so this is re-probed once the stream is
     live — before that a phone can report a single generic camera. */
  useEffect(() => {
    let alive = true;
    const probe = async () => {
      try {
        const devices = await navigator.mediaDevices?.enumerateDevices?.();
        if (alive && devices) setCameraCount(devices.filter((d) => d.kind === "videoinput").length);
      } catch { /* enumeration unavailable */ }
    };
    probe();
    navigator.mediaDevices?.addEventListener?.("devicechange", probe);
    return () => {
      alive = false;
      navigator.mediaDevices?.removeEventListener?.("devicechange", probe);
    };
  }, [status]);

  useEffect(() => () => stop(), []); // cleanup on unmount

  return { videoRef, canvasRef, status, error, frameSize, facingMode, switching, cameraCount, ...live, start, stop, switchCamera };
}

function now() {
  return performance.now();
}

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
// Coefficient of variation — spread relative to the mean, so it compares across
// exercises with very different angle ranges and rep speeds.
function cv(a) {
  const mu = mean(a);
  if (!mu) return null;
  const v = mean(a.map((x) => (x - mu) ** 2));
  return Math.sqrt(v) / mu;
}

/** Condense the per-rep log into the numbers the report grades against. */
function summarise(s) {
  const roms = s.repLog.map((r) => r.rom).filter((r) => r > 0);
  const gaps = s.repLog.map((r) => r.gapMs).filter((g) => g != null && g > 0);
  const checks = {};
  for (const [k, e] of Object.entries(s.checkStats)) {
    if (e.total >= 5) checks[k] = e.pass / e.total;
  }
  return {
    reps: s.reps,
    romAvg: mean(roms),
    romMin: roms.length ? Math.min(...roms) : null,
    romMax: roms.length ? Math.max(...roms) : null,
    romCv: roms.length >= 3 ? cv(roms) : null,
    deepestAngle: s.repLog.length ? Math.min(...s.repLog.map((r) => r.minAngle)) : null,
    highestAngle: s.repLog.length ? Math.max(...s.repLog.map((r) => r.maxAngle)) : null,
    tempoAvgSec: gaps.length ? mean(gaps) / 1000 : null,
    tempoCv: gaps.length >= 3 ? cv(gaps) : null,
    trackedRatio: s.frames ? s.framesTracked / s.frames : null,
    checks,
  };
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
    joints: null,
    checks: [],
    shrugBase: null,
    chestBase: null,
    // Per-rep log + frame tallies. The report grades depth, tempo and
    // consistency, and none of that can be reconstructed from a single
    // end-of-session number.
    repLog: [],
    frames: 0,
    framesTracked: 0,
    checkStats: {},
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
    // The movement is not recognised, but the body usually still is — coach the
    // posture rather than going quiet until a rep finally registers.
    s.cue = gate.reason === "wrongpose" ? (postureCue(lm, cfg, s) || "position") : postureCue(lm, cfg, s);
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
    // Clear the previous cue rather than leaving a stale one on screen, but
    // still offer posture help if the torso is readable.
    s.cue = postureCue(lm, cfg, s);
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
  // Capture before lastRepTs moves — the gap is this rep's tempo.
  s.repLog.push({
    rom,
    minAngle: s.cycleMin,
    maxAngle: s.cycleMax,
    gapMs: s.lastRepTs ? nowTs - s.lastRepTs : null,
  });
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

/* Posture coaching that needs no rep context.
   Rep analysis bails out early whenever the movement is not recognised — wrong
   posture, or a joint the camera cannot see — and used to fall silent exactly
   when the user is still setting up and most wants to hear something. These
   checks only read a single frame, so they work during those gaps. */
export function postureCue(lm, cfg, s) {
  const key = cfg.formKey;

  if (key === "pushup" || key === "plank") {
    const dev = hipDeviation(lm);
    if (dev != null && dev > 0.045) return "hips";
    if (dev != null && dev < -0.055) return "hipsHigh";
  }

  const shrug = shrugExcess(lm, s);
  if (shrug != null && shrug > 1.12) return "shrug";

  const head = headLine(lm);
  if (head != null && head < 110) return "headNeutral";

  if (key === "curl" || key === "squat" || key === "pullup") {
    const collapse = chestCollapse(lm, s);
    if (collapse != null && collapse < 0.92) return "chestOut";
    const tilt = torsoTilt(lm);
    if (tilt != null && tilt > 14) return "chestOut";
  }

  return null;
}

/* The spoken coach's vocabulary. Returns the single most useful correction for
   this frame, most severe first — a coach says one thing at a time, and the
   speech layer needs a stable key to rate-limit against. */
function liveCue(lm, cfg, angle, s) {
  const key = cfg.formKey;

  if (key === "pushup" || key === "plank") {
    const dev = hipDeviation(lm);
    if (dev != null && dev > 0.045) return "hips";
    if (dev != null && dev < -0.055) return "hipsHigh";
    const head = headLine(lm);
    if (head != null && head < 110) return "headNeutral";
    if (key === "pushup") {
      if (elbowFlare(lm) > 0.7) return "elbowsFlare";
      if (s.stage === "flex" && angle > cfg.flex + 22) return "deeper";
      if (s.cycleMax > 0 && s.cycleMax < cfg.extend - 12) return "lockout";
    }
  }

  if (key === "squat") {
    const cave = kneeCave(lm);
    if (cave != null && cave < 0.85) return "kneesOut";
    const tilt = torsoTilt(lm);
    if (tilt != null && tilt > 48) return "chestUp";
    if (s.stage === "flex" && angle > cfg.flex + 25) return "deeper";
    if (s.cycleMax > 0 && s.cycleMax < cfg.extend - 12) return "lockout";
  }

  if (key === "curl") {
    if (Math.abs(lm[L.lElbow].x - lm[L.lShoulder].x) > 0.14) return "elbows";
    const tilt = torsoTilt(lm);
    if (tilt != null && tilt > 22) return "swing";
    // Traps taking over: shoulders ride up toward the ears as the arm loads.
    const shrug = shrugExcess(lm, s);
    if (shrug != null && shrug > 1.12) return "shrug";
    // A mild forward lean is the chest collapsing, not yet a full swing.
    const collapse = chestCollapse(lm, s);
    if (collapse != null && collapse < 0.92) return "chestOut";
    if (tilt != null && tilt > 10) return "chestOut";
    if (s.cycleMax > 0 && s.cycleMax < cfg.extend - 15) return "lockout";
  }

  if (key === "pullup") {
    if (s.cycleMin < 180 && s.cycleMin > cfg.flex + 15) return "chinOverBar";
    if (s.cycleMax > 0 && s.cycleMax < cfg.extend - 15) return "deadHang";
    const dev = hipDeviation(lm);
    if (dev != null && Math.abs(dev) > 0.08) return "kip";
  }

  // Tempo last: it only matters once the movement itself is sound.
  const recent = s.repLog.slice(-2);
  if (recent.length === 2 && recent.every((r) => r.gapMs != null && r.gapMs < 1250)) return "slower";

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
    // Say *which way* it is off — sag and pike both close the same angle.
    s.cue = liveCue(lm, cfg, s.angle, s) || "hips";
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
