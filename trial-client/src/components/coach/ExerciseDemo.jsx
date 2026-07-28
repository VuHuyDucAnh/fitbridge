import Mannequin3D from "./Mannequin3D";

/**
 * "How it's done" — a solid 3D human mannequin performing the exercise that the
 * user can orbit (drag to rotate the camera). Thin wrapper so callers keep the
 * same API. See Mannequin3D for the rig + per-exercise animation.
 */
export default function ExerciseDemo({ exercise, className = "" }) {
  return <Mannequin3D exercise={exercise} className={className} />;
}
