import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronsUpDown, Search } from "lucide-react";

const GAP = 8;      // space between trigger and panel
const EDGE = 8;     // keep the panel off the viewport edges
const MIN_PANEL = 200;

/**
 * Searchable single-select combobox.
 * options: [{ value, label, secondary?, icon? }]
 * Full keyboard support (arrows, Home/End, type-ahead via search, Enter, Escape),
 * role=combobox/listbox semantics, aria-activedescendant, touch-friendly.
 *
 * The panel is portalled to <body> and positioned with fixed coordinates: every
 * `.reveal` wrapper sets `will-change: transform`, which opens a stacking
 * context that a plain absolute+z-50 panel can never escape — on mobile that
 * left the options painting *behind* the next card down the page.
 */
export default function Select({ options, value, onChange, placeholder, searchLabel = "Search", className = "" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [box, setBox] = useState(null); // trigger rect + resolved placement
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.secondary && o.secondary.toLowerCase().includes(q))
    );
  }, [options, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(Math.max(0, options.findIndex((o) => o.value === value)));
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Measure the trigger and decide whether the panel drops down or flips up. */
  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - GAP - EDGE;
    const above = r.top - GAP - EDGE;
    const flip = below < MIN_PANEL && above > below;
    setBox({
      left: r.left,
      width: r.width,
      top: r.bottom + GAP,
      bottom: window.innerHeight - r.top + GAP,
      flip,
      maxHeight: Math.max(MIN_PANEL, Math.min(360, flip ? above : below)),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    // capture:true so scrolling *any* ancestor keeps the panel glued to the trigger
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  useEffect(() => {
    const onDoc = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    if (open) {
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("touchstart", onDoc);
    }
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [open]);

  const commit = (opt) => {
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(filtered.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      commit(filtered[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  const panel = open && box && (
    <div
      ref={panelRef}
      className="glass animate-pop fixed z-[100] flex flex-col overflow-hidden rounded-2xl p-1.5"
      style={{
        left: box.left,
        width: box.width,
        maxHeight: box.maxHeight,
        ...(box.flip ? { bottom: box.bottom } : { top: box.top }),
      }}
    >
      <div className="relative mb-1.5 shrink-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          aria-label={searchLabel}
          aria-controls={listId}
          aria-activedescendant={filtered[active] ? `${listId}-${filtered[active].value}` : undefined}
          placeholder={searchLabel}
          className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-[0.9rem] text-ink outline-none placeholder:text-ink-3 focus:border-accent"
        />
      </div>
      <ul id={listId} role="listbox" className="min-h-0 flex-1 overflow-auto overscroll-contain">
        {filtered.length === 0 && (
          <li className="px-3 py-6 text-center text-[0.85rem] text-ink-3">—</li>
        )}
        {filtered.map((o, i) => {
          const isSel = o.value === value;
          const isActive = i === active;
          return (
            <li
              key={o.value}
              id={`${listId}-${o.value}`}
              role="option"
              aria-selected={isSel}
              onMouseEnter={() => setActive(i)}
              onClick={() => commit(o)}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 ${
                isActive ? "bg-accent-surface" : ""
              }`}
            >
              {o.icon && <span className="shrink-0 text-ink-2">{o.icon}</span>}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.9rem] font-semibold text-ink">{o.label}</span>
                {o.secondary && (
                  <span className="block truncate text-[0.78rem] text-ink-3">{o.secondary}</span>
                )}
              </span>
              {isSel && <Check className="h-4 w-4 shrink-0 text-accent-strong" aria-hidden="true" />}
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="glow flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-line-strong bg-surface px-3.5 text-left text-[0.95rem] text-ink transition-colors hover:bg-sunken"
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected?.icon}
          <span className="truncate">{selected ? selected.label : placeholder}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
      </button>

      {panel && createPortal(panel, document.body)}
    </div>
  );
}
