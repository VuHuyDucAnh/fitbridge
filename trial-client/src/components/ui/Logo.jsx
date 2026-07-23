import { useState } from "react";
import { Link } from "react-router-dom";

/**
 * FitBridge brand mark.
 *
 * Drop the real logo into the repo and it is used automatically:
 *   trial-client/public/brand/fitbridge-mark.png   (square icon — the hand + dumbbell)
 *   trial-client/public/brand/fitbridge-logo.png   (optional full lockup with wordmark)
 * Transparent-background PNG/SVG looks best on the dark UI. Until a file exists,
 * a clean SVG fallback renders so nothing is ever broken.
 */

const MARK_SRC = "/brand/fitbridge-mark.png";

function FallbackMark({ size, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="15" fill="var(--accent)" />
      <g transform="rotate(-38 32 32)">
        <rect x="20" y="29.5" width="24" height="5" rx="2.5" fill="#0B0B0B" />
        <rect x="12" y="21.5" width="6.5" height="21" rx="3" fill="#0B0B0B" />
        <rect x="8" y="25" width="5" height="14" rx="2.5" fill="#1c1c1c" />
        <rect x="45.5" y="21.5" width="6.5" height="21" rx="3" fill="#0B0B0B" />
        <rect x="51" y="25" width="5" height="14" rx="2.5" fill="#1c1c1c" />
        <circle cx="32" cy="32" r="2.4" fill="var(--accent)" />
      </g>
    </svg>
  );
}

export function LogoMark({ size = 32, className = "" }) {
  const [ok, setOk] = useState(true);
  if (!ok) return <FallbackMark size={size} className={className} />;
  return (
    <img
      src={MARK_SRC}
      width={size}
      height={size}
      alt=""
      onError={() => setOk(false)}
      className={`shrink-0 rounded-[22%] object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export default function Logo({ size = 32, withWordmark = true, to = "/" }) {
  const content = (
    <span className="inline-flex items-center gap-2.5 text-current">
      <LogoMark size={size} />
      {withWordmark && (
        <span className="font-display text-[1.2rem] font-extrabold leading-none tracking-tight">
          Fit<span className="text-accent">Bridge</span>
        </span>
      )}
    </span>
  );
  if (to) {
    return (
      <Link to={to} aria-label="FitBridge — home" className="inline-flex rounded-xl">
        {content}
      </Link>
    );
  }
  return content;
}
