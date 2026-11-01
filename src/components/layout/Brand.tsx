import React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

interface BrandProps {
  className?: string;
  collapsed?: boolean;
}

export function Brand({ className = "", collapsed = false }: BrandProps) {
  return (
    <Link
      href="/"
      className={["flex items-center gap-2.5 group focus-visible:outline-none", className]
        .filter(Boolean)
        .join(" ")}
      aria-label="CelebrAI Home"
    >
      <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[color:var(--accent-primary)] text-[color:var(--text-inverse)] flex items-center justify-center shadow-sm group-hover:bg-[color:var(--accent-primary-hover)] transition-colors">
        <Sparkles size={18} className="shrink-0" aria-hidden="true" />
      </div>
      {!collapsed && (
        <div className="flex flex-col">
          <span className="font-bold text-lg leading-tight tracking-tight text-[color:var(--text-primary)]">
            Celebr<span className="text-[color:var(--accent-primary)]">AI</span>
          </span>
          <span className="text-[10px] uppercase font-semibold tracking-wider text-[color:var(--text-muted)]">
            Event & Celebration Planner
          </span>
        </div>
      )}
    </Link>
  );
}
