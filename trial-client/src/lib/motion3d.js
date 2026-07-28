/* Motion engine for the 3D exercise figure.

   A rep is NOT a symmetric sine wave — that is what makes CG lifting look
   robotic. A real rep is phased and asymmetric:

     eccentric   unweight slowly, gravity accelerates the descent, then the
                 muscles decelerate to "catch" the load at the bottom
     bottom      a brief loaded pause (no bounce)
     concentric  explosive drive out of the hole, decelerating into lockout
     settle      the joints overshoot the end position slightly, then damp
                 back onto it (weight arriving)

   Everything downstream (per-joint lag, secondary motion) is derived from this
   one drive signal and its derivatives, so the whole body stays coherent. */

export const DEFAULT_TIMING = { ecc: 0.40, bottom: 0.07, con: 0.28 };

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const smooth = (x) => x * x * (3 - 2 * x);

/** Master rep drive: 0 = top / lockout, 1 = bottom. May dip slightly below 0
 *  during the lockout settle — that dip IS the overshoot. */
export function repDrive(p, opt = {}) {
  const T = { ...DEFAULT_TIMING, ...(opt.timing || {}) };
  const overshoot = opt.overshoot ?? 0.055;
  const damping = opt.damping ?? 7;
  const wobble = opt.wobble ?? 1.15;

  p = ((p % 1) + 1) % 1;
  const eccEnd = T.ecc;
  const botEnd = eccEnd + T.bottom;
  const conEnd = botEnd + T.con;

  if (p < eccEnd) {
    // Descend: slow release → gravity pulls → soft landing.
    const u = p / T.ecc;
    const gravity = u * u * (2 - u); // accelerates early, eases out late
    return 0.42 * smooth(u) + 0.58 * gravity;
  }
  if (p < botEnd) return 1; // loaded pause
  if (p < conEnd) {
    // Drive up: strongest through the mid-range, decelerating into lockout.
    const u = (p - botEnd) / T.con;
    const rise = 0.22 * smooth(u) + 0.78 * (1 - Math.pow(1 - u, 2.4));
    return 1 - rise;
  }
  // Lockout: overshoot past the end position, then damped settle.
  const u = (p - conEnd) / Math.max(1e-4, 1 - conEnd);
  return -overshoot * Math.exp(-damping * u) * Math.sin(2 * Math.PI * wobble * u);
}

/** Drive sampled with a time offset — this is how distal joints lag behind the
 *  hips (overlap / follow-through). `lagFrames` is in 60fps frames. */
export function drivenAt(p, lagFrames, periodMs, opt) {
  return repDrive(p - (lagFrames / 60) * (1000 / periodMs), opt);
}

/** Drive plus its derivatives, for inertia-driven secondary motion. */
export function repDriveKinematics(p, periodMs, opt) {
  const h = 1 / 90;
  const a = repDrive(p - h, opt);
  const b = repDrive(p, opt);
  const c = repDrive(p + h, opt);
  const scale = 1000 / periodMs;
  return {
    value: b,
    velocity: ((c - a) / (2 * h)) * scale,
    acceleration: ((c - 2 * b + a) / (h * h)) * scale * scale,
  };
}

/* ---------------- two-bone IK (sagittal plane) ----------------
   Solves a limb so its end effector stays pinned on a target — a planted foot
   or a hand on the floor / bar — while the pelvis travels freely. Without this
   the feet slide with the hips and the whole thing reads as a floating puppet.

   Angles are measured from the limb's rest direction (local -Y), positive
   toward local +Z. `bend` picks which side the knee/elbow bulges to. */
export function solveTwoBone(originY, originZ, targetY, targetZ, l1, l2, bend = 1) {
  const vy = targetY - originY;
  const vz = targetZ - originZ;
  let d = Math.hypot(vy, vz);
  d = clamp(d, Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);

  const phi = Math.atan2(vz, -vy); // chord direction from -Y toward +Z
  const alpha = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const a1 = phi + bend * alpha;

  // Where the middle joint lands, so the second segment can aim at the target.
  const ky = originY - Math.cos(a1) * l1;
  const kz = originZ + Math.sin(a1) * l1;
  const a2 = Math.atan2(targetZ - kz, -(targetY - ky));

  return {
    rot1: -a1,        // rotation.x for the proximal joint (hip / shoulder)
    rot2: -(a2 - a1), // rotation.x for the distal joint (knee / elbow)
    reach: d,
  };
}
