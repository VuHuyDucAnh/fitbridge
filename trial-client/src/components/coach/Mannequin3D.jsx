import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Rotate3d } from "lucide-react";
import { useI18n } from "../../i18n/LanguageContext";

/* A solid 3D human mannequin that performs the selected exercise and can be
   orbited (drag to rotate the camera around it). Built from Three.js primitives
   — no external model files — so it works offline and on every machine. */

const SKIN = 0xd8c2ad;
const SKIN_DARK = 0xc2a98f;
const ZERO = [0, 0, 0];
const lerp = (a, b, t) => a + (b - a) * t;

// Bones that can be rotated, with their default (rest / standing) euler.
const BONE_NAMES = ["spine", "chest", "head", "shoulderL", "shoulderR", "elbowL", "elbowR", "thighL", "thighR", "kneeL", "kneeR"];

/* Per-exercise keyframes. Each pose has bone eulers (radians, mostly sagittal X)
   plus a root transform {p:[x,y,z], r:[x,y,z]}. A = start, B = bottom. */
const POSES = {
  squat: {
    A: { _root: { p: [0, 0, 0], r: [0, 0, 0] } },
    B: {
      _root: { p: [0, -0.34, 0], r: [0, 0, 0] },
      spine: [0.42, 0, 0], thighL: [1.5, 0, 0], thighR: [1.5, 0, 0],
      kneeL: [-1.7, 0, 0], kneeR: [-1.7, 0, 0],
      shoulderL: [1.5, 0, 0.15], shoulderR: [1.5, 0, -0.15], elbowL: [-0.2, 0, 0], elbowR: [-0.2, 0, 0],
    },
  },
  pushup: {
    A: {
      _root: { p: [0, -0.15, 0.15], r: [1.42, 0, 0] },
      shoulderL: [1.55, 0, 0.1], shoulderR: [1.55, 0, -0.1], head: [-0.5, 0, 0],
    },
    B: {
      _root: { p: [0, -0.32, 0.15], r: [1.42, 0, 0] },
      shoulderL: [1.2, 0, 0.35], shoulderR: [1.2, 0, -0.35], elbowL: [-1.3, 0, 0], elbowR: [-1.3, 0, 0], head: [-0.5, 0, 0],
    },
  },
  plank: {
    A: {
      _root: { p: [0, -0.2, 0.1], r: [1.45, 0, 0] },
      shoulderL: [1.55, 0, 0.15], shoulderR: [1.55, 0, -0.15], elbowL: [-1.55, 0, 0], elbowR: [-1.55, 0, 0], head: [-0.55, 0, 0],
    },
    B: {
      _root: { p: [0, -0.22, 0.1], r: [1.45, 0, 0] },
      shoulderL: [1.55, 0, 0.15], shoulderR: [1.55, 0, -0.15], elbowL: [-1.55, 0, 0], elbowR: [-1.55, 0, 0], head: [-0.55, 0, 0],
    },
    hold: true,
  },
  "bicep-curl": {
    A: { _root: { p: [0, 0, 0], r: [0, 0, 0] }, shoulderL: [0.05, 0, 0.08], shoulderR: [0.05, 0, -0.08] },
    B: {
      _root: { p: [0, 0, 0], r: [0, 0, 0] },
      shoulderL: [0.1, 0, 0.08], shoulderR: [0.1, 0, -0.08], elbowL: [-2.6, 0, 0], elbowR: [-2.6, 0, 0],
    },
  },
  "pull-up": {
    A: {
      _root: { p: [0, -0.12, 0], r: [0, 0, 0] },
      shoulderL: [-2.85, 0, 0.12], shoulderR: [-2.85, 0, -0.12], elbowL: [-0.25, 0, 0], elbowR: [-0.25, 0, 0],
    },
    B: {
      _root: { p: [0, 0.16, 0], r: [0, 0, 0] },
      shoulderL: [-2.7, 0, 0.2], shoulderR: [-2.7, 0, -0.2], elbowL: [-2.2, 0, 0], elbowR: [-2.2, 0, 0],
    },
  },
  lunge: {
    A: { _root: { p: [0, 0, 0], r: [0, 0, 0] } },
    B: {
      _root: { p: [0, -0.26, 0], r: [0, 0, 0] },
      thighL: [1.2, 0, 0], kneeL: [-1.5, 0, 0],
      thighR: [-0.55, 0, 0], kneeR: [-1.15, 0, 0],
      spine: [0.12, 0, 0], shoulderL: [0.1, 0, 0.1], shoulderR: [0.1, 0, -0.1],
    },
  },
};

function limb(len, radius, color) {
  const geo = new THREE.CapsuleGeometry(radius, Math.max(0.02, len - radius * 2), 6, 14);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.04 }));
  mesh.position.y = -len / 2;
  return mesh;
}
function ball(r, color) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), new THREE.MeshStandardMaterial({ color, roughness: 0.72 }));
}

function buildRig() {
  const bones = {};
  const root = new THREE.Group();
  const hips = new THREE.Group();
  root.add(hips);
  hips.add(ball(0.12, SKIN_DARK)); // pelvis

  // torso / spine
  const spine = new THREE.Group(); spine.position.set(0, 0.04, 0); hips.add(spine); bones.spine = spine;
  const torso = limb(0.52, 0.135, SKIN); torso.position.y = 0.26; torso.scale.z = 0.72; spine.add(torso);

  const chest = new THREE.Group(); chest.position.set(0, 0.5, 0); spine.add(chest); bones.chest = chest;
  chest.add((() => { const m = ball(0.14, SKIN); m.scale.set(1.1, 0.8, 0.7); m.position.y = -0.04; return m; })());

  const head = new THREE.Group(); head.position.set(0, 0.1, 0); chest.add(head); bones.head = head;
  const neck = limb(0.1, 0.045, SKIN_DARK); head.add(neck);
  const skull = ball(0.13, SKIN); skull.position.y = 0.2; skull.scale.set(0.9, 1, 0.95); head.add(skull);

  // arms
  for (const side of [-1, 1]) {
    const key = side < 0 ? "L" : "R";
    const sh = new THREE.Group(); sh.position.set(0.2 * side, 0.02, 0); chest.add(sh); bones["shoulder" + key] = sh;
    sh.add(ball(0.06, SKIN_DARK));
    sh.add(limb(0.3, 0.058, SKIN));
    const el = new THREE.Group(); el.position.set(0, -0.3, 0); sh.add(el); bones["elbow" + key] = el;
    el.add(ball(0.05, SKIN_DARK));
    el.add(limb(0.3, 0.05, SKIN));
    const hand = ball(0.06, SKIN_DARK); hand.position.y = -0.3; el.add(hand);
  }

  // legs
  for (const side of [-1, 1]) {
    const key = side < 0 ? "L" : "R";
    const th = new THREE.Group(); th.position.set(0.1 * side, -0.05, 0); hips.add(th); bones["thigh" + key] = th;
    th.add(ball(0.07, SKIN_DARK));
    th.add(limb(0.44, 0.07, SKIN));
    const kn = new THREE.Group(); kn.position.set(0, -0.44, 0); th.add(kn); bones["knee" + key] = kn;
    kn.add(ball(0.06, SKIN_DARK));
    kn.add(limb(0.44, 0.06, SKIN));
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.2), new THREE.MeshStandardMaterial({ color: SKIN_DARK, roughness: 0.8 }));
    foot.position.set(0, -0.45, 0.06); kn.add(foot);
  }

  return { root, bones };
}

function applyPose(bones, root, conf, t) {
  const A = conf.A, B = conf.B;
  for (const name of BONE_NAMES) {
    const a = A[name] || ZERO;
    const b = B[name] || ZERO;
    bones[name].rotation.set(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
  }
  const ra = A._root, rb = B._root;
  root.position.set(lerp(ra.p[0], rb.p[0], t), lerp(ra.p[1], rb.p[1], t), lerp(ra.p[2], rb.p[2], t));
  root.rotation.set(lerp(ra.r[0], rb.r[0], t), lerp(ra.r[1], rb.r[1], t), lerp(ra.r[2], rb.r[2], t));
}

export default function Mannequin3D({ exercise, className = "" }) {
  const { t } = useI18n();
  const mountRef = useRef(null);

  useEffect(() => {
    const conf = POSES[exercise.id] || POSES[exercise.detection?.formKey] || POSES.squat;
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 320;
    const height = mount.clientHeight || 320;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(2.1, 0.5, 2.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // lights
    scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2320, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(2.5, 4, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff8a3d, 0.5);
    rim.position.set(-3, 1, -2);
    scene.add(rim);

    const { root, bones } = buildRig();
    scene.add(root);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 1.8;
    controls.maxDistance = 4.5;
    controls.target.set(0, 0.15, 0);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.1;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let startTs;
    const period = conf.hold ? 3400 : 2700;

    const render = (ts) => {
      raf = requestAnimationFrame(render);
      if (!startTs) startTs = ts;
      let tt = 0.5;
      if (!reduce) {
        const p = ((ts - startTs) % period) / period;
        tt = (1 - Math.cos(p * 2 * Math.PI)) / 2;
        if (conf.hold) tt *= 0.4;
      }
      applyPose(bones, root, conf, tt);
      // pause auto-rotate while the user is dragging
      controls.update();
      renderer.render(scene, camera);
    };
    // stop auto-rotate on interaction, resume after idle
    let idleTimer;
    const onStart = () => {
      controls.autoRotate = false;
      clearTimeout(idleTimer);
    };
    const onEnd = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => (controls.autoRotate = true), 2500);
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
  }, [exercise.id, exercise.detection]);

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#15130f] to-[#0a0a0a] ${className}`}>
      <div ref={mountRef} className="h-full w-full cursor-grab active:cursor-grabbing" />
      <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-[0.72rem] font-semibold text-white/70 backdrop-blur">
        <Rotate3d className="h-3.5 w-3.5" /> {t("coach.dragRotate")}
      </div>
    </div>
  );
}
