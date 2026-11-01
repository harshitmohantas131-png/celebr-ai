import React from "react";

export type BadgeVariant =
  | "default"
  | "primary"
  | "secondary"
  | "rose"
  | "gold"
  | "success"
  | "warning"
  | "error"
  | "outline";

export type BadgeSize = "sm" | "md";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[color:var(--bg-muted)] text-[color:var(--text-secondary)] border-[color:var(--border)]",
  primary: "bg-[color:var(--accent-primary-light)] text-[color:var(--accent-primary)] border-[color:var(--accent-primary)]/20",
  secondary: "bg-[color:var(--bg-subtle)] text-[color:var(--text-primary)] border-[color:var(--border)]",
  rose: "bg-[color:var(--accent-secondary-light)] text-[color:var(--accent-secondary)] border-[color:var(--accent-secondary)]/20",
  gold: "bg-[color:var(--gold-light)] text-[color:var(--gold)] border-[color:var(--gold)]/30",
  success: "bg-[color:var(--success-light)] text-[color:var(--success)] border-[color:var(--success)]/20",
  warning: "bg-[color:var(--warning-light)] text-[color:var(--warning)] border-[color:var(--warning)]/20",
  error: "bg-[color:var(--error-light)] text-[color:var(--error)] border-[color:var(--error)]/20",
  outline: "bg-transparent text-[color:var(--text-secondary)] border-[color:var(--border-strong)]",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "text-xs px-2 py-0.5",
  md: "text-xs font-medium px-2.5 py-1",
};

export function Badge({
  variant = "default",
  size = "md",
  children,
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap",
        variantStyles[variant],
        sizeStyles[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}
