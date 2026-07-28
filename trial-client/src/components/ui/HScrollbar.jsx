import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Always-visible horizontal scrollbar driving an external scroll container.
 *
 * Phones (and Chrome's mobile emulation) use overlay scrollbars that fade out
 * the moment you stop moving, so wide panned content — the contribution graph —
 * reads as "cut off" rather than "scrollable". This renders a persistent track
 * that mirrors scroll position and doubles as a drag handle.
 *
 * Renders nothing when the content fits.
 */
export default function HScrollbar({ targetRef, label, className = "" }) {
  const [geo, setGeo] = useState(null); // { ratio, progress }
  const trackRef = useRef(null);
  const drag = useRef(null);

  // Bails out when nothing moved — this runs after every render (see below), so
  // an unconditional setGeo would spin forever on a fresh object identity.
  const sync = useCallback(() => {
    const el = targetRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const next =
      max <= 1
        ? null
        : {
            ratio: Math.max(0.12, el.clientWidth / el.scrollWidth),
            progress: Math.min(1, Math.max(0, el.scrollLeft / max)),
          };
    setGeo((prev) => {
      if (prev === next) return prev;
      if (!prev || !next) return next;
      const same =
        Math.abs(prev.ratio - next.ratio) < 0.001 &&
        Math.abs(prev.progress - next.progress) < 0.001;
      return same ? prev : next;
    });
  }, [targetRef]);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    // Observe the content as well as the viewport — a container-only observer
    // misses changes that move scrollWidth without resizing the container.
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    for (const child of el.children) ro.observe(child);
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      ro.disconnect();
    };
  }, [targetRef, sync]);

  // Deliberately dependency-free: content changes come from the parent
  // re-rendering (a new contribution map, a locale switch), and those move
  // scrollWidth without ever resizing the container the observer watches.
  useLayoutEffect(sync);

  // Safety net: if the pointer is released somewhere we never hear about, the
  // drag must not stay armed.
  useEffect(() => {
    const end = () => { drag.current = null; };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, []);

  // Map a pointer x within the track to a scroll offset, keeping the grab point
  // under the finger so the thumb doesn't jump on the first move.
  const scrollTo = (clientX, grabOffset) => {
    const el = targetRef.current;
    const track = trackRef.current;
    if (!el || !track || !geo) return;
    const tb = track.getBoundingClientRect();
    const thumbW = tb.width * geo.ratio;
    const travel = tb.width - thumbW;
    if (travel <= 0) return;
    const x = clientX - tb.left - (grabOffset ?? thumbW / 2);
    el.scrollLeft = (Math.min(travel, Math.max(0, x)) / travel) * (el.scrollWidth - el.clientWidth);
  };

  const onPointerDown = (e) => {
    if (!geo) return;
    const tb = trackRef.current.getBoundingClientRect();
    const thumbW = tb.width * geo.ratio;
    const thumbLeft = (tb.width - thumbW) * geo.progress;
    const localX = e.clientX - tb.left;
    const onThumb = localX >= thumbLeft && localX <= thumbLeft + thumbW;
    // Grabbing the thumb keeps the grab point under the finger; clicking the
    // bare track centres the thumb on the tap.
    drag.current = { active: true, offset: onThumb ? localX - thumbLeft : null };
    // Capture is a nicety (keeps tracking outside the element), not a
    // requirement — never let it break the drag.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch { /* pointer already released */ }
    scrollTo(e.clientX, drag.current.offset);
  };

  const onPointerMove = (e) => {
    if (!drag.current?.active) return;
    e.preventDefault();
    scrollTo(e.clientX, drag.current.offset);
  };

  const onPointerUp = (e) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch { /* never captured */ }
    drag.current = null;
  };

  const onKeyDown = (e) => {
    const el = targetRef.current;
    if (!el) return;
    const page = el.clientWidth * 0.9;
    const step = { ArrowLeft: -40, ArrowRight: 40, PageUp: -page, PageDown: page }[e.key];
    if (step !== undefined) {
      e.preventDefault();
      el.scrollBy({ left: step, behavior: "smooth" });
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      el.scrollTo({ left: e.key === "Home" ? 0 : el.scrollWidth, behavior: "smooth" });
    }
  };

  if (!geo) return null;

  return (
    <div
      ref={trackRef}
      role="scrollbar"
      tabIndex={0}
      aria-label={label}
      aria-orientation="horizontal"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(geo.progress * 100)}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`relative h-1.5 w-full cursor-pointer touch-none rounded-full bg-sunken ${className}`}
    >
      <div
        className="absolute inset-y-0 rounded-full bg-line-strong transition-colors hover:bg-ink-3"
        style={{
          width: `${geo.ratio * 100}%`,
          left: `${geo.progress * (100 - geo.ratio * 100)}%`,
        }}
      />
    </div>
  );
}
