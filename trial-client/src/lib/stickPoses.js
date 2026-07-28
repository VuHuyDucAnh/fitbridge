/* Stick-figure pose library for the "How it's done" demo.
   Same rig and projection as the home-page PoseProof figure, extended to cover
   every tracked exercise. Coordinates are 3D (x right, y DOWN, z toward the
   viewer) around a chest-height origin, so the figure can be orbited and the
   joint angles can be measured in 3D exactly like the real pose tracker does.

   Each exercise gives pose A (start) and pose B (end of the working phase);
   the renderer eases between them. */

export const CX = 180, CY = 208, FOCAL = 260;

const STAND = {
  head: [0, -96, 2], neck: [0, -70, 0],
  shoulderL: [-27, -62, 0], shoulderR: [27, -62, 0],
  elbowL: [-30, -30, 4], elbowR: [30, -30, 4],
  wristL: [-31, 2, 6], wristR: [31, 2, 6],
  hip: [0, 6, 0], hipL: [-17, 14, 0], hipR: [17, 14, 0],
  kneeL: [-19, 58, 8], kneeR: [19, 58, 8],
  ankleL: [-19, 104, 2], ankleR: [19, 104, 2],
  toeL: [-19, 110, 20], toeR: [19, 110, 20],
};

export const STICK_POSES = {
  squat: {
    speed: 0.5,
    ground: true,
    A: STAND,
    B: {
      // break parallel: hips travel back and down, knees track over the toes,
      // arms counterbalance out in front
      head: [0, -46, 24], neck: [0, -22, 16],
      shoulderL: [-28, -16, 14], shoulderR: [28, -16, 14],
      elbowL: [-30, -22, 46], elbowR: [30, -22, 46],
      wristL: [-27, -30, 72], wristR: [27, -30, 72],
      hip: [0, 52, -10], hipL: [-19, 58, -10], hipR: [19, 58, -10],
      kneeL: [-26, 62, 46], kneeR: [26, 62, 46],
      ankleL: [-19, 104, 2], ankleR: [19, 104, 2],
      toeL: [-19, 110, 20], toeR: [19, 110, 20],
    },
  },

  lunge: {
    speed: 0.5,
    ground: true,
    A: STAND,
    B: {
      // front thigh to horizontal, back knee dropped toward the floor
      head: [0, -58, 10], neck: [0, -32, 6],
      shoulderL: [-27, -24, 6], shoulderR: [27, -24, 6],
      elbowL: [-31, 8, 8], elbowR: [31, 8, 8],
      wristL: [-32, 44, 10], wristR: [32, 44, 10],
      hip: [0, 44, 0], hipL: [-17, 52, 0], hipR: [17, 52, 0],
      kneeL: [-20, 58, 38], kneeR: [20, 90, -26],
      // back foot is up on the toes, heel lifted — the real shape of a lunge,
      // and it keeps the stance inside the frame when the figure is orbited
      ankleL: [-20, 104, 42], ankleR: [20, 86, -70],
      toeL: [-20, 106, 58], toeR: [20, 104, -58],
    },
  },

  "bicep-curl": {
    speed: 0.75,
    ground: true,
    dumbbells: true,
    A: {
      ...STAND,
      elbowL: [-30, -24, 6], elbowR: [30, -24, 6],
      wristL: [-31, 16, 12], wristR: [31, 16, 12],
      kneeL: [-19, 58, 6], kneeR: [19, 58, 6],
    },
    B: {
      // upper arm stays pinned; only the forearm rotates up
      head: [0, -95, 4], neck: [0, -69, 2],
      shoulderL: [-27, -61, 2], shoulderR: [27, -61, 2],
      elbowL: [-29, -26, 10], elbowR: [29, -26, 10],
      wristL: [-20, -60, 30], wristR: [20, -60, 30],
      hip: [0, 6, 0], hipL: [-17, 14, 0], hipR: [17, 14, 0],
      kneeL: [-19, 58, 6], kneeR: [19, 58, 6],
      ankleL: [-19, 104, 2], ankleR: [19, 104, 2],
      toeL: [-19, 110, 20], toeR: [19, 110, 20],
    },
  },

  pushup: {
    speed: 0.6,
    ground: true,
    A: {
      // top: one straight line ankle -> head, hands stacked under the shoulders
      head: [-84, 28, 0], neck: [-62, 34, 0],
      shoulderL: [-56, 36, -13], shoulderR: [-56, 36, 13],
      elbowL: [-54, 66, -17], elbowR: [-54, 66, 17],
      wristL: [-52, 96, -19], wristR: [-52, 96, 19],
      hip: [4, 48, 0], hipL: [6, 50, -9], hipR: [6, 50, 9],
      kneeL: [42, 60, -9], kneeR: [42, 60, 9],
      ankleL: [78, 72, -9], ankleR: [78, 72, 9],
      toeL: [92, 82, -9], toeR: [92, 82, 9],
    },
    B: {
      // bottom: ~76° at the elbow, tucked back rather than flared. The hands are
      // planted, so the elbow is placed as a real two-bone solution off the
      // shoulder — eyeballing it stretched the forearm as the chest dropped.
      head: [-88, 54, 0], neck: [-64, 58, 0],
      shoulderL: [-58, 60, -13], shoulderR: [-58, 60, 13],
      elbowL: [-36, 73, -29], elbowR: [-36, 73, 29],
      wristL: [-52, 96, -19], wristR: [-52, 96, 19],
      hip: [2, 62, 0], hipL: [4, 64, -9], hipR: [4, 64, 9],
      kneeL: [42, 72, -9], kneeR: [42, 72, 9],
      ankleL: [78, 80, -9], ankleR: [78, 80, 9],
      toeL: [92, 90, -9], toeR: [92, 90, 9],
    },
  },

  "pull-up": {
    speed: 0.5,
    // sits lower and on a narrower bar than a real rig would: hung any higher,
    // the bar ends swing past the top of the frame when the figure is orbited
    bar: { y: -116, halfWidth: 58 },
    A: {
      // dead hang, elbows near straight
      head: [0, -78, 2], neck: [0, -52, 0],
      shoulderL: [-27, -44, 0], shoulderR: [27, -44, 0],
      elbowL: [-27, -82, 0], elbowR: [27, -82, 0],
      wristL: [-26, -116, 0], wristR: [26, -116, 0],
      hip: [0, 24, 0], hipL: [-17, 32, 0], hipR: [17, 32, 0],
      kneeL: [-19, 78, -6], kneeR: [19, 78, -6],
      ankleL: [-19, 120, -14], ankleR: [19, 120, -14],
      toeL: [-19, 126, 2], toeR: [19, 126, 2],
    },
    B: {
      // chin over the bar; the grip is fixed so the elbows sweep out and down
      head: [0, -116, 2], neck: [0, -90, 0],
      shoulderL: [-27, -82, 4], shoulderR: [27, -82, 4],
      elbowL: [-55, -103, -10], elbowR: [55, -103, -10],
      wristL: [-26, -116, 0], wristR: [26, -116, 0],
      hip: [0, -14, 0], hipL: [-17, -6, 0], hipR: [17, -6, 0],
      kneeL: [-19, 40, -10], kneeR: [19, 40, -10],
      ankleL: [-19, 82, -20], ankleR: [19, 82, -20],
      toeL: [-19, 88, -6], toeR: [19, 88, -6],
    },
  },

  plank: {
    speed: 0.22, // a hold, not a rep — just enough drift to read as alive
    ground: true,
    A: {
      // elbows stacked under the shoulders, hip line straight
      head: [-84, 30, 0], neck: [-62, 36, 0],
      shoulderL: [-56, 38, -13], shoulderR: [-56, 38, 13],
      elbowL: [-58, 72, -15], elbowR: [-58, 72, 15],
      wristL: [-86, 80, -15], wristR: [-86, 80, 15],
      hip: [4, 50, 0], hipL: [6, 52, -9], hipR: [6, 52, 9],
      kneeL: [42, 62, -9], kneeR: [42, 62, 9],
      ankleL: [78, 74, -9], ankleR: [78, 74, 9],
      toeL: [92, 84, -9], toeR: [92, 84, 9],
    },
    B: {
      head: [-84, 32, 0], neck: [-62, 38, 0],
      shoulderL: [-56, 40, -13], shoulderR: [-56, 40, 13],
      elbowL: [-58, 72, -15], elbowR: [-58, 72, 15],
      wristL: [-86, 80, -15], wristR: [-86, 80, 15],
      hip: [4, 53, 0], hipL: [6, 55, -9], hipR: [6, 55, 9],
      kneeL: [42, 64, -9], kneeR: [42, 64, 9],
      ankleL: [78, 75, -9], ankleR: [78, 75, 9],
      toeL: [92, 85, -9], toeR: [92, 85, 9],
    },
  },
};

export const BONES = [
  ["head", "neck"], ["neck", "shoulderL"], ["neck", "shoulderR"], ["shoulderL", "shoulderR"],
  ["shoulderL", "elbowL"], ["elbowL", "wristL"], ["shoulderR", "elbowR"], ["elbowR", "wristR"],
  ["neck", "hip"], ["hip", "hipL"], ["hip", "hipR"], ["hipL", "hipR"],
  ["hipL", "kneeL"], ["kneeL", "ankleL"], ["ankleL", "toeL"],
  ["hipR", "kneeR"], ["kneeR", "ankleR"], ["ankleR", "toeR"],
];

/** Which readouts the sidebar shows, per exercise — matches the tracker. */
export const ANGLE_ROWS = {
  pushup: ["shoulder", "elbow", "bodyLine", "hip", "wrist"],
  plank: ["shoulder", "elbow", "bodyLine", "hip", "knee"],
  squat: ["knee", "hip", "backAngle", "ankle", "shoulder"],
  "bicep-curl": ["elbow", "shoulder", "backAngle", "wrist", "hip"],
  "pull-up": ["elbow", "shoulder", "bodyLine", "hip", "knee"],
  lunge: ["knee", "hip", "backAngle", "backKnee", "shoulder"],
};

const ANGLE_TRIPLES = {
  elbow: ["shoulderL", "elbowL", "wristL"],
  shoulder: ["elbowL", "shoulderL", "hip"],
  knee: ["hipL", "kneeL", "ankleL"],
  backKnee: ["hipR", "kneeR", "ankleR"],
  hip: ["neck", "hipL", "kneeL"],
  bodyLine: ["neck", "hip", "kneeL"],
  backAngle: ["head", "neck", "hip"],
  ankle: ["kneeL", "ankleL", "toeL"],
  wrist: ["elbowL", "wristL", "hip"],
};

export function project(p, cos, sin) {
  const x = p[0] * cos + p[2] * sin;
  const z = -p[0] * sin + p[2] * cos;
  const s = FOCAL / (FOCAL - z);
  return { x: CX + x * s, y: CY + p[1] * s, s };
}

/** Smooth ping-pong 0->1->0, eased on each half so it reads like a real rep. */
export function repPhase(time, speed) {
  const cycle = (time * speed) % 1;
  const half = cycle < 0.5 ? cycle * 2 : (1 - cycle) * 2;
  return half * half * (3 - 2 * half);
}

export function lerpPose(A, B, t) {
  const out = {};
  for (const k in A) {
    out[k] = [
      A[k][0] + (B[k][0] - A[k][0]) * t,
      A[k][1] + (B[k][1] - A[k][1]) * t,
      A[k][2] + (B[k][2] - A[k][2]) * t,
    ];
  }
  return out;
}

/** Interior angle ABC in degrees, measured in 3D so it is view-independent. */
export function angleAt(a, b, c) {
  const ux = a[0] - b[0], uy = a[1] - b[1], uz = a[2] - b[2];
  const wx = c[0] - b[0], wy = c[1] - b[1], wz = c[2] - b[2];
  const lu = Math.hypot(ux, uy, uz), lw = Math.hypot(wx, wy, wz);
  if (!lu || !lw) return 0;
  const d = (ux * wx + uy * wy + uz * wz) / (lu * lw);
  return Math.round((Math.acos(Math.min(1, Math.max(-1, d))) * 180) / Math.PI);
}

export function measureAngle(pose, key) {
  const trip = ANGLE_TRIPLES[key];
  if (!trip) return 0;
  const [a, b, c] = trip;
  if (!pose[a] || !pose[b] || !pose[c]) return 0;
  return angleAt(pose[a], pose[b], pose[c]);
}
