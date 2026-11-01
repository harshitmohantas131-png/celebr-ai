import React, { useId } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: string;
  /** Hides the label visually while keeping it accessible */
  hideLabel?: boolean;
}

export function Input({
  label,
  helperText,
  error,
  hideLabel = false,
  id: providedId,
  className = "",
  ...props
}: InputProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const hasError = Boolean(error);

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className={[
          "text-sm font-medium text-[color:var(--text-primary)]",
          hideLabel ? "sr-only" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {label}
        {props.required && (
          <span className="ml-1 text-[color:var(--error)]" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <input
        id={id}
        aria-describedby={
          [helperText && helperId, hasError && errorId].filter(Boolean).join(" ") || undefined
        }
        aria-invalid={hasError}
        className={[
          "w-full h-10 px-3 text-sm",
          "bg-[color:var(--bg-card)] text-[color:var(--text-primary)]",
          "border rounded-[var(--radius-sm)]",
          "placeholder:text-[color:var(--text-muted)]",
          "transition-colors duration-[150ms]",
          "focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)] focus:ring-offset-1",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[color:var(--bg-subtle)]",
          hasError
            ? "border-[color:var(--error)]"
            : "border-[color:var(--border)] hover:border-[color:var(--border-strong)]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />

      {helperText && !hasError && (
        <p id={helperId} className="text-xs text-[color:var(--text-muted)]">
          {helperText}
        </p>
      )}

      {hasError && (
        <p id={errorId} className="text-xs text-[color:var(--error)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* ─── Select ──────────────────────────────────────────────────── */
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  helperText?: string;
  error?: string;
  hideLabel?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({
  label,
  helperText,
  error,
  hideLabel = false,
  options,
  placeholder,
  id: providedId,
  className = "",
  ...props
}: SelectProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const hasError = Boolean(error);

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className={[
          "text-sm font-medium text-[color:var(--text-primary)]",
          hideLabel ? "sr-only" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {label}
        {props.required && (
          <span className="ml-1 text-[color:var(--error)]" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <select
        id={id}
        aria-describedby={
          [helperText && helperId, hasError && errorId].filter(Boolean).join(" ") || undefined
        }
        aria-invalid={hasError}
        className={[
          "w-full h-10 px-3 text-sm appearance-none",
          "bg-[color:var(--bg-card)] text-[color:var(--text-primary)]",
          "border rounded-[var(--radius-sm)]",
          "transition-colors duration-[150ms]",
          "focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)] focus:ring-offset-1",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[color:var(--bg-subtle)]",
          hasError
            ? "border-[color:var(--error)]"
            : "border-[color:var(--border)] hover:border-[color:var(--border-strong)]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {helperText && !hasError && (
        <p id={helperId} className="text-xs text-[color:var(--text-muted)]">
          {helperText}
        </p>
      )}
      {hasError && (
        <p id={errorId} className="text-xs text-[color:var(--error)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
