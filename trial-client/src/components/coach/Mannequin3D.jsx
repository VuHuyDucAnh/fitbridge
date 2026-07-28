import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Rotate3d } from "lucide-react";
import { useI18n } from "../../i18n/LanguageContext";

/* An anatomical 3D figure that performs the selected exercise with textbook
   form, orbitable by dragging. Joint angles are measured live off the rig's
   world positions (real geometry, never hard-coded numbers) and shown beside
   the model, the way a coach would break the movement down.

   Form targets come from published technique guidance:
     push-up  — one straight line ankle→head, elbows tucked ~45° (not flared to
                90°), lower to ~90° elbow, hands stacked under shoulders
     squat    — break parallel: ~90-100° knee flexion, hips below knee, torso
                lean ~35-40°, knees tracking over toes
     curl     — upper arm pinned vertical, elbow travels full extension→flexion
     pull-up  — dead hang with near-straight elbows → chin over bar
     lunge    — ~90° at front hip, front knee and back knee, knee over ankle
     plank    — elbows stacked under shoulders, hip line straight (180°)        */

const deg = (d) => (d * Math.PI) / 180;

/* ---------------- pose library (degrees, sagittal plane) ----------------
   Positive knee/elbow = flexion. Poses are authored as readable degrees and
   converted once at load.                                                   */
const POSES = {
  // Torso rotated 90° so the chest faces the floor; contact = hands + toes.
  pushup: {
    A: { root: { r: [90, 0, 0] }, shoulder: 90, elbow: 4, hip: 0, knee: 2, ankle: 0, head: -32, spine: 0 },
    B: { root: { r: [90, 0, 0] }, shoulder: 52, elbow: 88, hip: 0, knee: 2, ankle: 0, head: -26, spine: 0 },
    armSpread: 9, anchor: "ground", cam: { target: [0, 0.42, 0], dist: 3.0 },
  },
  // Forearm plank: upper arm straight down, forearm flat along the floor.
  plank: {
    A: { root: { r: [90, 0, 0] }, shoulder: 90, elbow: 90, hip: 0, knee: 2, ankle: 0, head: -30, spine: 0 },
    B: { root: { r: [90, 0, 0] }, shoulder: 88, elbow: 90, hip: 0, knee: 2, ankle: 0, head: -30, spine: 0 },
    armSpread: 8, anchor: "ground", hold: true, cam: { target: [0, 0.4, 0], dist: 3.0 },
  },
  // Break parallel: ~100° knee flexion, hips below knee, torso lean ~35°.
  squat: {
    A: { root: { r: [0, 0, 0] }, shoulder: 5, elbow: 5, hip: 0, knee: 0, head: 0, spine: 0 },
    B: { root: { r: [0, 0, 0] }, shoulder: 74, elbow: 18, hip: 96, knee: 102, head: -12, spine: 26 },
    armSpread: 6, footFlat: true, anchor: "ground", cam: { target: [0, 0.82, 0], dist: 3.9 },
  },
  // Upper arm pinned vertical; only the elbow travels.
  "bicep-curl": {
    A: { root: { r: [0, 0, 0] }, shoulder: 2, elbow: 4, hip: 0, knee: 0, head: 0, spine: 0 },
    B: { root: { r: [0, 0, 0] }, shoulder: 6, elbow: 140, hip: 0, knee: 0, head: 0, spine: 0 },
    armSpread: 5, footFlat: true, anchor: "ground", cam: { target: [0, 0.88, 0], dist: 3.8 },
  },
  // Dead hang (arms overhead, elbows straight) → chin over bar (elbow ~40°).
  "pull-up": {
    A: { root: { r: [0, 0, 0] }, shoulder: 172, elbow: 6, hip: -8, knee: 32, head: 0, spine: 0 },
    B: { root: { r: [0, 0, 0] }, shoulder: 34, elbow: 146, hip: -8, knee: 32, head: 4, spine: -4 },
    armSpread: 13, anchor: "bar", cam: { target: [0, 0.72, 0], dist: 4.0 },
  },
  // ~90° at front hip, front knee and back knee; front knee over the ankle.
  lunge: {
    A: { root: { r: [0, 0, 0] }, shoulder: 5, elbow: 5, head: 0, spine: 0, split: 0 },
    B: { root: { r: [0, 0, 0] }, shoulder: 10, elbow: 12, head: 0, spine: 8, split: 1 },
    armSpread: 6, anchor: "ground", cam: { target: [0, 0.78, 0], dist: 3.9 },
    splitPose: { frontHip: 88, frontKnee: 90, backHip: -26, backKnee: 92, backAnkle: -46 },
  },
};

const BAR_Y = 1.35;

const BODY_COLOR = 0x7c7f88;
const ACCENT = 0xff6a1f;

/* ---------------- geometry helpers ---------------- */

// A tapered "muscle" segment: lathe profile that swells at the belly.
function muscleSegment(len, rTop, rMid, rBot, material) {
  const pts = [];
  const N = 14;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const r = (1 - t) * (1 - t) * rTop + 2 * (1 - t) * t * rMid + t * t * rBot;
    pts.push(new THREE.Vector2(Math.max(0.012, r), -t * len));
  }
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), material);
  return mesh;
}

function sphere(r, material) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), material);
}

function buildRig(material, jointMat) {
  const joints = {};
  const nodes = {};
  const root = new THREE.Group();

  const markers = [];
  const marker = (parent, key, r = 0.032) => {
    const m = sphere(r, jointMat);
    parent.add(m);
    markers.push(m);
    joints[key] = parent;
    return m;
  };

  // ---- pelvis / hips ----
  const hips = new THREE.Group();
  root.add(hips);
  const pelvis = muscleSegment(0.16, 0.14, 0.145, 0.125, material);
  pelvis.scale.z = 0.72;
  pelvis.position.y = 0.02;
  hips.add(pelvis);
  nodes.hip = hips;

  // ---- spine / torso ----
  const spine = new THREE.Group();
  spine.position.set(0, 0.02, 0);
  hips.add(spine);
  nodes.spine = spine;
  // torso swells at the ribcage and narrows at the waist
  const torso = muscleSegment(0.5, 0.185, 0.135, 0.128, material);
  torso.position.y = 0.5;
  torso.scale.z = 0.68;
  spine.add(torso);
  // lat / shoulder yoke
  const yoke = sphere(0.15, material);
  yoke.scale.set(1.32, 0.62, 0.72);
  yoke.position.y = 0.47;
  spine.add(yoke);

  const chest = new THREE.Group();
  chest.position.set(0, 0.5, 0);
  spine.add(chest);
  nodes.chest = chest;

  // ---- neck + head ----
  const head = new THREE.Group();
  head.position.set(0, 0.05, 0);
  chest.add(head);
  nodes.head = head;
  const neck = muscleSegment(0.09, 0.052, 0.05, 0.055, material);
  head.add(neck);
  const skull = sphere(0.115, material);
  skull.scale.set(0.9, 1.05, 0.98);
  skull.position.y = 0.19;
  head.add(skull);

  // ---- arms ----
  for (const side of [-1, 1]) {
    const key = side < 0 ? "L" : "R";
    const sh = new THREE.Group();
    sh.position.set(0.185 * side, 0.02, 0);
    chest.add(sh);
    nodes["shoulder" + key] = sh;
    const delt = sphere(0.072, material);
    delt.scale.set(1, 0.95, 0.95);
    sh.add(delt);
    marker(sh, "shoulder" + key, 0.034);
    // upper arm: biceps belly
    sh.add(muscleSegment(0.29, 0.062, 0.068, 0.048, material));

    const el = new THREE.Group();
    el.position.set(0, -0.29, 0);
    sh.add(el);
    nodes["elbow" + key] = el;
    marker(el, "elbow" + key, 0.029);
    // forearm: tapers to the wrist
    el.add(muscleSegment(0.27, 0.052, 0.05, 0.032, material));

    const wr = new THREE.Group();
    wr.position.set(0, -0.27, 0);
    el.add(wr);
    nodes["wrist" + key] = wr;
    const hand = sphere(0.052, material);
    hand.scale.set(0.85, 1.15, 0.55);
    hand.position.y = -0.035;
    wr.add(hand);
  }

  // ---- legs ----
  for (const side of [-1, 1]) {
    const key = side < 0 ? "L" : "R";
    const th = new THREE.Group();
    th.position.set(0.093 * side, -0.1, 0);
    hips.add(th);
    nodes["thigh" + key] = th;
    marker(th, "hip" + key, 0.034);
    // quad: thick at the top, narrowing to the knee
    th.add(muscleSegment(0.42, 0.098, 0.092, 0.062, material));

    const kn = new THREE.Group();
    kn.position.set(0, -0.42, 0);
    th.add(kn);
    nodes["knee" + key] = kn;
    marker(kn, "knee" + key, 0.031);
    // calf: belly high, tapering to the ankle
    kn.add(muscleSegment(0.42, 0.072, 0.078, 0.038, material));

    const an = new THREE.Group();
    an.position.set(0, -0.42, 0);
    kn.add(an);
    nodes["ankle" + key] = an;
    const foot = muscleSegment(0.19, 0.055, 0.05, 0.032, material);
    foot.rotation.x = deg(-90);
    foot.position.y = -0.025;
    an.add(foot);
  }

  return { root, hips, nodes, markers };
}

/* Curved orange contour lines behind the figure — the "scan field" backdrop. */
function buildBackdrop() {
  const g = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.22 });
  for (let i = 0; i < 14; i++) {
    const pts = [];
    const amp = 0.16 + i * 0.03;
    const yBase = -0.2 + i * 0.16;
    for (let x = -2.2; x <= 2.2; x += 0.12) {
      pts.push(new THREE.Vector3(x, yBase + Math.sin(x * 0.9 + i * 0.5) * amp * 0.4, -1.3 + Math.cos(x * 0.5) * 0.18));
    }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
  }
  return g;
}

/* Floor grid so the figure is visibly planted, and the pull-up bar. */
function buildStage(withBar) {
  const g = new THREE.Group();
  const grid = new THREE.GridHelper(4.4, 18, ACCENT, 0x3a3a42);
  grid.material.transparent = true;
  grid.material.opacity = 0.2;
  g.add(grid);
  if (withBar) {
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 1.5, 16),
      new THREE.MeshStandardMaterial({ color: 0x9aa0aa, roughness: 0.35, metalness: 0.7 })
    );
    bar.rotation.z = Math.PI / 2;
    bar.position.y = BAR_Y;
    g.add(bar);
  }
  return g;
}

/* ---------------- pose application ---------------- */
const lerp = (a, b, t) => a + (b - a) * t;

/* Rotation conventions (all sagittal, about local X):
   limbs rest pointing down local -Y.
     shoulder  +v swings the upper arm FORWARD (+Z), 180 = straight overhead
     elbow     +v flexes (hand travels forward/up, never behind the body)
     hip       +v flexes the thigh forward
     knee      +v flexes (heel toward the glutes)
   Feet are kept level with the floor automatically when `footFlat` is set, so a
   squat's shin can lean without the sole clipping through the ground.        */
function applyPose(rig, conf, t) {
  const { nodes, root } = rig;
  const A = conf.A, B = conf.B;
  const v = (k) => lerp(A[k] ?? 0, B[k] ?? 0, t);

  const spread = conf.armSpread ?? 6;
  const shoulderRot = deg(-v("shoulder"));
  const elbowRot = deg(-v("elbow"));

  for (const side of [-1, 1]) {
    const key = side < 0 ? "L" : "R";
    nodes["shoulder" + key].rotation.set(shoulderRot, 0, deg(spread * -side));
    nodes["elbow" + key].rotation.set(elbowRot, 0, 0);
    nodes["wrist" + key].rotation.set(0, 0, 0);
  }

  const setLeg = (key, hipDeg, kneeDeg, ankleDeg) => {
    const th = deg(-hipDeg);
    const kn = deg(kneeDeg);
    nodes["thigh" + key].rotation.set(th, 0, 0);
    nodes["knee" + key].rotation.set(kn, 0, 0);
    // keep the sole flat unless an explicit ankle angle is given
    nodes["ankle" + key].rotation.set(ankleDeg == null ? -(th + kn) : deg(ankleDeg), 0, 0);
  };

  if (conf.splitPose) {
    const s = v("split");
    const sp = conf.splitPose;
    setLeg("L", sp.frontHip * s, sp.frontKnee * s, null);
    setLeg("R", sp.backHip * s, sp.backKnee * s, sp.backAnkle * s);
  } else {
    const hip = v("hip");
    const knee = v("knee");
    const ankle = conf.footFlat ? null : (A.ankle ?? 0) === 0 && (B.ankle ?? 0) === 0 ? 0 : v("ankle");
    setLeg("L", hip, knee, ankle);
    setLeg("R", hip, knee, ankle);
  }

  nodes.spine.rotation.set(deg(v("spine")), 0, 0);
  nodes.head.rotation.set(deg(v("head")), 0, 0);

  const ra = A.root, rb = B.root;
  const rp = ra.p || [0, 0, 0], bp = rb.p || [0, 0, 0];
  root.position.set(lerp(rp[0], bp[0], t), lerp(rp[1], bp[1], t), lerp(rp[2], bp[2], t));
  root.rotation.set(deg(lerp(ra.r[0], rb.r[0], t)), deg(lerp(ra.r[1], rb.r[1], t)), deg(lerp(ra.r[2], rb.r[2], t)));
}

/* Anchor the figure to the world so it never floats: either the lowest contact
   point sits on the floor, or the hands stay fixed on the pull-up bar. */
const _p = new THREE.Vector3();
const CONTACTS = [
  ["ankleL", 0.075], ["ankleR", 0.075],
  ["wristL", 0.07], ["wristR", 0.07],
  ["elbowL", 0.05], ["elbowR", 0.05],
  ["kneeL", 0.06], ["kneeR", 0.06],
];

function anchorFigure(rig, conf) {
  const { nodes, root } = rig;
  root.updateMatrixWorld(true);
  if (conf.anchor === "bar") {
    let maxY = -Infinity;
    for (const k of ["wristL", "wristR"]) {
      nodes[k].getWorldPosition(_p);
      if (_p.y > maxY) maxY = _p.y;
    }
    root.position.y += BAR_Y - maxY;
  } else {
    let minY = Infinity;
    for (const [k, r] of CONTACTS) {
      nodes[k].getWorldPosition(_p);
      const y = _p.y - r;
      if (y < minY) minY = y;
    }
    root.position.y -= minY;
  }
  root.updateMatrixWorld(true);
}

/* ---------------- live angle measurement ---------------- */
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
const _u = new THREE.Vector3(), _w = new THREE.Vector3();

function angleBetween(A, B, C) {
  A.getWorldPosition(_a);
  B.getWorldPosition(_b);
  C.getWorldPosition(_c);
  _u.subVectors(_a, _b).normalize();
  _w.subVectors(_c, _b).normalize();
  return Math.round((Math.acos(Math.min(1, Math.max(-1, _u.dot(_w)))) * 180) / Math.PI);
}

const ANGLE_ROWS = {
  pushup: ["shoulder", "elbow", "bodyLine", "hip", "wrist"],
  plank: ["shoulder", "elbow", "bodyLine", "hip", "knee"],
  squat: ["knee", "hip", "backAngle", "ankle", "shoulder"],
  "bicep-curl": ["elbow", "shoulder", "backAngle", "wrist", "hip"],
  "pull-up": ["elbow", "shoulder", "bodyLine", "hip", "knee"],
  lunge: ["knee", "hip", "backAngle", "backKnee", "shoulder"],
};

function measure(nodes, key) {
  switch (key) {
    case "elbow": return angleBetween(nodes.shoulderL, nodes.elbowL, nodes.wristL);
    case "shoulder": return angleBetween(nodes.elbowL, nodes.shoulderL, nodes.hip);
    case "knee": return angleBetween(nodes.thighL, nodes.kneeL, nodes.ankleL);
    case "backKnee": return angleBetween(nodes.thighR, nodes.kneeR, nodes.ankleR);
    case "hip": return angleBetween(nodes.chest, nodes.thighL, nodes.kneeL);
    case "bodyLine": return angleBetween(nodes.chest, nodes.hip, nodes.kneeL);
    case "backAngle": return angleBetween(nodes.head, nodes.chest, nodes.hip);
    case "ankle": return angleBetween(nodes.kneeL, nodes.ankleL, nodes.wristL);
    case "wrist": return angleBetween(nodes.elbowL, nodes.wristL, nodes.hip);
    default: return 0;
  }
}

export default function Mannequin3D({ exercise, className = "", frozenT }) {
  const { t } = useI18n();
  const mountRef = useRef(null);
  const [angles, setAngles] = useState([]);

  useEffect(() => {
    const conf = POSES[exercise.id] || POSES[exercise.detection?.formKey] || POSES.squat;
    const rows = ANGLE_ROWS[exercise.id] || ANGLE_ROWS.squat;
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 320;
    const height = mount.clientHeight || 320;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    const cam = conf.cam || { target: [0, 0.05, 0], dist: 3.2 };
    camera.position.set(cam.dist * 0.62, cam.target[1] + 0.45, cam.dist * 0.78);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // Anatomical model look: cool grey body, warm orange rim from behind.
    const bodyMat = new THREE.MeshStandardMaterial({
      color: BODY_COLOR, roughness: 0.42, metalness: 0.28,
      emissive: 0x120a06, emissiveIntensity: 1,
    });
    const jointMat = new THREE.MeshStandardMaterial({
      color: ACCENT, emissive: ACCENT, emissiveIntensity: 1.7, roughness: 0.3, metalness: 0,
    });

    scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x120c08, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(2.4, 3.2, 2.6);
    scene.add(key);
    const rimA = new THREE.DirectionalLight(0xff6a1f, 2.1);
    rimA.position.set(-2.6, 1.2, -2.2);
    scene.add(rimA);
    const rimB = new THREE.DirectionalLight(0xff9a4d, 1.1);
    rimB.position.set(2.4, 0.4, -2.4);
    scene.add(rimB);
    const fill = new THREE.DirectionalLight(0x6688cc, 0.35);
    fill.position.set(-2, 0.5, 2.4);
    scene.add(fill);

    const rig = buildRig(bodyMat, jointMat);
    scene.add(rig.root);
    scene.add(buildBackdrop());
    scene.add(buildStage(conf.anchor === "bar"));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 1.9;
    controls.maxDistance = 5;
    controls.target.set(cam.target[0], cam.target[1], cam.target[2]);
    controls.autoRotate = frozenT === undefined;
    controls.autoRotateSpeed = 0.9;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let startTs;
    let lastPush = 0;
    const period = conf.hold ? 3600 : 2900;

    const render = (ts) => {
      raf = requestAnimationFrame(render);
      if (!startTs) startTs = ts;
      let tt;
      if (frozenT !== undefined) {
        tt = frozenT;
      } else if (reduce) {
        tt = 0.55;
      } else {
        const p = ((ts - startTs) % period) / period;
        tt = (1 - Math.cos(p * 2 * Math.PI)) / 2;
        if (conf.hold) tt *= 0.35;
      }
      applyPose(rig, conf, tt);
      anchorFigure(rig, conf);
      controls.update();
      renderer.render(scene, camera);

      if (ts - lastPush > 120) {
        lastPush = ts;
        setAngles(rows.map((r) => ({ key: r, value: measure(rig.nodes, r) })));
      }
    };

    let idleTimer;
    const onStart = () => { controls.autoRotate = false; clearTimeout(idleTimer); };
    const onEnd = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { controls.autoRotate = true; }, 2800);
    };
    controls.addEventListener("start", onStart);
    controls.addEventListener("end", onEnd);

    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(idleTimer);
      ro.disconnect();
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end", onEnd);
      controls.dispose();
      renderer.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, [exercise.id, exercise.detection, frozenT]);

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#141210] to-[#080808] ${className}`}>
      <div className="flex h-full w-full">
        {/* live joint-angle readout, measured off the model */}
        <div className="flex w-[38%] max-w-[9.5rem] shrink-0 flex-col justify-center gap-px border-r border-white/10">
          {angles.map((a) => (
            <div key={a.key} className="px-3 py-1.5">
              <div className="text-[0.62rem] font-semibold leading-tight text-accent-strong">{t(`coach.angle.${a.key}`)}</div>
              <div className="font-display text-[1.05rem] font-extrabold leading-tight text-white">{a.value}°</div>
            </div>
          ))}
        </div>
        <div ref={mountRef} className="h-full flex-1 cursor-grab active:cursor-grabbing" />
      </div>
      <div className="pointer-events-none absolute bottom-2.5 right-3 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[0.68rem] font-semibold text-white/65 backdrop-blur">
        <Rotate3d className="h-3.5 w-3.5" /> {t("coach.dragRotate")}
      </div>
    </div>
  );
}
