import { Link } from "react-router-dom";

/** FitBridge brand mark — orange dumbbell. Pure SVG, theme-independent. */
export function LogoMark({ size = 32, className = "" }) {
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

export default function Logo({ size = 32, withWordmark = true, to = "/" }) {
  const content = (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} className="shrink-0 drop-shadow-sm" />
      {withWordmark && (
        <span className="font-display text-[1.15rem] font-extrabold tracking-tight text-ink">
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
