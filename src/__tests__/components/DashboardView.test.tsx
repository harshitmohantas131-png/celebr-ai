import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardView } from "@/features/planner/DashboardView";

describe("DashboardView", () => {
  it("renders the dashboard without runtime errors", () => {
    render(<DashboardView />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("verifies that the main heading and primary action are present", () => {
    render(<DashboardView />);
    // Main heading
    const heading = screen.getByRole("heading", { level: 1, name: /Plan your next memorable celebration/i });
    expect(heading).toBeInTheDocument();

    // Primary action link / button
    const primaryAction = screen.getByRole("link", { name: /Plan a celebration/i });
    expect(primaryAction).toBeInTheDocument();
    expect(primaryAction).toHaveAttribute("href", "/events/new");
  });

  it("verifies that all three event types are available", () => {
    render(<DashboardView />);

    // Check all three event archetype headings
    expect(screen.getByRole("heading", { level: 3, name: "Wedding" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Birthday Party" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Community Event" })).toBeInTheDocument();

    // Verify radiogroup accessible role
    const radiogroup = screen.getByRole("radiogroup", { name: /Celebration event types/i });
    expect(radiogroup).toBeInTheDocument();

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
  });

  it("tests event-type selection via click and updates primary action URL", () => {
    render(<DashboardView />);

    const birthdayRadio = screen.getAllByRole("radio")[1];
    expect(birthdayRadio).toHaveAttribute("aria-checked", "false");

    // Click birthday card
    fireEvent.click(birthdayRadio);
    expect(birthdayRadio).toHaveAttribute("aria-checked", "true");

    // Verify badge updates with selected type
    expect(screen.getByText("Selected: Birthday Party")).toBeInTheDocument();

    // Verify primary action updates to include selected query param
    const primaryAction = screen.getByRole("link", { name: /Plan a celebration/i });
    expect(primaryAction).toHaveAttribute("href", "/events/new?type=birthday");
  });

  it("tests event-type selection via keyboard navigation", () => {
    render(<DashboardView />);

    const weddingRadio = screen.getAllByRole("radio")[0];
    expect(weddingRadio).toHaveAttribute("aria-checked", "false");

    // Press Enter to select
    fireEvent.keyDown(weddingRadio, { key: "Enter" });
    expect(weddingRadio).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Selected: Wedding")).toBeInTheDocument();
  });

  it("verifies empty-state behavior for recent celebrations", () => {
    render(<DashboardView />);

    // Check recent celebrations section
    expect(screen.getByRole("heading", { level: 2, name: /Recent Celebrations/i })).toBeInTheDocument();

    // Empty state heading and text
    expect(screen.getByText("No celebrations planned yet")).toBeInTheDocument();
    expect(
      screen.getByText(/You haven't generated any event plans yet/i)
    ).toBeInTheDocument();

    // Empty state action button
    const startButton = screen.getByRole("button", { name: /Start First Celebration/i });
    expect(startButton).toBeInTheDocument();
  });

  it("verifies accessible names for important controls", () => {
    render(<DashboardView />);

    expect(screen.getByRole("link", { name: /Plan a celebration/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /How It Works/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /New Plan/i })).toBeInTheDocument();
  });
});
