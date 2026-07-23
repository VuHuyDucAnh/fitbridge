import { forwardRef, useId } from "react";

/**
 * Labeled input. Label is always visible (never placeholder-as-label).
 * Helper + error slots wired via aria-describedby / aria-invalid.
 */
const Field = forwardRef(function Field(
  { label, help, error, id, className = "", trailing, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;
  const helpId = `${inputId}-help`;
  const errId = `${inputId}-err`;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-[0.82rem] font-semibold text-ink-2">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : help ? helpId : undefined}
          className={`h-11 w-full rounded-xl border bg-surface px-3.5 text-[0.95rem] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent focus:ring-4 focus:ring-accent/15 ${
            error ? "border-danger focus:border-danger focus:ring-danger/15" : "border-line-strong"
          } ${trailing ? "pr-11" : ""}`}
          {...props}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-2.5 flex items-center text-ink-3">{trailing}</div>
        )}
      </div>
      {error ? (
        <p id={errId} role="alert" className="mt-1.5 text-[0.8rem] font-medium text-danger">
          {error}
        </p>
      ) : help ? (
        <p id={helpId} className="mt-1.5 text-[0.8rem] text-ink-3">
          {help}
        </p>
      ) : null}
    </div>
  );
});

export default Field;
