import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PlanDashboardView } from "@/features/planner/PlanDashboardView";
import { calculateBudget } from "@/features/budget";
import type { EventPlan } from "@/types/event";

const mockCategories = [
  {
    id: "cat-venue",
    name: "Venue & Permits",
    allocatedAmount: 12000,
    items: [
      {
        id: "item-bluff-rental",
        categoryId: "cat-venue",
        name: "Bluff Ceremony Site Rental",
        estimatedCost: 8000,
        priority: "high" as const,
        notes: "Includes chairs and arbor setup",
      },
      {
        id: "item-reception-tent",
        categoryId: "cat-venue",
        name: "Sailcloth Reception Tent",
        estimatedCost: 4000,
        priority: "medium" as const,
        notes: "Heated for ocean breeze",
      },
    ],
  },
  {
    id: "cat-catering",
    name: "Catering & Bar",
    allocatedAmount: 11000,
    items: [
      {
        id: "item-plated-dinner",
        categoryId: "cat-catering",
        name: "Plated Coastal Dinner (80 guests)",
        estimatedCost: 8000,
        priority: "high" as const,
        notes: "Locally sourced sea bass and prime rib",
      },
      {
        id: "item-bar-service",
        categoryId: "cat-catering",
        name: "Open Wine & Bar Service",
        estimatedCost: 3000,
        priority: "medium" as const,
        notes: "Central Coast vintages",
      },
    ],
  },
];

const mockCalculation = calculateBudget({
  totalBudget: 30000,
  currency: "USD",
  categories: mockCategories,
  contingencyRate: 0.1,
});

const mockSamplePlan: EventPlan = {
  id: "plan-sample-123",
  eventDetails: {
    name: "Aria & Ethan's Coastal Wedding",
    eventType: "wedding",
    eventDate: "2026-12-15",
    location: "Carmel Beach, CA",
    guestCount: 80,
    totalBudget: 30000,
    currency: "USD",
    theme: "Coastal Elegance",
    culturalPreferences: ["Bilingual ceremony"],
    dietaryRequirements: ["Vegetarian options", "Nut-free"],
    planningPriorities: ["Scenic photography", "Farm-to-table dining"],
    additionalInstructions: "Prefer natural daylight and sunset toasts.",
  },
  overview: {
    summary:
      "A serene and elegant seaside wedding celebration blending coastal charm with intimate dining.",
    themeConcept: "Coastal Elegance with seafoam blue and warm sand palettes.",
    colorPalette: ["#F4E8C1", "#78909C", "#263238", "#E07A5F"],
    personalizedIdeas: [
      "Sunset exchange of vows on Carmel bluffs",
      "Locally sourced artisanal seafood and vineyard pairings",
      "Acoustic guitar accompaniment during cocktail hour",
    ],
  },
  budget: {
    categories: mockCategories,
    contingencyRate: 0.1,
    calculation: mockCalculation,
  },
  milestones: [
    {
      id: "ms-1",
      title: "Secure Venue Permit & Deposit",
      targetDate: "2026-11-01",
      daysBeforeEvent: 44,
      category: "venue",
      description: "Finalize coastal permit and reserve bluff site.",
      completed: true,
    },
    {
      id: "ms-2",
      title: "Confirm Floral & Rentals",
      targetDate: "2026-11-20",
      daysBeforeEvent: 25,
      category: "decor",
      description: "Select coastal floral arrangements and table runners.",
      completed: false,
    },
  ],
  schedule: [
    {
      id: "sch-1",
      startTime: "15:00",
      endTime: "16:00",
      title: "Vendor Load-in & Floral Setup",
      location: "Carmel Bluff Site",
      description: "Florist and rental company place arbor and seating.",
      responsibleRole: "Coordinator & Rentals Team",
    },
    {
      id: "sch-2",
      startTime: "17:00",
      endTime: "18:00",
      title: "Ceremony & Vows",
      location: "Bluff Vista",
      description: "Guest seating and sunset ceremony.",
      responsibleRole: "Officiant & Couple",
    },
  ],
  checklist: [
    {
      id: "chk-1",
      title: "Review marriage license paperwork",
      category: "legal",
      status: "pending",
      priority: "high",
      dueDate: "2026-12-01",
      notes: "Couple to obtain from county clerk",
    },
    {
      id: "chk-2",
      title: "Confirm dietary choices with caterer",
      category: "catering",
      status: "completed",
      priority: "high",
      dueDate: "2026-11-25",
      notes: "Wedding Planner",
    },
  ],
  metadata: {
    createdAt: "2026-10-30T10:00:00.000Z",
    version: 1,
    currency: "USD",
    eventType: "wedding",
  },
};

describe("PlanDashboardView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders plan title, header info, and overview summary", () => {
    render(<PlanDashboardView initialPlan={mockSamplePlan} />);

    expect(screen.getByRole("heading", { level: 1, name: /Aria & Ethan's Coastal Wedding/i })).toBeInTheDocument();
    expect(screen.getByText("Carmel Beach, CA")).toBeInTheDocument();
    expect(screen.getByText("80 Guests")).toBeInTheDocument();
    expect(screen.getByText(/serene and elegant seaside wedding/i)).toBeInTheDocument();
  });

  it("renders deterministic budget cards, category subtotals, and contingency", () => {
    render(<PlanDashboardView initialPlan={mockSamplePlan} />);

    // Total budget card
    expect(screen.getByText("$30,000.00")).toBeInTheDocument();
    // Safety reserve
    expect(screen.getByText(/10% safety reserve/i)).toBeInTheDocument();
    expect(screen.getByText("$2,300.00")).toBeInTheDocument();
    // Remaining cushion
    expect(screen.getByText("$4,700.00")).toBeInTheDocument();
    // Categories
    expect(screen.getByText("Venue & Permits")).toBeInTheDocument();
    expect(screen.getByText("Catering & Bar")).toBeInTheDocument();
  });

  it("displays over-budget warning when plan exceeds total budget", () => {
    const overBudgetCalc = calculateBudget({
      totalBudget: 20000,
      currency: "USD",
      categories: mockCategories,
      contingencyRate: 0.1,
    });

    const overBudgetPlan: EventPlan = {
      ...mockSamplePlan,
      budget: {
        ...mockSamplePlan.budget,
        calculation: overBudgetCalc,
      },
    };

    render(<PlanDashboardView initialPlan={overBudgetPlan} />);
    expect(screen.getByText(/Estimated costs exceed your target budget/i)).toBeInTheDocument();
  });

  it("toggles category accordion expand and collapse", () => {
    render(<PlanDashboardView initialPlan={mockSamplePlan} />);

    // First category is expanded by default (Venue & Permits)
    expect(screen.getByText("Bluff Ceremony Site Rental")).toBeInTheDocument();

    // Second category (Catering & Bar) is collapsed initially
    expect(screen.queryByText("Plated Coastal Dinner (80 guests)")).not.toBeInTheDocument();

    // Click Catering & Bar header to expand
    const cateringHeader = screen.getByRole("button", { name: /Catering & Bar/i });
    fireEvent.click(cateringHeader);

    // Now items in catering should be visible
    expect(screen.getByText("Plated Coastal Dinner (80 guests)")).toBeInTheDocument();
  });

  it("allows toggling timeline milestone completion status", () => {
    render(<PlanDashboardView initialPlan={mockSamplePlan} />);

    const milestone2Btn = screen.getByRole("button", {
      name: /Mark milestone "Confirm Floral & Rentals" as completed/i,
    });
    expect(milestone2Btn).toBeInTheDocument();

    fireEvent.click(milestone2Btn);

    // After clicking, button label updates to mark as pending
    expect(
      screen.getByRole("button", {
        name: /Mark milestone "Confirm Floral & Rentals" as pending/i,
      })
    ).toBeInTheDocument();
  });

  it("renders run-of-show schedule intervals", () => {
    render(<PlanDashboardView initialPlan={mockSamplePlan} />);

    expect(screen.getByText("15:00 – 16:00")).toBeInTheDocument();
    expect(screen.getByText("Vendor Load-in & Floral Setup")).toBeInTheDocument();
    expect(screen.getByText("17:00 – 18:00")).toBeInTheDocument();
    expect(screen.getByText("Ceremony & Vows")).toBeInTheDocument();
  });

  it("allows filtering checklist tasks and toggling task status", () => {
    render(<PlanDashboardView initialPlan={mockSamplePlan} />);

    // Check tasks exist
    expect(screen.getByText("Review marriage license paperwork")).toBeInTheDocument();
    expect(screen.getByText("Confirm dietary choices with caterer")).toBeInTheDocument();

    // Filter to "completed" status button
    const completedFilterBtn = screen.getByRole("button", { name: /^completed$/i });
    fireEvent.click(completedFilterBtn);

    // Completed task is present, pending task is filtered out
    expect(screen.getByText("Confirm dietary choices with caterer")).toBeInTheDocument();
    expect(screen.queryByText("Review marriage license paperwork")).not.toBeInTheDocument();

    // Reset filter with "all" status button (first one is status group)
    const allFilterBtns = screen.getAllByRole("button", { name: /^all$/i });
    fireEvent.click(allFilterBtns[0]);
    expect(screen.getByText("Review marriage license paperwork")).toBeInTheDocument();

    // Toggle pending task
    const taskToggleBtn = screen.getByRole("button", {
      name: /Toggle task "Review marriage license paperwork" status/i,
    });
    fireEvent.click(taskToggleBtn);

    // After toggling, the task title has line-through styling or completed status
    expect(screen.getByText("2 of 2 Completed (100%)")).toBeInTheDocument();
  });

  it("opens AI refinement panel and handles successful refinement", async () => {
    const refinedMockPlan: EventPlan = {
      ...mockSamplePlan,
      metadata: {
        ...mockSamplePlan.metadata,
        version: 2,
      },
      overview: {
        ...mockSamplePlan.overview,
        summary: "Updated celebration with sunset bonfire afterparty.",
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: refinedMockPlan,
      }),
    });

    render(<PlanDashboardView initialPlan={mockSamplePlan} />);

    // Click "Refine with AI" button
    const refineToggleBtn = screen.getByRole("button", { name: /Refine with AI/i });
    fireEvent.click(refineToggleBtn);

    // Refinement panel opens
    expect(screen.getByRole("heading", { level: 2, name: /Refine Celebration Plan with Gemini/i })).toBeInTheDocument();

    // Fill instructions
    const promptInput = screen.getByLabelText(/Refinement Instructions/i);
    fireEvent.change(promptInput, {
      target: { value: "Add a sunset beach bonfire session after dinner." },
    });

    // Submit refinement
    const submitRefineBtn = screen.getByRole("button", { name: /Submit Refinement/i });
    fireEvent.click(submitRefineBtn);

    await waitFor(() => {
      expect(screen.getByText(/Celebration plan successfully updated with your refinements!/i)).toBeInTheDocument();
      expect(screen.getByText(/Updated celebration with sunset bonfire afterparty/i)).toBeInTheDocument();
    });
  });

  it("handles AI refinement error gracefully and preserves existing plan", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        error: { code: "RATE_LIMIT", message: "Too many requests. Please wait a minute." },
      }),
    });

    render(<PlanDashboardView initialPlan={mockSamplePlan} />);

    fireEvent.click(screen.getByRole("button", { name: /Refine with AI/i }));

    fireEvent.change(screen.getByLabelText(/Refinement Instructions/i), {
      target: { value: "Shrink the guest list to 50." },
    });

    fireEvent.click(screen.getByRole("button", { name: /Submit Refinement/i }));

    await waitFor(() => {
      expect(screen.getByText(/Too many requests. Please wait a minute/i)).toBeInTheDocument();
      // Original plan overview summary remains displayed
      expect(screen.getByText(/serene and elegant seaside wedding/i)).toBeInTheDocument();
    });
  });

  it("invokes window.print when print button is clicked", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<PlanDashboardView initialPlan={mockSamplePlan} />);

    const printBtn = screen.getByRole("button", { name: /Print celebration plan/i });
    fireEvent.click(printBtn);

    expect(printSpy).toHaveBeenCalled();
  });

  it("triggers markdown export download when export button is clicked", () => {
    const mockCreateObjectURL = vi.fn().mockReturnValue("blob:test-url");
    const mockRevokeObjectURL = vi.fn();
    window.URL.createObjectURL = mockCreateObjectURL;
    window.URL.revokeObjectURL = mockRevokeObjectURL;

    render(<PlanDashboardView initialPlan={mockSamplePlan} />);

    const exportBtn = screen.getByRole("button", { name: /Export celebration plan as Markdown file/i });
    fireEvent.click(exportBtn);

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:test-url");
  });
});
