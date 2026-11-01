import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VendorChecklistView } from "@/features/vendors/VendorChecklistView";
import { planStorage } from "@/lib/storage/planStorage";
import type { EventPlan } from "@/types/event";

const mockVendorPlan: EventPlan = {
  id: "plan-vendor-test-1",
  eventDetails: {
    name: "Royal Botanical Wedding",
    eventType: "wedding",
    eventDate: "2027-08-20",
    location: "Kew Conservatory Gardens",
    guestCount: 120,
    totalBudget: 45000,
    currency: "USD",
    theme: "Botanical Royalty",
    culturalPreferences: [],
    dietaryRequirements: [],
    planningPriorities: ["Venue", "Catering"],
    additionalInstructions: "",
  },
  overview: {
    summary: "A botanical wedding in historic conservatory grounds.",
    personalizedIdeas: ["Glasshouse cocktail hour"],
    themeConcept: "Botanical Royalty",
    colorPalette: ["#1e4d2b", "#d4af37"],
  },
  budget: {
    categories: [
      {
        id: "cat-venue",
        name: "Venue & Rentals",
        items: [
          {
            id: "bgt-1",
            name: "Conservatory Glasshouse Rental",
            estimatedCost: 10000,
            priority: "high",
            categoryId: "cat-venue",
          },
        ],
      },
    ],
    contingencyRate: 0.1,
    calculation: {
      currency: "USD",
      totalBudget: 45000,
      categorySubtotal: 10000,
      contingencyRate: 0.1,
      contingencyAmount: 1000,
      totalEstimatedCost: 11000,
      remainingBudget: 34000,
      isOverBudget: false,
      overBudgetAmount: 0,
      categoryBreakdown: [],
      warnings: [],
    },
  },
  milestones: [],
  schedule: [],
  checklist: [],
  vendors: [
    {
      id: "v-1",
      name: "The Glasshouse Conservatory",
      category: "venue",
      bookingStatus: "booked",
      cost: 10000,
      contactName: "Julian Vance",
      phone: "+1 555-0199",
      email: "julian@glasshouse.example.com",
      website: "https://glasshouse.example.com",
      notes: "Main ballroom and terrace reserved",
      checklist: [
        {
          id: "t-1",
          title: "Execute rental contract",
          completed: true,
          dueDate: "2026-12-01",
        },
        {
          id: "t-2",
          title: "Pay security deposit",
          completed: false,
          dueDate: "2027-01-15",
        },
      ],
      budgetLineItemId: "bgt-1",
      createdAt: "2026-10-30T12:00:00.000Z",
      updatedAt: "2026-10-30T12:00:00.000Z",
    },
    {
      id: "v-2",
      name: "Artisanal Feast Catering Co.",
      category: "catering",
      bookingStatus: "contacted",
      cost: 7500,
      contactName: "Chef Claire",
      phone: "+1 555-0188",
      email: "claire@artisanfeast.example.com",
      checklist: [
        {
          id: "t-3",
          title: "Schedule tasting menu",
          completed: false,
          dueDate: "2027-02-10",
        },
      ],
      createdAt: "2026-10-30T12:00:00.000Z",
      updatedAt: "2026-10-30T12:00:00.000Z",
    },
  ],
  metadata: {
    createdAt: "2026-10-30T12:00:00.000Z",
    version: 1,
    currency: "USD",
    eventType: "wedding",
  },
};

describe("VendorChecklistView Component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders empty state when no saved plans exist and allows quick checklist creation", async () => {
    render(<VendorChecklistView />);

    expect(screen.getByRole("heading", { level: 1, name: "Vendor Checklist" })).toBeInTheDocument();
    expect(screen.getByText("No Celebrations Planned Yet")).toBeInTheDocument();

    const quickStartBtn = screen.getByRole("button", { name: /Start Quick Checklist/i });
    expect(quickStartBtn).toBeInTheDocument();

    fireEvent.click(quickStartBtn);

    await waitFor(() => {
      expect(screen.getByText("My Upcoming Celebration")).toBeInTheDocument();
      expect(screen.getByText("Total Vendors")).toBeInTheDocument();
      expect(screen.getByText("Booked Vendors")).toBeInTheDocument();
    });
  });

  it("renders with active celebration plan, KPI summary cards, and vendor cards", () => {
    planStorage.save(mockVendorPlan);

    render(<VendorChecklistView />);

    expect(screen.getByRole("heading", { level: 1, name: "Vendor Checklist" })).toBeInTheDocument();
    expect(screen.getByText("Royal Botanical Wedding")).toBeInTheDocument();

    // Summary KPI cards
    expect(screen.getByTitle("Total Vendors")).toBeInTheDocument();
    expect(screen.getByTitle("Booked Vendors")).toBeInTheDocument();
    expect(screen.getByTitle("Outstanding Tasks")).toBeInTheDocument();
    expect(screen.getByTitle("Overdue Tasks")).toBeInTheDocument();

    // Vendor cards
    expect(screen.getByText("The Glasshouse Conservatory")).toBeInTheDocument();
    expect(screen.getByText("Artisanal Feast Catering Co.")).toBeInTheDocument();
  });

  it("allows adding a new vendor via VendorModal", async () => {
    const user = userEvent.setup();
    planStorage.save(mockVendorPlan);

    render(<VendorChecklistView />);

    const addVendorBtn = screen.getByRole("button", { name: /Add Vendor/i });
    await user.click(addVendorBtn);

    // Modal dialog opens
    const modal = screen.getByRole("dialog", { name: /Add New Vendor/i });
    expect(modal).toBeInTheDocument();

    // Fill form
    const nameInput = screen.getByLabelText(/Vendor or Business Name/i);
    await user.type(nameInput, "Lumière Cinematic Photography");

    const categorySelect = screen.getByLabelText(/Service Category/i);
    fireEvent.change(categorySelect, { target: { value: "photography" } });

    const costInput = screen.getByLabelText(/Quoted \/ Agreed Cost/i);
    await user.type(costInput, "3800");

    const saveBtn = within(modal).getByRole("button", { name: /Save Vendor/i });
    await user.click(saveBtn);

    // Modal closes and vendor appears
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByText("Lumière Cinematic Photography")).toBeInTheDocument();
    });

    // Verify storage updated with starter tasks
    const updated = planStorage.getById("plan-vendor-test-1");
    const added = updated?.vendors?.find((v) => v.name === "Lumière Cinematic Photography");
    expect(added).toBeDefined();
    expect(added?.category).toBe("photography");
    expect(added?.cost).toBe(3800);
    expect(added?.checklist.length).toBe(7); // 7 starter deliverables included
  });

  it("allows editing an existing vendor", async () => {
    const user = userEvent.setup();
    planStorage.save(mockVendorPlan);

    render(<VendorChecklistView />);

    const editBtn = screen.getByRole("button", {
      name: /Edit vendor "The Glasshouse Conservatory"/i,
    });
    await user.click(editBtn);

    const modal = screen.getByRole("dialog", { name: /Edit Vendor Details/i });
    expect(modal).toBeInTheDocument();

    // Change cost
    const costInput = screen.getByLabelText(/Quoted \/ Agreed Cost/i);
    await user.clear(costInput);
    await user.type(costInput, "11500");

    const saveBtn = within(modal).getByRole("button", { name: /Save Changes/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    const updated = planStorage.getById("plan-vendor-test-1");
    const item = updated?.vendors?.find((v) => v.id === "v-1");
    expect(item?.cost).toBe(11500);
  });

  it("allows deleting a vendor with confirmation dialog", async () => {
    const user = userEvent.setup();
    planStorage.save(mockVendorPlan);

    render(<VendorChecklistView />);

    const deleteBtn = screen.getByRole("button", {
      name: /Delete vendor "Artisanal Feast Catering Co."/i,
    });
    await user.click(deleteBtn);

    expect(screen.getByRole("alertdialog", { name: /Delete Vendor/i })).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: /^Delete Vendor$/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(screen.queryByText("Artisanal Feast Catering Co.")).not.toBeInTheDocument();
    });

    const updated = planStorage.getById("plan-vendor-test-1");
    expect(updated?.vendors?.some((v) => v.id === "v-2")).toBe(false);
  });

  it("toggles task completion and updates progress", async () => {
    planStorage.save(mockVendorPlan);

    render(<VendorChecklistView />);

    // Toggle task "Pay security deposit" (currently incomplete)
    const toggleBtn = screen.getByRole("button", {
      name: /Mark task "Pay security deposit" as completed/i,
    });
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      const updated = planStorage.getById("plan-vendor-test-1");
      const vendor = updated?.vendors?.find((v) => v.id === "v-1");
      const task = vendor?.checklist.find((t) => t.id === "t-2");
      expect(task?.completed).toBe(true);
    });
  });

  it("allows adding a new task to a vendor checklist", async () => {
    const user = userEvent.setup();
    planStorage.save(mockVendorPlan);

    render(<VendorChecklistView />);

    // Find "Add Task" buttons
    const addTaskBtns = screen.getAllByRole("button", { name: /Add Task/i });
    await user.click(addTaskBtns[0]);

    const modal = screen.getByRole("dialog", { name: /Add Vendor Task/i });
    expect(modal).toBeInTheDocument();

    const titleInput = screen.getByLabelText(/Task Title/i);
    await user.type(titleInput, "Finalize sound technician arrival");

    const saveBtn = within(modal).getByRole("button", { name: /^Add Task$/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByText("Finalize sound technician arrival")).toBeInTheDocument();
    });

    const updated = planStorage.getById("plan-vendor-test-1");
    const allTasks = updated?.vendors?.flatMap((v) => v.checklist) || [];
    expect(allTasks.some((t) => t.title === "Finalize sound technician arrival")).toBe(true);
  });

  it("filters vendors by search query and booking status", async () => {
    planStorage.save(mockVendorPlan);

    render(<VendorChecklistView />);

    // Search query
    const searchInput = screen.getByLabelText(/Search vendors by name or contact/i);
    fireEvent.change(searchInput, { target: { value: "Claire" } });

    await waitFor(() => {
      expect(screen.getByText("Artisanal Feast Catering Co.")).toBeInTheDocument();
      expect(screen.queryByText("The Glasshouse Conservatory")).not.toBeInTheDocument();
    });

    // Clear search
    fireEvent.change(searchInput, { target: { value: "" } });

    // Filter by Booked pill
    const bookedPill = screen.getByRole("button", { name: /Booked/i });
    fireEvent.click(bookedPill);

    await waitFor(() => {
      expect(screen.getByText("The Glasshouse Conservatory")).toBeInTheDocument();
      expect(screen.queryByText("Artisanal Feast Catering Co.")).not.toBeInTheDocument();
    });
  });

  it("changing status to cancelled preserves record without deleting it", () => {
    planStorage.save(mockVendorPlan);

    render(<VendorChecklistView />);

    const statusSelect = screen.getByLabelText(/Change booking status for The Glasshouse Conservatory/i);
    fireEvent.change(statusSelect, { target: { value: "cancelled" } });

    // Verify record still exists in storage with status cancelled
    const updated = planStorage.getById("plan-vendor-test-1");
    const vendor = updated?.vendors?.find((v) => v.id === "v-1");
    expect(vendor).toBeDefined();
    expect(vendor?.bookingStatus).toBe("cancelled");
  });
});
