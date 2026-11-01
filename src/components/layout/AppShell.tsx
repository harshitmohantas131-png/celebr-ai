"use client";

import React, { Suspense } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Footer } from "./Footer";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[color:var(--bg-page)] text-[color:var(--text-primary)] flex">
      {/* Skip to Main Content for Screen Readers & Keyboard Navigation */}
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>

      {/* Desktop Sidebar */}
      <Suspense fallback={<aside className="hidden lg:flex w-64 border-r border-[color:var(--border)]" />}>
        <Sidebar />
      </Suspense>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Suspense fallback={<header className="h-16 border-b border-[color:var(--border)]" />}>
          <Header />
        </Suspense>

        <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto focus:outline-none">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
}
