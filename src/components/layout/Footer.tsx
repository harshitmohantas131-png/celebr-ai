import React from "react";
import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-[color:var(--border)] bg-[color:var(--bg-card)] py-6 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[color:var(--text-secondary)]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[color:var(--text-primary)]">CelebrAI</span>
          <span className="text-[color:var(--border-strong)]">·</span>
          <span>Intelligent celebration & event planning</span>
        </div>

        <div className="flex items-center gap-1 text-[color:var(--text-muted)]">
          <span>Crafted with</span>
          <Heart size={12} className="text-[color:var(--accent-secondary)] fill-current" aria-hidden="true" />
          <span>powered by Google GenAI</span>
        </div>

        <div className="text-[color:var(--text-muted)]">
          <span>© 2026 CelebrAI. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
