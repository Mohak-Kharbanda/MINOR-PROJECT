import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

export function FieldShell({ label, error, hint, className, children }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      {children(id, describedBy)}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ label, error, hint, wrapperClassName, className, leading, ...rest }, ref) {
  return (
    <FieldShell label={label} error={error} hint={hint} className={wrapperClassName}>
      {(id, describedBy) => (
        <div className="relative">
          {leading && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">{leading}</span>}
          <input
            ref={ref}
            id={id}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={cn("input", error && "input-error", leading && "pl-10", className)}
            {...rest}
          />
        </div>
      )}
    </FieldShell>
  );
});

export const Textarea = forwardRef(function Textarea({ label, error, hint, wrapperClassName, className, rows = 4, ...rest }, ref) {
  return (
    <FieldShell label={label} error={error} hint={hint} className={wrapperClassName}>
      {(id, describedBy) => (
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn("input resize-y leading-relaxed", error && "input-error", className)}
          {...rest}
        />
      )}
    </FieldShell>
  );
});

export const Select = forwardRef(function Select({ label, error, hint, wrapperClassName, className, children, ...rest }, ref) {
  return (
    <FieldShell label={label} error={error} hint={hint} className={wrapperClassName}>
      {(id, describedBy) => (
        <select
          ref={ref}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            "input appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9",
            "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
            error && "input-error",
            className
          )}
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldShell>
  );
});
