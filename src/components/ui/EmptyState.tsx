import React from "react";
import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center text-center",
        "p-8 sm:p-12 rounded-[var(--radius-lg)]",
        "border border-dashed border-[color:var(--border-strong)]",
        "bg-[color:var(--bg-subtle)]/50",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-[color:var(--accent-primary-light)] text-[color:var(--accent-primary)] shadow-sm"
        aria-hidden="true"
      >
        <Icon size={24} />
      </div>

      <h3 className="text-base sm:text-lg font-semibold text-[color:var(--text-primary)] mb-1">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-[color:var(--text-secondary)] max-w-sm mb-6 leading-relaxed">
          {description}
        </p>
      )}

      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
