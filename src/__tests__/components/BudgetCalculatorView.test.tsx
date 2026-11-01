import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BudgetCalculatorView } from "@/features/budget/BudgetCalculatorView";
import { planStorage } from "@/lib/storage/planStorage";
import type { EventPlan } from "@/types/event";

const mockBudgetPlan: EventPlan = {
  id: "plan-budget-test-1",
  eventDetails: {
    name: "Golden Anniversary Gala",
    eventType: "wedding",
    eventDate: "2027-09-15",
    location: "Grand Heritage Hall",
    guestCount: 150,
    totalBudget: 50000,
    currency: "USD",
    theme: "Golden Elegance",
    culturalPreferences: [],
    dietaryRequirements: [],
    planningPriorities: ["Catering", "Entertainment"],
    additionalInstructions: "",
  },
  overview: {
    summary: "An opulent golden jubilee celebration.",
    personalizedIdeas: ["Gold leaf dessert", "Big band orchestra"],
    themeConcept: "Timeless Gold",
    colorPalette: ["#d4af37", "#1a1a1a"],
  },
  budget: {
    categories: [
      {
        id: "cat-venue",
        name: "Venue & Rentals",
        allocatedAmount: 20000,
        items: [
          {
            id: "item-venue-1",
            categoryId: "cat-venue",
            name: "Grand Ballroom Rental",
            estimatedCost: 15000,
            actualCost: 16000, // Overrun of $1000
            paymentStatus: "paid",
            priority: "high",
          },
          {
            id: "item-venue-2",
            categoryId: "cat-venue",
            name: "Linen & Chair Covers",
            estimatedCost: 2000,
            actualCost: 1800,
            paymentStatus: "partially_paid",
            priority: "medium",
          },
        ],
      },
      {
        id: "cat-catering",
        name: "Catering & Beverage",
        allocatedAmount: 18000,
        items: [
          {
            id: "item-cat-1",
            categoryId: "cat-catering",
            name: "Four-Course Plated Dinner",
            estimatedCost: 14000,
            paymentStatus: "unpaid",
            priority: "high",
          },
        ],
      },
    ],
    contingencyRate: 0.1,
    calculation: {
      currency: "USD",
      totalBudget: 50000,
      categorySubtotal: 31000,
      contingencyRate: 0.1,
      contingencyAmount: 5000,
      totalEstimatedCost: 36000,
      remainingBudget: 14000,
      isOverBudget: false,
      overBudgetAmount: 0,
      categoryBreakdown: [
        {
          categoryId: "cat-venue",
          categoryName: "Venue & Rentals",
          subtotal: 17000,
          percentageOfTotal: 34,
          itemCount: 2,
        },
        {
          categoryId: "cat-catering",
          categoryName: "Catering & Beverage",
          subtotal: 14000,
          percentageOfTotal: 28,
          itemCount: 1,
        },
      ],
      warnings: [],
    },
  },
  milestones: [],
  schedule: [],
  checklist: [],
  metadata: {
    createdAt: "2026-10-30T12:00:00.000Z",
    version: 1,
    currency: "USD",
    eventType: "wedding",
  },
};

describe("BudgetCalculatorView Component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders empty state when no saved plans exist and allows quick budget creation", async () => {
    render(<BudgetCalculatorView />);

    expect(screen.getByRole("heading", { level: 1, name: "Smart Budget Calculator" })).toBeInTheDocument();
    expect(screen.getByText("No Budget Plans Found")).toBeInTheDocument();

    const quickStartBtn = screen.getByRole("button", { name: /Start Quick Budget/i });
    expect(quickStartBtn).toBeInTheDocument();

    fireEvent.click(quickStartBtn);

    await waitFor(() => {
      expect(screen.getByText("My Upcoming Celebration")).toBeInTheDocument();
      expect(screen.getByText("Total Budget")).toBeInTheDocument();
      expect(screen.getByText("Actual Spent")).toBeInTheDocument();
    });
  });

  it("renders with active celebration plan and summary KPI cards", () => {
    planStorage.save(mockBudgetPlan);

    render(<BudgetCalculatorView />);

    expect(screen.getByRole("heading", { level: 1, name: "Smart Budget Calculator" })).toBeInTheDocument();
    expect(screen.getByText("Golden Anniversary Gala")).toBeInTheDocument();

    // KPI Cards
    expect(screen.getByText("Total Budget")).toBeInTheDocument();
    expect(screen.getByText("Estimated Subtotal")).toBeInTheDocument();
    expect(screen.getByText("Actual Spent")).toBeInTheDocument();
    expect(screen.getByText("Remaining Cushion")).toBeInTheDocument();
    expect(screen.getByText("Contingency Reserve")).toBeInTheDocument();
  });

  it("renders category allocation breakdown with progress", () => {
    planStorage.save(mockBudgetPlan);

    render(<BudgetCalculatorView />);

    // Check category headers
    expect(screen.getByText("Category Allocation Breakdown")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Venue & Rentals" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Catering & Beverage" })).toBeInTheDocument();
  });

  it("renders expenses list and displays overrun indicators", () => {
    planStorage.save(mockBudgetPlan);

    render(<BudgetCalculatorView />);

    expect(screen.getByText("Grand Ballroom Rental")).toBeInTheDocument();
    expect(screen.getByText("Linen & Chair Covers")).toBeInTheDocument();
    expect(screen.getByText("Four-Course Plated Dinner")).toBeInTheDocument();

    // Grand Ballroom has actualCost 16000 > estimatedCost 15000 -> overrun badge
    expect(screen.getByText(/\+\$1,000\.00 Over Estimate/i)).toBeInTheDocument();
  });

  it("filters expenses by payment status and category", async () => {
    planStorage.save(mockBudgetPlan);

    render(<BudgetCalculatorView />);

    // Filter by Paid via pill button
    const paidFilterBtn = screen.getByRole("button", { name: /Fully Paid/i });
    fireEvent.click(paidFilterBtn);

    await waitFor(() => {
      expect(screen.getByText("Grand Ballroom Rental")).toBeInTheDocument();
      expect(screen.queryByText("Four-Course Plated Dinner")).not.toBeInTheDocument();
    });

    // Reset filter via All Items
    const allFilterBtn = screen.getByRole("button", { name: /All Items/i });
    fireEvent.click(allFilterBtn);

    await waitFor(() => {
      expect(screen.getByText("Four-Course Plated Dinner")).toBeInTheDocument();
    });
  });

  it("allows adding a new expense via the ExpenseModal", async () => {
    const user = userEvent.setup();
    planStorage.save(mockBudgetPlan);

    render(<BudgetCalculatorView />);

    const addExpenseBtn = screen.getByRole("button", { name: /Add Expense/i });
    await user.click(addExpenseBtn);

    // Modal opens
    const modal = screen.getByRole("dialog", { name: /Add Budget Expense/i });
    expect(modal).toBeInTheDocument();

    // Fill in form
    const nameInput = screen.getByLabelText(/Expense Name/i);
    await user.type(nameInput, "Jazz Quartet Live Band");

    const costInput = screen.getByLabelText(/Estimated Cost/i);
    await user.clear(costInput);
    await user.type(costInput, "3500");

    const saveBtn = within(modal).getByRole("button", { name: /Add Expense/i });
    await user.click(saveBtn);

    // Modal closes and item appears
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByText("Jazz Quartet Live Band")).toBeInTheDocument();
    });

    // Verify storage updated
    const updated = planStorage.getById("plan-budget-test-1");
    const allItems = updated?.budget.categories.flatMap((c) => c.items) || [];
    expect(allItems.some((i) => i.name === "Jazz Quartet Live Band")).toBe(true);
  });

  it("allows editing an existing expense", async () => {
    const user = userEvent.setup();
    planStorage.save(mockBudgetPlan);

    render(<BudgetCalculatorView />);

    // Find edit button for Grand Ballroom Rental
    const editBtn = screen.getByRole("button", { name: /Edit expense "Grand Ballroom Rental"/i });
    await user.click(editBtn);

    expect(screen.getByRole("dialog", { name: /Edit Expense Item/i })).toBeInTheDocument();

    // Update actual cost
    const actualCostInput = screen.getByLabelText(/Actual Cost/i);
    await user.clear(actualCostInput);
    await user.type(actualCostInput, "17500");

    const saveBtn = screen.getByRole("button", { name: /Save Changes/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // Verify updated storage
    const updated = planStorage.getById("plan-budget-test-1");
    const item = updated?.budget.categories.flatMap((c) => c.items).find((i) => i.id === "item-venue-1");
    expect(item?.actualCost).toBe(17500);
  });

  it("allows deleting an expense with confirmation dialog", async () => {
    const user = userEvent.setup();
    planStorage.save(mockBudgetPlan);

    render(<BudgetCalculatorView />);

    const deleteBtn = screen.getByRole("button", { name: /Delete expense "Linen & Chair Covers"/i });
    await user.click(deleteBtn);

    expect(screen.getByRole("alertdialog", { name: /Delete Expense/i })).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: /^Delete Expense$/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(screen.queryByText("Linen & Chair Covers")).not.toBeInTheDocument();
    });

    const updated = planStorage.getById("plan-budget-test-1");
    const allItems = updated?.budget.categories.flatMap((c) => c.items) || [];
    expect(allItems.some((i) => i.id === "item-venue-2")).toBe(false);
  });

  it("allows adjusting the contingency rate", async () => {
    const user = userEvent.setup();
    planStorage.save(mockBudgetPlan);

    render(<BudgetCalculatorView />);

    const adjustBtn = screen.getByRole("button", { name: /Adjust Reserve/i });
    await user.click(adjustBtn);

    expect(screen.getByRole("dialog", { name: /Adjust Contingency Reserve/i })).toBeInTheDocument();

    // Click 15% preset button
    const preset15 = screen.getByRole("button", { name: /^15%$/i });
    await user.click(preset15);

    const applyBtn = screen.getByRole("button", { name: /Apply Reserve/i });
    await user.click(applyBtn);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    const updated = planStorage.getById("plan-budget-test-1");
    expect(updated?.budget.contingencyRate).toBe(0.15);
  });
});
