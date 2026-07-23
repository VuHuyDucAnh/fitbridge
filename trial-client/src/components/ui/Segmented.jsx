import { useRef } from "react";

/**
 * Segmented control for 2–4 mutually exclusive modes.
 * Animated indicator uses transform (not width/left). Arrow-key navigable.
 */
export default function Segmented({ options, value, onChange, ariaLabel, className = "" }) {
  const btnRefs = useRef([]);
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  const onKeyDown = (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + dir + options.length) % options.length;
    onChange(options[nextIndex].value);
    btnRefs.current[nextIndex]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={`relative inline-grid rounded-xl border border-line bg-sunken p-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-1 left-1 rounded-lg bg-surface shadow-soft transition-transform duration-300 ease-spring"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => (btnRefs.current[i] = el)}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={`relative z-10 flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[0.85rem] font-semibold transition-colors ${
              active ? "text-accent-strong" : "text-ink-2 hover:text-ink"
            }`}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
