"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Plus } from "lucide-react";
import { Brand } from "./Brand";
import { navItems } from "./navItems";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const getPageTitle = () => {
    if (pathname === "/") return "Celebration Dashboard";
    if (pathname.startsWith("/events/new")) return "Create New Celebration";
    if (pathname.startsWith("/timeline")) return "Timeline Planner";
    if (pathname.startsWith("/budget")) return "Budget Calculator";
    if (pathname.startsWith("/vendors")) return "Vendor Checklist";
    return "Event Planner";
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-[color:var(--bg-card)]/95 backdrop-blur-xs border-b border-[color:var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Mobile: Menu toggle + Brand */}
        <div className="flex items-center gap-3 md:hidden">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 -ml-2 rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)]"
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
            aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {isOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
          <Brand />
        </div>

        {/* Desktop: Current Section Title */}
        <div className="hidden md:flex items-center gap-3">
          <span className="text-base font-semibold text-[color:var(--text-primary)]">
            {getPageTitle()}
          </span>
          <span className="text-[color:var(--border-strong)]" aria-hidden="true">|</span>
          <span className="text-xs text-[color:var(--text-muted)] font-medium">
            AI-Assisted Event Planning
          </span>
        </div>

        {/* Header Right Action */}
        <div className="flex items-center gap-3">
          {pathname !== "/events/new" ? (
            <Link href="/events/new">
              <Button size="sm" icon={Plus} variant="primary">
                Plan Event
              </Button>
            </Link>
          ) : (
            <Link href="/">
              <Button size="sm" variant="outline">
                Back to Dashboard
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {isOpen && (
        <div
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          className="fixed inset-0 top-16 z-40 bg-[color:var(--text-primary)]/40 backdrop-blur-xs md:hidden"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-[color:var(--bg-card)] w-4/5 max-w-sm h-full p-6 shadow-xl border-r border-[color:var(--border)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pb-4 mb-4 border-b border-[color:var(--border)]">
              <div className="text-xs uppercase font-semibold text-[color:var(--text-muted)] tracking-wider">
                Menu
              </div>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                if (item.disabled) {
                  return (
                    <div
                      key={item.name}
                      aria-disabled="true"
                      title={item.disabledReason}
                      className="flex items-center justify-between px-3 py-3 rounded-[var(--radius-md)] text-sm font-medium text-[color:var(--text-muted)] opacity-60 select-none cursor-not-allowed"
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
                    onClick={() => setIsOpen(false)}
                    className={[
                      "flex items-center justify-between px-3 py-3 rounded-[var(--radius-md)] text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[color:var(--accent-primary-light)] text-[color:var(--accent-primary)] font-semibold"
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

            <div className="mt-8 pt-6 border-t border-[color:var(--border)]">
              <Link href="/events/new" onClick={() => setIsOpen(false)}>
                <Button fullWidth icon={Plus} variant="primary">
                  Start Planning
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
