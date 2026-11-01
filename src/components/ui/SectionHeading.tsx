import React from "react";

interface SectionHeadingProps {
  id?: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  as?: "h1" | "h2" | "h3" | "h4";
  className?: string;
}

export function SectionHeading({
  id,
  title,
  subtitle,
  badge,
  action,
  as: Heading = "h2",
  className = "",
}: SectionHeadingProps) {
  const sizeClasses = {
    h1: "text-2xl sm:text-3xl font-bold tracking-tight",
    h2: "text-xl sm:text-2xl font-semibold tracking-tight",
    h3: "text-lg sm:text-xl font-semibold",
    h4: "text-base sm:text-lg font-medium",
  };

  return (
    <div
      className={[
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Heading id={id} className={[sizeClasses[Heading], "text-[color:var(--text-primary)]"].join(" ")}>
            {title}
          </Heading>
          {badge && <div>{badge}</div>}
        </div>
        {subtitle && (
          <p className="text-sm text-[color:var(--text-secondary)] leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
}
