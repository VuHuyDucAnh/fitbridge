import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

/**
 * Searchable single-select combobox.
 * options: [{ value, label, secondary?, icon? }]
 * Full keyboard support (arrows, Home/End, type-ahead via search, Enter, Escape),
 * role=combobox/listbox semantics, aria-activedescendant, touch-friendly.
 */
export default function Select({ options, value, onChange, placeholder, searchLabel = "Search", className = "" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const triggerRef = useRef(null);
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

  useEffect(() => {
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
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

      {open && (
        <div className="glass animate-pop absolute z-50 mt-2 w-full overflow-hidden rounded-2xl p-1.5">
          <div className="relative mb-1.5">
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
          <ul id={listId} role="listbox" className="max-h-64 overflow-auto">
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
      )}
    </div>
  );
}
