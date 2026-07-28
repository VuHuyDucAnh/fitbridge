import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Rotate3d } from "lucide-react";
import { useI18n } from "../../i18n/LanguageContext";
import { repDrive, drivenAt, repDriveKinematics, solveTwoBone } from "../../lib/motion3d";

/* An anatomical 3D figure that performs the selected exercise with textbook
   form, orbitable by dragging.

   Motion is driven by lib/motion3d: a phased rep curve (slow gravity-loaded
   descent → loaded pause → explosive drive → overshoot and damped settle),
   per-joint time lag so the body moves as a kinematic chain from the pelvis
   outward, and two-bone IK that pins the planted foot / hand so the pelvis can
   travel on an arc without the contacts sliding.

   Form targets come from published technique guidance:
     push-up  — one straight line ankle→head, elbows tucked (not flared), lower
                to ~90° elbow, hands stacked under the shoulders
     squat    — break parallel (hips below knee), neutral spine, hips travel
                back before they travel down, knees tracking over the toes
     curl     — upper arm pinned vertical, full extension → full flexion
     pull-up  — dead hang with near-straight elbows → chin over the bar
     lunge    — ~90° at the front hip, front knee and back knee, knee over ankle
     plank    — elbows stacked under the shoulders, hip line straight          */

const deg = (d) => (d * Math.PI) / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

const BODY_COLOR = 0x7c7f88;
const ACCENT = 0xff6a1f;
const BAR_Y = 1.35;

// Segment lengths — the IK solver needs these to match the built mesh.
const THIGH = 0.42, SHANK = 0.42, UPPER_ARM = 0.29, FOREARM = 0.27;

/* Per-joint lag in 60fps frames. The pelvis leads; hands and feet trail by the
   2–4 frames that give a body its follow-through. */
const LAG = { hips: 0, spine: 1.5, chest: 2.5, head: 3.5, shoulder: 2, elbow: 3.5, wrist: 4.5 };

/* ---------------- motion specs ---------------- */
const MOTION = {
  squat: {
    kind: "grounded",
    period: 3000,
    // Hips travel back and down on an arc — "sit back", not "drop straight".
    hips: { drop: 0.34, back: 0.17, lead: 2.5 },
    spine: [3, 30], head: [0, -10],
    arms: { shoulder: [6, 74], elbow: [5, 20] },
    legBend: 1,
    cam: { target: [0, 0.82, 0], dist: 3.9 },
  },
  lunge: {
    kind: "grounded",
    period: 3100,
    hips: { drop: 0.30, back: 0.02, lead: 2 },
    spine: [3, 10], head: [0, -4],
    arms: { shoulder: [5, 12], elbow: [5, 14] },
    legBend: 1,
    stance: { front: 0.34, back: -0.36, backLift: 0.17 },
    cam: { target: [0, 0.78, 0], dist: 3.9 },
  },
  "bicep-curl": {
    kind: "grounded",
    period: 2500,
    hips: { drop: 0.012, back: 0, lead: 0 }, // tiny bodyweight shift only
    spine: [2, -3], head: [0, 2],
    arms: { shoulder: [2, 7], elbow: [4, 140] },
    legBend: 1,
    cam: { target: [0, 0.88, 0], dist: 3.8 },
  },
  pushup: {
    kind: "prone",
    period: 2800,
    baseRot: 90,
    pivot: 14,            // the body rotates about the toes as it lowers
    spine: [0, 1.5], head: [-30, -22],
    armBend: -1,
    cam: { target: [0, 0.42, 0], dist: 3.0 },
  },
  plank: {
    kind: "prone",
    period: 4200,
    baseRot: 90,
    pivot: 1.6,           // a brace, not a rep: breathing only
    spine: [0, 0.8], head: [-30, -28],
    armBend: -1,
    hold: true,
    fkArms: { shoulder: 90, elbow: 90 },
    cam: { target: [0, 0.4, 0], dist: 3.0 },
  },
  "pull-up": {
    kind: "hang",
    period: 3200,
    lift: 0.32,
    spine: [0, -5], head: [0, 5],
    legs: { hip: [-8, -12], knee: [30, 34] },
    armBend: -1,
    cam: { target: [0, 0.72, 0], dist: 4.0 },
  },
};

/* ---------------- geometry ---------------- */

// A tapered "muscle" segment: lathe profile that swells at the belly.
function muscleSegment(len, rTop, rMid, rBot, material) {
  const pts = [];
  const N = 14;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const r = (1 - t) * (1 - t) * rTop + 2 * (1 - t) * t * rMid + t * t * rBot;
    pts.push(new THREE.Vector2(Math.max(0.012, r), -t * len));
  }
  return new THREE.Mesh(new THREE.LatheGeometry(pts, 24), material);
}

function sphere(r, material) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), material);
}

function buildRig(material, jointMat) {
  const nodes = {};
  const root = new THREE.Group();

  const marker = (parent, r) => parent.add(sphere(r, jointMat));

  const hips = new THREE.Group();
  root.add(hips);
  const pelvis = muscleSegment(0.16, 0.14, 0.145, 0.125, material);
  pelvis.scale.z = 0.72;
  pelvis.position.y = 0.02;
  hips.add(pelvis);
  nodes.hip = hips;

  const spine = new THREE.Group();
  spine.position.set(0, 0.02, 0);
  hips.add(spine);
  nodes.spine = spine;
  const torso = muscleSegment(0.5, 0.185, 0.135, 0.128, material);
  torso.position.y = 0.5;
  torso.scale.z = 0.68;
  spine.add(torso);
  const yoke = sphere(0.15, material);
  yoke.scale.set(1.32, 0.62, 0.72);
  yoke.position.y = 0.47;
  spine.add(yoke);

  const chest = new THREE.Group();
  chest.position.set(0, 0.5, 0);
  spine.add(chest);
  nodes.chest = chest;

  const head = new THREE.Group();
  head.position.set(0, 0.05, 0);
  chest.add(head);
  nodes.head = head;
  head.add(muscleSegment(0.09, 0.052, 0.05, 0.055, material));
  const skull = sphere(0.115, material);
  skull.scale.set(0.9, 1.05, 0.98);
  skull.position.y = 0.19;
  head.add(skull);

  for (const side of [-1, 1]) {
    const key = side < 0 ? "L" : "R";
    const sh = new THREE.Group();
    sh.position.set(0.185 * side, 0.02, 0);
    chest.add(sh);
    nodes["shoulder" + key] = sh;
    const delt = sphere(0.072, material);
    delt.scale.set(1, 0.95, 0.95);
    sh.add(delt);
    marker(sh, 0.034);
    sh.add(muscleSegment(UPPER_ARM, 0.062, 0.068, 0.048, material));

    const el = new THREE.Group();
    el.position.set(0, -UPPER_ARM, 0);
    sh.add(el);
    nodes["elbow" + key] = el;
    marker(el, 0.029);
    el.add(muscleSegment(FOREARM, 0.052, 0.05, 0.032, material));

    const wr = new THREE.Group();
    wr.position.set(0, -FOREARM, 0);
    el.add(wr);
    nodes["wrist" + key] = wr;
    const hand = sphere(0.052, material);
    hand.scale.set(0.85, 1.15, 0.55);
    hand.position.y = -0.035;
    wr.add(hand);
  }

  for (const side of [-1, 1]) {
    const key = side < 0 ? "L" : "R";
    const th = new THREE.Group();
    th.position.set(0.093 * side, -0.1, 0);
    hips.add(th);
    nodes["thigh" + key] = th;
    marker(th, 0.034);
    th.add(muscleSegment(THIGH, 0.098, 0.092, 0.062, material));

    const kn = new THREE.Group();
    kn.position.set(0, -THIGH, 0);
    th.add(kn);
    nodes["knee" + key] = kn;
    marker(kn, 0.031);
    kn.add(muscleSegment(SHANK, 0.072, 0.078, 0.038, material));

    const an = new THREE.Group();
    an.position.set(0, -SHANK, 0);
    kn.add(an);
    nodes["ankle" + key] = an;
    const foot = muscleSegment(0.19, 0.055, 0.05, 0.032, material);
    foot.rotation.x = deg(-90);
    foot.position.y = -0.025;
    an.add(foot);
  }

  return { root, nodes };
}

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

/* ---------------- posing ---------------- */
const _v = new THREE.Vector3();
const _t = new THREE.Vector3();

// Straight-limb rest pose used to capture where the contacts belong.
function restPose(nodes, m) {
  const armTop = m.fkArms ? m.fkArms.shoulder : m.arms ? m.arms.shoulder[0] : 0;
  const elbowTop = m.fkArms ? m.fkArms.elbow : m.arms ? m.arms.elbow[0] : 0;
  for (const key of ["L", "R"]) {
    nodes["shoulder" + key].rotation.set(deg(-armTop), 0, 0);
    nodes["elbow" + key].rotation.set(deg(-elbowTop), 0, 0);
    nodes["thigh" + key].rotation.set(0, 0, 0);
    nodes["knee" + key].rotation.set(0, 0, 0);
    nodes["ankle" + key].rotation.set(0, 0, 0);
  }
  nodes.spine.rotation.set(0, 0, 0);
  nodes.head.rotation.set(0, 0, 0);
}

// Solve a limb so its end effector sits on `targetWorld`.
function ikChain(parent, joint, jointChild, targetWorld, l1, l2, bend) {
  _t.copy(targetWorld);
  parent.worldToLocal(_t);
  const s = solveTwoBone(joint.position.y, joint.position.z, _t.y, _t.z, l1, l2, bend);
  joint.rotation.x = s.rot1;
  jointChild.rotation.x = s.rot2;
}

export default function Mannequin3D({ exercise, className = "", frozenT }) {
  const { t } = useI18n();
  const mountRef = useRef(null);
  const [angles, setAngles] = useState([]);

  useEffect(() => {
    const m = MOTION[exercise.id] || MOTION[exercise.detection?.formKey] || MOTION.squat;
    const rows = ANGLE_ROWS[exercise.id] || ANGLE_ROWS.squat;
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 320;
    const height = mount.clientHeight || 320;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    const cam = m.cam;
    camera.position.set(cam.dist * 0.62, cam.target[1] + 0.45, cam.dist * 0.78);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: BODY_COLOR, roughness: 0.42, metalness: 0.28, emissive: 0x120a06,
    });
    const jointMat = new THREE.MeshStandardMaterial({
      color: ACCENT, emissive: ACCENT, emissiveIntensity: 1.7, roughness: 0.3,
    });

    scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x120c08, 0.55));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
    keyLight.position.set(2.4, 3.2, 2.6);
    scene.add(keyLight);
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
    const { root, nodes } = rig;
    scene.add(root);
    scene.add(buildBackdrop());
    scene.add(buildStage(m.kind === "hang"));

    /* ---- establish the contact targets the IK will pin to ---- */
    const footTarget = { L: new THREE.Vector3(), R: new THREE.Vector3() };
    const handTarget = { L: new THREE.Vector3(), R: new THREE.Vector3() };
    const ankleAnchor = { L: new THREE.Vector3(), R: new THREE.Vector3() };
    let baseY = 0;

    root.position.set(0, 0, 0);
    root.rotation.set(deg(m.baseRot || 0), 0, 0);
    restPose(nodes, m);
    root.updateMatrixWorld(true);

    if (m.kind === "grounded") {
      // drop the figure so the soles rest on the floor
      let minY = Infinity;
      for (const key of ["L", "R"]) {
        nodes["ankle" + key].getWorldPosition(_v);
        minY = Math.min(minY, _v.y - 0.075);
      }
      baseY = -minY;
      root.position.y = baseY;
      root.updateMatrixWorld(true);
      for (const key of ["L", "R"]) {
        nodes["ankle" + key].getWorldPosition(footTarget[key]);
      }
      if (m.stance) {
        // split stance: front foot forward, back foot behind and up on the toes
        footTarget.L.z += m.stance.front;
        footTarget.R.z += m.stance.back;
        footTarget.R.y += m.stance.backLift;
      }
    } else if (m.kind === "prone") {
      let minY = Infinity;
      for (const key of ["L", "R"]) {
        nodes["wrist" + key].getWorldPosition(_v);
        minY = Math.min(minY, _v.y - 0.07);
        nodes["ankle" + key].getWorldPosition(_v);
        minY = Math.min(minY, _v.y - 0.06);
      }
      baseY = -minY;
      root.position.y = baseY;
      root.updateMatrixWorld(true);
      for (const key of ["L", "R"]) {
        nodes["wrist" + key].getWorldPosition(handTarget[key]);
        nodes["ankle" + key].getWorldPosition(ankleAnchor[key]);
        // hands stack under the shoulders
        nodes["shoulder" + key].getWorldPosition(_v);
        handTarget[key].z = _v.z;
        handTarget[key].y = 0.07;
        if (m.forearmDown) handTarget[key].z = _v.z + 0.24; // forearm plank
      }
    } else {
      // hang: raise the figure until the hands meet the bar
      for (const key of ["L", "R"]) {
        nodes["shoulder" + key].rotation.set(deg(-172), 0, 0);
      }
      root.updateMatrixWorld(true);
      nodes.wristL.getWorldPosition(_v);
      baseY = BAR_Y - _v.y;
      root.position.y = baseY;
      root.updateMatrixWorld(true);
      for (const key of ["L", "R"]) {
        nodes["wrist" + key].getWorldPosition(handTarget[key]);
        handTarget[key].y = BAR_Y;
      }
    }

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
    const period = m.period;
    let raf = 0;
    let startTs;
    let lastPush = 0;

    const poseAt = (p, k) => {
      // Sample the drive once per joint group, each with its own lag, so the
      // motion travels outward from the pelvis instead of snapping in lockstep.
      const at = (lag) => drivenAt(p, lag, period, m);
      const tHips = at(LAG.hips);
      const tSpine = at(LAG.spine);
      const tHead = at(LAG.head);
      const tShoulder = at(LAG.shoulder);
      const tElbow = at(LAG.elbow);

      // Secondary motion: the torso compresses a touch when the body decelerates
      // under load, and drifts back as the weight settles.
      const inertia = clamp(-k.acceleration * 0.85, -3.2, 3.2);
      const breath = m.hold ? Math.sin(p * Math.PI * 2 * 2) * 0.9 : 0;

      nodes.spine.rotation.set(deg(lerp(m.spine[0], m.spine[1], tSpine) + inertia + breath), 0, 0);
      nodes.head.rotation.set(deg(lerp(m.head[0], m.head[1], tHead) - inertia * 0.5), 0, 0);

      if (m.kind === "grounded") {
        // Pelvis rides an arc: it travels back slightly ahead of travelling down.
        const tBack = drivenAt(p, LAG.hips - (m.hips.lead || 0), period, m);
        root.position.y = baseY - m.hips.drop * tHips;
        root.position.z = -m.hips.back * tBack;
        root.rotation.set(0, 0, 0);

        // Arms stay FK — they are not load-bearing here.
        const shoulder = lerp(m.arms.shoulder[0], m.arms.shoulder[1], tShoulder);
        const elbow = lerp(m.arms.elbow[0], m.arms.elbow[1], tElbow);
        for (const side of [-1, 1]) {
          const key = side < 0 ? "L" : "R";
          nodes["shoulder" + key].rotation.set(deg(-shoulder), 0, deg(6 * -side));
          nodes["elbow" + key].rotation.set(deg(-elbow), 0, 0);
        }
        root.updateMatrixWorld(true);

        // Legs are IK — the feet stay exactly where they were planted.
        for (const key of ["L", "R"]) {
          ikChain(nodes.hip, nodes["thigh" + key], nodes["knee" + key], footTarget[key], THIGH, SHANK, m.legBend);
        }
        root.updateMatrixWorld(true);
        for (const key of ["L", "R"]) {
          const th = nodes["thigh" + key].rotation.x;
          const kn = nodes["knee" + key].rotation.x;
          // keep the sole level with the floor (the back foot stays on its toes)
          nodes["ankle" + key].rotation.x =
            m.stance && key === "R" ? -(th + kn) + deg(38) : -(th + kn);
        }
      } else if (m.kind === "prone") {
        // The body pivots about the toes, then the arms solve to the planted hands.
        root.rotation.set(deg(m.baseRot + m.pivot * tHips), 0, 0);
        root.position.y = baseY;
        root.position.z = 0;
        for (const key of ["L", "R"]) {
          nodes["thigh" + key].rotation.set(0, 0, 0);
          nodes["knee" + key].rotation.set(deg(2), 0, 0);
          nodes["ankle" + key].rotation.set(0, 0, 0);
        }
        root.updateMatrixWorld(true);
        // pin the toes: translate the root so the ankle returns to its anchor
        nodes.ankleL.getWorldPosition(_v);
        root.position.add(_t.copy(ankleAnchor.L).sub(_v));
        root.updateMatrixWorld(true);
        if (m.fkArms) {
          for (const key of ["L", "R"]) {
            nodes["shoulder" + key].rotation.set(deg(-m.fkArms.shoulder), 0, deg(8 * (key === "L" ? 1 : -1)));
            nodes["elbow" + key].rotation.set(deg(-m.fkArms.elbow), 0, 0);
          }
        } else {
          for (const key of ["L", "R"]) {
            ikChain(nodes.chest, nodes["shoulder" + key], nodes["elbow" + key], handTarget[key], UPPER_ARM, FOREARM, m.armBend);
          }
        }
        root.updateMatrixWorld(true);
      } else {
        // hang: the body rises to the bar, arms solve to the fixed grip
        root.position.y = baseY + m.lift * tHips;
        root.position.z = 0;
        root.rotation.set(0, 0, 0);
        const hip = lerp(m.legs.hip[0], m.legs.hip[1], tSpine);
        const knee = lerp(m.legs.knee[0], m.legs.knee[1], tElbow);
        for (const key of ["L", "R"]) {
          nodes["thigh" + key].rotation.set(deg(-hip), 0, 0);
          nodes["knee" + key].rotation.set(deg(knee), 0, 0);
          nodes["ankle" + key].rotation.set(deg(-20), 0, 0);
        }
        root.updateMatrixWorld(true);
        for (const key of ["L", "R"]) {
          ikChain(nodes.chest, nodes["shoulder" + key], nodes["elbow" + key], handTarget[key], UPPER_ARM, FOREARM, m.armBend);
        }
        root.updateMatrixWorld(true);
      }
    };

    const render = (ts) => {
      raf = requestAnimationFrame(render);
      if (!startTs) startTs = ts;
      let p;
      if (frozenT !== undefined) p = frozenT;
      else if (reduce) p = 0.34;
      else p = ((ts - startTs) % period) / period;

      const k = frozenT !== undefined || reduce
        ? { value: repDrive(p, m), velocity: 0, acceleration: 0 }
        : repDriveKinematics(p, period, m);

      poseAt(p, k);
      controls.update();
      renderer.render(scene, camera);

      if (ts - lastPush > 120) {
        lastPush = ts;
        setAngles(rows.map((r) => ({ key: r, value: measure(nodes, r) })));
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

/* ---------------- live angle measurement ---------------- */
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
const _u = new THREE.Vector3(), _w = new THREE.Vector3();

function angleBetween(A, B, C) {
  A.getWorldPosition(_a);
  B.getWorldPosition(_b);
  C.getWorldPosition(_c);
  _u.subVectors(_a, _b).normalize();
  _w.subVectors(_c, _b).normalize();
  return Math.round((Math.acos(clamp(_u.dot(_w), -1, 1)) * 180) / Math.PI);
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
