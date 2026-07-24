import { useCallback, useEffect, useRef, useState } from "react";
import { Frown, Smile, MoveHorizontal } from "lucide-react";
import { useI18n } from "../../i18n/LanguageContext";

/* Cluely-style before/after compare slider driven by a SINGLE source image
   (public/media/before-after.png — a real athlete on the left, FitBridge's live
   skeleton tracking on the right). Dragging wipes from a muted "before" look to
   the vivid "with FitBridge" version of the same shot. Locale-aware bubbles,
   our orange/glass system. Falls back to an elegant placeholder if the file is
   missing. */

const IMG = "/media/before-after.png";

export default function CompareSlider() {
  const { t } = useI18n();
  const wrapRef = useRef(null);
  const [pos, setPos] = useState(50); // percent revealed of "after"
  const [dragging, setDragging] = useState(false);
  const [failed, setFailed] = useState(false);

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
      {failed ? (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] text-[0.85rem] text-white/40">
          {t("home.compareBeforeTag")} · {t("home.compareAfterTag")}
        </div>
      ) : (
        <>
          {/* BEFORE — muted version of the shot, full width underneath */}
          <img
            src={IMG}
            alt=""
            draggable={false}
            onError={() => setFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: "grayscale(0.9) brightness(0.62) contrast(0.95)" }}
          />
          <div className="pointer-events-none absolute left-4 top-4 max-w-[58%]">
            <div className="glass inline-flex items-start gap-2 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
              <Frown className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
              <span className="text-[0.85rem] font-semibold text-ink">{t("home.compareBefore")}</span>
            </div>
          </div>
          <span className="pointer-events-none absolute bottom-3 left-4 rounded-full bg-black/55 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-white/70 backdrop-blur-sm">
            {t("home.compareBeforeTag")}
          </span>

          {/* AFTER — vivid "with FitBridge" version, clipped to the divider */}
          <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
            <img src={IMG} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-accent/25 to-transparent" />
            <div className="pointer-events-none absolute right-4 top-4 flex max-w-[58%] justify-end">
              <div className="inline-flex items-start gap-2 rounded-2xl rounded-tr-sm bg-accent px-3.5 py-2.5 shadow-float">
                <Smile className="mt-0.5 h-4 w-4 shrink-0 text-accent-contrast" />
                <span className="text-[0.85rem] font-bold text-accent-contrast">{t("home.compareAfter")}</span>
              </div>
            </div>
            <span className="pointer-events-none absolute bottom-3 right-4 rounded-full bg-accent px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-accent-contrast">
              {t("home.compareAfterTag")}
            </span>
          </div>
        </>
      )}

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
