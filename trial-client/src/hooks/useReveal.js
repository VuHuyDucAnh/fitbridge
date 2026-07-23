import { useEffect, useRef } from "react";

/**
 * Scroll-reveal via IntersectionObserver. Adds `.is-visible` once, then
 * unobserves. Respects reduced-motion by revealing immediately.
 */
export function useReveal(options = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      el.classList.add("is-visible");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px", ...options }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return ref;
}
