import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

const base =
  "glow relative inline-flex items-center justify-center gap-2 rounded-xl font-semibold " +
  "select-none whitespace-normal text-center leading-tight " +
  "transition-colors duration-200 disabled:cursor-not-allowed focus-visible:outline-none";

const sizes = {
  sm: "h-9 px-3.5 text-[0.82rem] rounded-lg",
  md: "h-11 px-5 text-[0.92rem]",
  lg: "h-[3.25rem] px-7 text-[1rem]",
  icon: "h-10 w-10 p-0 rounded-xl",
};

const variants = {
  primary:
    "bg-accent-strong text-accent-contrast hover:bg-accent-hover " +
    "disabled:bg-ink-3/40 disabled:text-white/80 shadow-soft",
  secondary:
    "bg-surface text-ink border border-line-strong hover:bg-sunken " +
    "disabled:opacity-50 disabled:hover:bg-surface",
  ghost:
    "bg-transparent text-ink hover:bg-sunken disabled:opacity-45 disabled:hover:bg-transparent",
  subtle:
    "bg-accent-surface text-accent-strong hover:brightness-[0.97] disabled:opacity-50",
  destructive:
    "bg-danger text-white hover:brightness-110 disabled:opacity-50 shadow-soft",
  outline:
    "bg-transparent text-accent-strong border border-accent/50 hover:bg-accent-surface disabled:opacity-50",
};

const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    className = "",
    children,
    loading = false,
    disabled = false,
    to,
    href,
    leftIcon,
    rightIcon,
    ...props
  },
  ref
) {
  const cls = `${base} ${sizes[size]} ${variants[variant]} ${className}`;
  const inner = (
    <>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {!loading && leftIcon}
      {children && <span>{children}</span>}
      {!loading && rightIcon}
    </>
  );

  if (to && !disabled) {
    return (
      <Link ref={ref} to={to} className={cls} {...props}>
        {inner}
      </Link>
    );
  }
  if (href && !disabled) {
    return (
      <a ref={ref} href={href} className={cls} {...props}>
        {inner}
      </a>
    );
  }
  return (
    <button
      ref={ref}
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {inner}
    </button>
  );
});

export default Button;
