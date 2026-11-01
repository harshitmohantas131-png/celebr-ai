import React from "react";
import { type LucideIcon } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "destructive" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  loading?: boolean;
  fullWidth?: boolean;
  asChild?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[color:var(--accent-primary)] text-[color:var(--text-inverse)] border-transparent " +
    "hover:bg-[color:var(--accent-primary-hover)] shadow-sm",
  secondary:
    "bg-[color:var(--bg-subtle)] text-[color:var(--text-primary)] border-[color:var(--border)] " +
    "hover:bg-[color:var(--bg-muted)]",
  outline:
    "bg-transparent text-[color:var(--text-primary)] border-[color:var(--border-strong)] " +
    "hover:bg-[color:var(--bg-subtle)] hover:border-[color:var(--accent-primary)]",
  destructive:
    "bg-[color:var(--error)] text-white border-transparent " +
    "hover:bg-red-700",
  ghost:
    "bg-transparent text-[color:var(--text-secondary)] border-transparent " +
    "hover:bg-[color:var(--bg-subtle)] hover:text-[color:var(--text-primary)]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5 rounded-[var(--radius-sm)]",
  md: "h-10 px-4 text-sm gap-2 rounded-[var(--radius-md)]",
  lg: "h-12 px-6 text-base gap-2.5 rounded-[var(--radius-md)]",
};

export function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  iconPosition = "left",
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-busy={loading}
      className={[
        "inline-flex items-center justify-center font-medium border",
        "transition-all duration-[150ms] ease-out",
        "focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)] focus-visible:outline-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        "select-none whitespace-nowrap",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {loading && (
        <span
          className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden="true"
        />
      )}
      {!loading && Icon && iconPosition === "left" && (
        <Icon className="shrink-0" size={size === "sm" ? 14 : size === "lg" ? 18 : 16} aria-hidden="true" />
      )}
      {children && <span>{children}</span>}
      {!loading && Icon && iconPosition === "right" && (
        <Icon className="shrink-0" size={size === "sm" ? 14 : size === "lg" ? 18 : 16} aria-hidden="true" />
      )}
    </button>
  );
}
