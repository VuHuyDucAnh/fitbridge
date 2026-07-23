import { useReveal } from "../../hooks/useReveal";

export default function Reveal({ children, delay = 0, className = "", as: Tag = "div" }) {
  const ref = useReveal();
  return (
    <Tag ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}
