import React from "react";

interface LoadingStateProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const spinnerSizes = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-[2.5px]",
  lg: "h-12 w-12 border-3",
};

export function LoadingState({
  message = "Loading...",
  size = "md",
  className = "",
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "flex flex-col items-center justify-center gap-3 py-10 px-4 text-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className={[
          "rounded-full border-[color:var(--border)] border-t-[color:var(--accent-primary)] animate-spin",
          spinnerSizes[size],
        ].join(" ")}
        aria-hidden="true"
      />
      {message && (
        <p className="text-sm font-medium text-[color:var(--text-secondary)]">
          {message}
        </p>
      )}
    </div>
  );
}
