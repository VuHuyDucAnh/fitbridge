import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog: centered glass panel on desktop, bottom sheet on mobile.
 * Traps focus, closes on Escape/overlay, restores focus to the trigger.
 */
export default function Modal({ open, onClose, title, children, footer, labelledById }) {
  const panelRef = useRef(null);
  const prevFocus = useRef(null);

  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const focusables = panel?.querySelectorAll(FOCUSABLE);
    (focusables?.[0] || panel)?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "Tab" && focusables && focusables.length) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = "";
      prevFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm animate-pop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledById || "modal-title"}
        tabIndex={-1}
        className="glass animate-pop relative z-10 w-full max-w-md rounded-t-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] outline-none sm:rounded-3xl sm:pb-6"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={labelledById || "modal-title"} className="text-lg font-bold text-ink">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="glow -mr-1 -mt-1 grid h-9 w-9 place-items-center rounded-xl text-ink-2 hover:bg-sunken"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="text-[0.95rem] text-ink-2">{children}</div>
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
