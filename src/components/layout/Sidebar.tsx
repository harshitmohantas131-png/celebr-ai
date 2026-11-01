"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./Brand";
import { navItems } from "./navItems";
import { Badge } from "@/components/ui/Badge";
import { Sparkles } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex flex-col w-64 shrink-0 border-r border-[color:var(--border)] bg-[color:var(--bg-card)] h-screen sticky top-0"
      aria-label="Main Navigation"
    >
      <div className="p-5 border-b border-[color:var(--border)]">
        <Brand />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-[color:var(--text-muted)] uppercase">
          Planning Menu
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <div
                key={item.name}
                aria-disabled="true"
                title={item.disabledReason}
                className="flex items-center justify-between px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium text-[color:var(--text-muted)] opacity-60 cursor-not-allowed select-none"
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className="shrink-0" aria-hidden="true" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <Badge variant="default" size="sm" className="text-[10px] px-1.5 py-0">
                    {item.badge}
                  </Badge>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={[
                "flex items-center justify-between px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors",
                isActive
                  ? "bg-[color:var(--accent-primary-light)] text-[color:var(--accent-primary)] font-semibold shadow-xs"
                  : "text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-subtle)] hover:text-[color:var(--text-primary)]",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="flex items-center gap-3">
                <Icon
                  size={18}
                  className={[
                    "shrink-0",
                    isActive ? "text-[color:var(--accent-primary)]" : "text-[color:var(--text-secondary)]",
                  ].join(" ")}
                  aria-hidden="true"
                />
                <span>{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* AI Assistant Info Card */}
      <div className="p-4 border-t border-[color:var(--border)]">
        <div className="p-3.5 rounded-[var(--radius-md)] bg-[color:var(--bg-subtle)] border border-[color:var(--border)] flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[color:var(--text-primary)]">
            <span className="w-5 h-5 rounded-full bg-[color:var(--accent-primary-light)] text-[color:var(--accent-primary)] flex items-center justify-center">
              <Sparkles size={12} aria-hidden="true" />
            </span>
            <span>GenAI Powered</span>
          </div>
          <p className="text-xs text-[color:var(--text-secondary)] leading-relaxed">
            Personalized themes, budgets, schedules & vendor checklists tailored by Gemini.
          </p>
        </div>
      </div>
    </aside>
  );
}
