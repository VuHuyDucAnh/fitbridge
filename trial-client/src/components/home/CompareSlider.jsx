import { useCallback, useEffect, useRef, useState } from "react";
import { Frown, Smile, MoveHorizontal } from "lucide-react";
import { useI18n } from "../../i18n/LanguageContext";

/* Cluely-style before/after compare slider. Drag the divider to reveal the
   "with FitBridge" side. Photos drop in at public/media/compare-before.jpg and
   compare-after.jpg; an elegant placeholder shows until they exist. Speech-bubble
   copy follows the chosen locale. Built with our orange/glass system. */

function Side({ src, onError, failed, children, className = "" }) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      {!failed && src ? (
        <img src={src} alt="" draggable={false} onError={onError} className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d]">
          <div className="h-40 w-28 rounded-t-[3rem] bg-white/[0.06]" />
        </div>
      )}
      {children}
    </div>
  );
}

export default function CompareSlider() {
  const { t } = useI18n();
  const wrapRef = useRef(null);
  const [pos, setPos] = useState(50); // percent revealed of "after"
  const [dragging, setDragging] = useState(false);
  const [beforeFailed, setBeforeFailed] = useState(false);
  const [afterFailed, setAfterFailed] = useState(false);

  const setFromClientX = useCallback((clientX) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const move = (e) => setFromClientX(e.touches ? e.touches[0].clientX : e.clientX);
    const up = () => setDragging(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
  }, [dragging, setFromClientX]);

  const onKey = (e) => {
    if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 4));
    if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 4));
  };

  return (
    <div
      ref={wrapRef}
      className="relative aspect-[4/3] w-full select-none overflow-hidden rounded-[var(--r-xl)] border border-line-strong bg-[#0d0d0d] shadow-float sm:aspect-[16/10]"
      onMouseDown={(e) => { setDragging(true); setFromClientX(e.clientX); }}
      onTouchStart={(e) => { setDragging(true); setFromClientX(e.touches[0].clientX); }}
    >
      {/* BEFORE (insecure) — full width underneath */}
      <Side src="/media/compare-before.jpg" failed={beforeFailed} onError={() => setBeforeFailed(true)}>
        <div className="pointer-events-none absolute left-4 top-4 max-w-[62%]">
          <div className="glass inline-flex items-start gap-2 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
            <Frown className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
            <span className="text-[0.85rem] font-semibold text-ink">{t("home.compareBefore")}</span>
          </div>
        </div>
        <span className="pointer-events-none absolute bottom-3 left-4 rounded-full bg-black/50 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-white/70 backdrop-blur-sm">
          {t("home.compareBeforeTag")}
        </span>
      </Side>

      {/* AFTER (confident, with FitBridge) — clipped to divider */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
        <Side src="/media/compare-after.jpg" failed={afterFailed} onError={() => setAfterFailed(true)} className="bg-[#0d0d0d]">
          <div className="pointer-events-none absolute inset-0 bg-accent/10" />
          <div className="pointer-events-none absolute right-4 top-4 flex max-w-[62%] justify-end">
            <div className="inline-flex items-start gap-2 rounded-2xl rounded-tr-sm bg-accent px-3.5 py-2.5 shadow-float">
              <Smile className="mt-0.5 h-4 w-4 shrink-0 text-accent-contrast" />
              <span className="text-[0.85rem] font-bold text-accent-contrast">{t("home.compareAfter")}</span>
            </div>
          </div>
          <span className="pointer-events-none absolute bottom-3 right-4 rounded-full bg-accent px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-accent-contrast">
            {t("home.compareAfterTag")}
          </span>
        </Side>
      </div>

      {/* Divider + handle */}
      <div className="pointer-events-none absolute inset-y-0 z-10" style={{ left: `${pos}%` }}>
        <div className="absolute inset-y-0 -ml-px w-0.5 bg-white/80 shadow-[0_0_12px_rgba(251,91,24,0.7)]" />
        <button
          type="button"
          aria-label={t("home.compareDrag")}
          onKeyDown={onKey}
          onMouseDown={(e) => { e.stopPropagation(); setDragging(true); }}
          onTouchStart={(e) => { e.stopPropagation(); setDragging(true); }}
          className="glow pointer-events-auto absolute top-1/2 -ml-5 grid h-10 w-10 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full border border-white/30 bg-accent text-accent-contrast shadow-float"
        >
          <MoveHorizontal className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
