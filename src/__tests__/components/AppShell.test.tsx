import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppShell } from "@/components/layout/AppShell";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("AppShell Layout", () => {
  it("renders skip link, desktop sidebar, header, and footer landmarks", () => {
    render(
      <AppShell>
        <div>Dashboard Child Content</div>
      </AppShell>
    );

    // Skip link
    const skipLink = screen.getByRole("link", { name: "Skip to main content" });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#main-content");

    // Landmarks
    expect(screen.getByRole("complementary", { name: "Main Navigation" })).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();

    // Content rendered inside main
    expect(screen.getByText("Dashboard Child Content")).toBeInTheDocument();
  });

  it("renders brand logo and wordmark", () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );
    const brandLinks = screen.getAllByRole("link", { name: "CelebrAI Home" });
    expect(brandLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("marks active page on sidebar navigation", () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );
    // Dashboard should have aria-current="page"
    const dashboardLink = screen.getByRole("link", { name: /Dashboard/i });
    expect(dashboardLink).toHaveAttribute("aria-current", "page");
  });

  it("handles mobile hamburger menu toggle", () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );
    const toggleButton = screen.getByRole("button", { name: /Open navigation menu/i });
    expect(toggleButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute("aria-expanded", "true");

    const mobileDialog = screen.getByRole("dialog", { name: "Mobile Navigation" });
    expect(mobileDialog).toBeInTheDocument();
  });
});
