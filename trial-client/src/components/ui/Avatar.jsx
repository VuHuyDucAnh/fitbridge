export default function Avatar({ name = "", hue = 22, size = 40, className = "" }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "★";
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full font-bold text-white ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(140deg, hsl(${hue} 85% 55%), hsl(${(hue + 40) % 360} 80% 45%))`,
      }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
