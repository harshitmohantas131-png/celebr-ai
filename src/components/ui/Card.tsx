import React from "react";

interface CardProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
  /** If true, add hover shadow lift effect */
  interactive?: boolean;
  as?: "div" | "article" | "section" | "li";
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ id, children, className = "", interactive = false, as: Tag = "div" }: CardProps) {
  return (
    <Tag
      id={id}
      className={[
        "card-surface overflow-hidden",
        interactive
          ? "transition-shadow duration-[200ms] hover:shadow-[var(--shadow-md)] cursor-pointer"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ children, className = "" }: CardHeaderProps) {
  return (
    <div className={["px-6 py-5 border-b border-[color:var(--border)]", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = "" }: CardContentProps) {
  return <div className={["px-6 py-5", className].filter(Boolean).join(" ")}>{children}</div>;
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return (
    <div
      className={[
        "px-6 py-4 border-t border-[color:var(--border)] bg-[color:var(--bg-subtle)]/40 flex items-center justify-between",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
