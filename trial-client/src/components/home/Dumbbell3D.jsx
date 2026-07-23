import { useRef, useState } from "react";

/**
 * Premium floating dumbbell. An SVG rendered with metallic gradients inside a
 * perspective scene that tilts toward the pointer for a real 3D parallax feel.
 * Continuous float/spin is decorative and disabled under reduced-motion.
 */
export default function Dumbbell3D({ className = "" }) {
  const sceneRef = useRef(null);
  const [tilt, setTilt] = useState({ x: -8, y: 18 });

  const onMove = (e) => {
    const el = sceneRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * 26 - 6, y: px * 34 + 12 });
  };
  const reset = () => setTilt({ x: -8, y: 18 });

  return (
    <div
      ref={sceneRef}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={`relative grid place-items-center ${className}`}
      style={{ perspective: "1100px" }}
      aria-hidden="true"
    >
      {/* accent glow */}
      <div className="absolute h-64 w-64 rounded-full bg-accent/30 blur-[90px] animate-drift" />
      <div className="absolute h-40 w-40 rounded-full bg-accent/20 blur-3xl" />

      <div
        className="animate-float"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: "preserve-3d",
          transition: "transform 0.25s cubic-bezier(0.22,1,0.36,1)",
          willChange: "transform",
        }}
      >
        <svg width="340" height="340" viewBox="0 0 340 340" className="max-w-full drop-shadow-2xl">
          <defs>
            <linearGradient id="bar" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3a3a3a" />
              <stop offset="45%" stopColor="#0c0c0c" />
              <stop offset="55%" stopColor="#1a1a1a" />
              <stop offset="100%" stopColor="#000" />
            </linearGradient>
            <radialGradient id="plate" cx="38%" cy="34%" r="75%">
              <stop offset="0%" stopColor="#ffb28a" />
              <stop offset="42%" stopColor="#ff6a2b" />
              <stop offset="78%" stopColor="#e94f12" />
              <stop offset="100%" stopColor="#a5340a" />
            </radialGradient>
            <radialGradient id="plateInner" cx="40%" cy="36%" r="70%">
              <stop offset="0%" stopColor="#2a2a2a" />
              <stop offset="100%" stopColor="#050505" />
            </radialGradient>
            <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g transform="rotate(-32 170 170)">
            {/* handle */}
            <rect x="118" y="158" width="104" height="24" rx="12" fill="url(#bar)" />
            <rect x="118" y="160" width="104" height="6" rx="3" fill="url(#shine)" />

            {/* left plates */}
            <ellipse cx="104" cy="170" rx="20" ry="58" fill="url(#plate)" />
            <ellipse cx="104" cy="170" rx="20" ry="58" fill="none" stroke="#7a2606" strokeWidth="2" />
            <ellipse cx="100" cy="150" rx="9" ry="26" fill="url(#shine)" opacity="0.4" />
            <ellipse cx="78" cy="170" rx="14" ry="42" fill="url(#plate)" />
            <ellipse cx="60" cy="170" rx="10" ry="30" fill="url(#plateInner)" />
            <ellipse cx="60" cy="170" rx="10" ry="30" fill="none" stroke="#ff6a2b" strokeWidth="1.5" opacity="0.5" />

            {/* right plates */}
            <ellipse cx="236" cy="170" rx="20" ry="58" fill="url(#plate)" />
            <ellipse cx="236" cy="170" rx="20" ry="58" fill="none" stroke="#7a2606" strokeWidth="2" />
            <ellipse cx="232" cy="150" rx="9" ry="26" fill="url(#shine)" opacity="0.4" />
            <ellipse cx="262" cy="170" rx="14" ry="42" fill="url(#plate)" />
            <ellipse cx="280" cy="170" rx="10" ry="30" fill="url(#plateInner)" />
            <ellipse cx="280" cy="170" rx="10" ry="30" fill="none" stroke="#ff6a2b" strokeWidth="1.5" opacity="0.5" />
          </g>
        </svg>
      </div>
    </div>
  );
}
