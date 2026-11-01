import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelinePlannerView } from "@/features/timeline/TimelinePlannerView";
import { planStorage } from "@/lib/storage/planStorage";
import type { EventPlan } from "@/types/event";

const mockPlan: EventPlan = {
  id: "plan-test-1",
  eventDetails: {
    name: "Summer Solstice Wedding",
    eventType: "wedding",
    eventDate: "2027-06-21",
    location: "Botanical Conservatory",
    guestCount: 120,
    totalBudget: 40000,
    currency: "USD",
    theme: "Botanical Elegance",
    culturalPreferences: [],
    dietaryRequirements: ["Vegetarian"],
    planningPriorities: ["Venue", "Music"],
    additionalInstructions: "",
  },
  overview: {
    summary: "A lush conservatory celebration with floral chandeliers.",
    personalizedIdeas: ["Seed packet favors", "Acoustic strings"],
    themeConcept: "Botanical Chic",
    colorPalette: ["#2d5a27", "#f4f1ea"],
  },
  budget: {
    categories: [
      {
        id: "cat-1",
        name: "Venue",
        allocatedAmount: 15000,
        items: [
          {
            id: "i1",
            categoryId: "cat-1",
            name: "Conservatory Rental",
            estimatedCost: 15000,
            priority: "high",
          },
        ],
      },
    ],
    contingencyRate: 0.1,
    calculation: {
      currency: "USD",
      totalBudget: 40000,
      categorySubtotal: 15000,
      contingencyRate: 0.1,
      contingencyAmount: 4000,
      totalEstimatedCost: 19000,
      remainingBudget: 21000,
      isOverBudget: false,
      overBudgetAmount: 0,
      categoryBreakdown: [
        {
          categoryId: "cat-1",
          categoryName: "Venue",
          subtotal: 15000,
          percentageOfTotal: 37.5,
          itemCount: 1,
        },
      ],
      warnings: [],
    },
  },
  milestones: [
    {
      id: "ms-1",
      title: "Reserve Glasshouse Hall",
      description: "Sign conservatory deposit contract",
      targetDate: "2027-01-15",
      daysBeforeEvent: 157,
      category: "Venue & Ceremony",
      completed: true,
      priority: "high",
      status: "completed",
    },
    {
      id: "ms-2",
      title: "Confirm Floral Chandeliers",
      description: "Review hanging botanical specs with florist",
      targetDate: "2027-04-15",
      daysBeforeEvent: 67,
      category: "Decor & Styling",
      completed: false,
      priority: "medium",
      status: "pending",
    },
  ],
  schedule: [
    {
      id: "sch-1",
      title: "Florist Installation & Load-in",
      startTime: "09:00",
      endTime: "11:30",
      description: "Rigging floral chandeliers in central glasshouse",
      location: "Main Conservatory",
      responsibleRole: "Lead Florist",
    },
    {
      id: "sch-2",
      title: "Guest Arrival & Prelude Music",
      startTime: "13:30",
      endTime: "14:00",
      description: "Acoustic duo welcomes arriving guests",
      location: "Terrace Courtyard",
      responsibleRole: "Ushers",
    },
  ],
  checklist: [],
  metadata: {
    createdAt: "2026-10-30T12:00:00.000Z",
    version: 1,
    currency: "USD",
    eventType: "wedding",
  },
};

describe("TimelinePlannerView Component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders empty state when no saved plans exist, and allows quick start", async () => {
    render(<TimelinePlannerView />);

    expect(screen.getByText("Timeline Planner")).toBeInTheDocument();
    expect(screen.getByText("No Celebrations Planned Yet")).toBeInTheDocument();

    const quickStartBtn = screen.getByRole("button", { name: /Start Quick Timeline/i });
    expect(quickStartBtn).toBeInTheDocument();

    fireEvent.click(quickStartBtn);

    await waitFor(() => {
      expect(screen.getByText(/Live Tracker/i)).toBeInTheDocument();
      expect(screen.getByText("My Upcoming Celebration")).toBeInTheDocument();
    });
  });

  it("renders with active celebration plan and summary KPI cards", () => {
    planStorage.save(mockPlan);

    render(<TimelinePlannerView />);

    // Page title and event switcher
    expect(screen.getByRole("heading", { level: 1, name: "Timeline Planner" })).toBeInTheDocument();
    expect(screen.getByText("Summer Solstice Wedding")).toBeInTheDocument();

    // Summary KPIs
    expect(screen.getByText("Total Milestones")).toBeInTheDocument();
    expect(screen.getByText("Completed Tasks")).toBeInTheDocument();
    expect(screen.getByText("Active Tasks")).toBeInTheDocument();
    expect(screen.getByText("Overdue Tasks")).toBeInTheDocument();

    // Metrics values: 2 total, 1 completed (50%)
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/50% Complete/i)).toBeInTheDocument();
  });

  it("toggles milestone completion status", async () => {
    planStorage.save(mockPlan);

    render(<TimelinePlannerView />);

    const toggleBtn = screen.getByRole("button", {
      name: /Mark milestone "Confirm Floral Chandeliers" as completed/i,
    });
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn);

    await waitFor(() => {
      const updated = planStorage.getById("plan-test-1");
      const ms2 = updated?.milestones.find((m) => m.id === "ms-2");
      expect(ms2?.completed).toBe(true);
      expect(ms2?.status).toBe("completed");
    });
  });

  it("filters milestones by status pill", async () => {
    planStorage.save(mockPlan);

    render(<TimelinePlannerView />);

    // Initially both milestones are visible
    expect(screen.getByText("Reserve Glasshouse Hall")).toBeInTheDocument();
    expect(screen.getByText("Confirm Floral Chandeliers")).toBeInTheDocument();

    // Click "Completed" filter
    const completedPill = screen.getByRole("button", { name: /^Completed/i });
    fireEvent.click(completedPill);

    // Only completed milestone should remain
    expect(screen.getByText("Reserve Glasshouse Hall")).toBeInTheDocument();
    expect(screen.queryByText("Confirm Floral Chandeliers")).not.toBeInTheDocument();

    // Click "Pending" filter
    const pendingPill = screen.getByRole("button", { name: /^Pending/i });
    fireEvent.click(pendingPill);

    // Only pending milestone should remain
    expect(screen.queryByText("Reserve Glasshouse Hall")).not.toBeInTheDocument();
    expect(screen.getByText("Confirm Floral Chandeliers")).toBeInTheDocument();
  });

  it("opens MilestoneModal, validates form, and adds a new milestone", async () => {
    const user = userEvent.setup();
    planStorage.save(mockPlan);

    render(<TimelinePlannerView />);

    const addBtn = screen.getByRole("button", { name: /Add Milestone/i });
    await user.click(addBtn);

    // Dialog should be open
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Add Preparation Milestone")).toBeInTheDocument();

    // Fill form
    const titleInput = screen.getByLabelText(/Milestone Title/i);
    await user.type(titleInput, "Final Sound Check");

    const submitBtn = screen.getByRole("button", { name: /Create Milestone/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Final Sound Check")).toBeInTheDocument();
      const updated = planStorage.getById("plan-test-1");
      expect(updated?.milestones.some((m) => m.title === "Final Sound Check")).toBe(true);
    });
  });

  it("opens DeleteConfirmDialog and deletes a milestone", async () => {
    const user = userEvent.setup();
    planStorage.save(mockPlan);

    render(<TimelinePlannerView />);

    const deleteBtn = screen.getByRole("button", {
      name: /Delete milestone "Confirm Floral Chandeliers"/i,
    });
    await user.click(deleteBtn);

    // Dialog appears
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete "Confirm Floral Chandeliers"/i)).toBeInTheDocument();

    // Confirm delete
    const confirmBtn = screen.getByRole("button", { name: "Delete" });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByText("Confirm Floral Chandeliers")).not.toBeInTheDocument();
      const updated = planStorage.getById("plan-test-1");
      expect(updated?.milestones.some((m) => m.title === "Confirm Floral Chandeliers")).toBe(false);
    });
  });

  it("shows duplicate prevention prompt when generating starter milestones over existing items", async () => {
    const user = userEvent.setup();
    planStorage.save(mockPlan);

    render(<TimelinePlannerView />);

    const generateBtn = screen.getByRole("button", { name: /Generate Starter Timeline/i });
    await user.click(generateBtn);

    // Duplicate prevention warning banner should appear
    expect(screen.getByText("Milestones Already Exist")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Append Starter Deliverables/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Replace All Existing/i })).toBeInTheDocument();
  });

  it("switches to Day-of Run Sheet tab and displays schedule items", async () => {
    const user = userEvent.setup();
    planStorage.save(mockPlan);

    render(<TimelinePlannerView />);

    const runSheetTab = screen.getByRole("button", { name: /Day-of Run Sheet/i });
    await user.click(runSheetTab);

    expect(screen.getByText("Florist Installation & Load-in")).toBeInTheDocument();
    expect(screen.getByText("09:00 – 11:30")).toBeInTheDocument();
    expect(screen.getByText("Guest Arrival & Prelude Music")).toBeInTheDocument();
    expect(screen.getByText("13:30 – 14:00")).toBeInTheDocument();
  });
});
