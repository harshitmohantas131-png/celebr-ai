import React, { useId } from "react";
import { clamp } from "@/lib/utils";

export type ProgressColor = "primary" | "rose" | "gold" | "success" | "error";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  color?: ProgressColor;
  size?: "sm" | "md" | "lg";
}

const colorStyles: Record<ProgressColor, string> = {
  primary: "bg-[color:var(--accent-primary)]",
  rose: "bg-[color:var(--accent-secondary)]",
  gold: "bg-[color:var(--gold)]",
  success: "bg-[color:var(--success)]",
  error: "bg-[color:var(--error)]",
};

const heightStyles = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

export function Progress({
  value,
  max = 100,
  label,
  showValue = false,
  color = "primary",
  size = "md",
  className = "",
  "aria-label": ariaLabel,
  ...props
}: ProgressProps) {
  const generatedId = useId();
  const labelId = `${generatedId}-progress-label`;

  const validMax = max > 0 ? max : 100;
  const clampedValue = clamp(value, 0, validMax);
  const percentage = Math.round((clampedValue / validMax) * 100);

  return (
    <div className={["w-full flex flex-col gap-1.5", className].filter(Boolean).join(" ")} {...props}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs font-medium text-[color:var(--text-secondary)]">
          {label && <span id={labelId}>{label}</span>}
          {showValue && <span>{percentage}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={validMax}
        aria-labelledby={label ? labelId : undefined}
        aria-label={ariaLabel}
        className={[
          "w-full overflow-hidden rounded-full bg-[color:var(--bg-muted)]",
          heightStyles[size],
        ].join(" ")}
      >
        <div
          className={[
            "h-full rounded-full transition-all duration-300 ease-out",
            colorStyles[color],
          ].join(" ")}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
