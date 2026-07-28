import { useReveal } from "../../hooks/useReveal";

/* `min-w-0` matters when a Reveal is a flex/grid item: the default `min-width:
   auto` lets wide content (a contribution graph, a long table) push the item —
   and with it the whole track — past the viewport instead of letting the inner
   scroll container do its job. It is a no-op everywhere else. */
export default function Reveal({ children, delay = 0, className = "", as: Tag = "div" }) {
  const ref = useReveal();
  return (
    <Tag ref={ref} className={`reveal min-w-0 ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}
