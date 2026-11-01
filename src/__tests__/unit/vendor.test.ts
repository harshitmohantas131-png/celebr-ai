import { describe, it, expect } from "vitest";
import { vendorSchema } from "@/lib/schemas/vendor";
import { eventPlanSchema } from "@/lib/schemas/plan";
import {
  createStarterVendorTasks,
  calculateVendorMetrics,
  filterAndSortVendors,
  isTaskOverdue,
} from "@/features/vendors/vendorService";
import type { Vendor, VendorTask } from "@/types/vendor";

describe("Vendor & Checklist Domain Schemas", () => {
  it("validates a complete vendor record", () => {
    const validVendor = {
      id: "v-1",
      name: "Grand Ballroom & Heritage Gardens",
      category: "venue",
      contactName: "Julian Vance",
      phone: "+1 555-0144",
      email: "events@grandballroom.com",
      website: "https://grandballroom.com",
      cost: 8500,
      bookingStatus: "booked",
      notes: "Main reception hall and garden terrace included",
      checklist: [
        {
          id: "t-1",
          title: "Sign contract",
          completed: true,
          dueDate: "2027-01-15",
        },
      ],
      budgetLineItemId: "bgt-1",
      createdAt: "2026-10-30T12:00:00.000Z",
      updatedAt: "2026-10-30T12:00:00.000Z",
    };

    const result = vendorSchema.safeParse(validVendor);
    expect(result.success).toBe(true);
  });

  it("validates a minimal vendor record without contact info", () => {
    const minimal = {
      id: "v-min",
      name: "Artisan Bakery",
      category: "catering",
      bookingStatus: "shortlisted",
      checklist: [],
    };

    const result = vendorSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Artisan Bakery");
      expect(result.data.bookingStatus).toBe("shortlisted");
    }
  });

  it("rejects invalid vendor inputs", () => {
    // Empty name
    expect(
      vendorSchema.safeParse({
        id: "v-2",
        name: "   ",
        category: "venue",
      }).success
    ).toBe(false);

    // Negative cost
    expect(
      vendorSchema.safeParse({
        id: "v-3",
        name: "Floral Studio",
        category: "decor",
        cost: -500,
      }).success
    ).toBe(false);

    // Invalid email
    expect(
      vendorSchema.safeParse({
        id: "v-4",
        name: "Floral Studio",
        category: "decor",
        email: "not-an-email",
      }).success
    ).toBe(false);

    // Invalid website URL
    expect(
      vendorSchema.safeParse({
        id: "v-5",
        name: "Floral Studio",
        category: "decor",
        website: "http:// invalid url with spaces",
      }).success
    ).toBe(false);

    // Invalid category
    expect(
      vendorSchema.safeParse({
        id: "v-6",
        name: "Floral Studio",
        category: "astronauts",
      }).success
    ).toBe(false);
  });

  it("safely loads older plans without vendors field by defaulting to an empty array", () => {
    const legacyPlan = {
      id: "plan-legacy-1",
      eventDetails: {
        name: "Legacy Birthday",
        eventType: "birthday",
        eventDate: "2027-04-10",
        location: "City Park",
        guestCount: 50,
        totalBudget: 10000,
        currency: "USD",
        theme: "Retro Arcade",
        culturalPreferences: [],
        dietaryRequirements: [],
        planningPriorities: [],
        additionalInstructions: "",
      },
      overview: {
        summary: "A retro birthday celebration.",
        personalizedIdeas: ["Pinball tournament"],
      },
      budget: {
        categories: [
          {
            id: "cat-1",
            name: "Venue",
            items: [],
          },
        ],
        contingencyRate: 0.1,
      },
      milestones: [],
      schedule: [],
      checklist: [],
      // vendors is omitted intentionally
      metadata: {
        createdAt: "2026-10-30T12:00:00.000Z",
        version: 1,
        currency: "USD",
        eventType: "birthday",
      },
    };

    const parsed = eventPlanSchema.safeParse(legacyPlan);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.vendors).toEqual([]);
    }
  });
});

describe("Starter Tasks & Overdue Calculations", () => {
  it("generates 7 sensible, distinct starter tasks", () => {
    const starters = createStarterVendorTasks();
    expect(starters).toHaveLength(7);

    const ids = starters.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(7);

    // Verify key deliverables exist
    expect(starters.some((t) => t.title.includes("quotation"))).toBe(true);
    expect(starters.some((t) => t.title.includes("scope"))).toBe(true);
    expect(starters.some((t) => t.title.includes("contract"))).toBe(true);
    expect(starters.some((t) => t.title.includes("deposit"))).toBe(true);
    expect(starters.some((t) => t.title.includes("arrival"))).toBe(true);
    expect(starters.some((t) => t.title.includes("final payment"))).toBe(true);
    expect(starters.some((t) => t.title.includes("deliverables"))).toBe(true);

    // All start uncompleted
    expect(starters.every((t) => !t.completed)).toBe(true);
  });

  it("calculates overdue tasks based on date and completion status", () => {
    const referenceDate = new Date("2026-10-31T00:00:00.000Z");

    const overdueTask: VendorTask = {
      id: "t-overdue",
      title: "Pay deposit",
      dueDate: "2026-10-15", // In the past relative to 2026-10-31
      completed: false,
    };
    expect(isTaskOverdue(overdueTask, referenceDate)).toBe(true);

    const completedTask: VendorTask = {
      id: "t-done",
      title: "Pay deposit",
      dueDate: "2026-10-15",
      completed: true, // Completed tasks are never overdue
    };
    expect(isTaskOverdue(completedTask, referenceDate)).toBe(false);

    const futureTask: VendorTask = {
      id: "t-future",
      title: "Final meeting",
      dueDate: "2026-11-20",
      completed: false,
    };
    expect(isTaskOverdue(futureTask, referenceDate)).toBe(false);

    const noDueDateTask: VendorTask = {
      id: "t-nodate",
      title: "General note",
      completed: false,
    };
    expect(isTaskOverdue(noDueDateTask, referenceDate)).toBe(false);
  });
});

describe("Vendor Metrics & Calculation Engine", () => {
  const sampleVendors: Vendor[] = [
    {
      id: "v-1",
      name: "Grand Hotel",
      category: "venue",
      bookingStatus: "booked",
      cost: 5000,
      checklist: [
        { id: "t-1", title: "Deposit", completed: true },
        { id: "t-2", title: "Balance", completed: false, dueDate: "2026-09-01" }, // Overdue
      ],
      createdAt: "2026-10-01",
      updatedAt: "2026-10-01",
    },
    {
      id: "v-2",
      name: "Gourmet Catering",
      category: "catering",
      bookingStatus: "contacted",
      cost: 3000,
      checklist: [
        { id: "t-3", title: "Tasting", completed: true },
        { id: "t-4", title: "Menu", completed: true },
      ],
      createdAt: "2026-10-01",
      updatedAt: "2026-10-01",
    },
    {
      id: "v-3",
      name: "DJ Beats",
      category: "entertainment",
      bookingStatus: "cancelled", // Cancelled vendor
      cost: 1500,
      checklist: [{ id: "t-5", title: "Playlist", completed: false }],
      createdAt: "2026-10-01",
      updatedAt: "2026-10-01",
    },
  ];

  it("calculates accurate summary metrics and excludes cancelled vendor deliverables", () => {
    const referenceDate = new Date("2026-10-31T00:00:00.000Z");
    const metrics = calculateVendorMetrics(sampleVendors, referenceDate);

    expect(metrics.totalVendors).toBe(3);
    expect(metrics.bookedVendors).toBe(1);
    expect(metrics.contactedVendors).toBe(1);
    expect(metrics.cancelledVendors).toBe(1);

    // Active tasks: Hotel has 2, Catering has 2 (total 4). DJ Beats is cancelled, so ignored.
    expect(metrics.totalTasks).toBe(4);
    // Completed tasks: Hotel (1) + Catering (2) = 3
    expect(metrics.completedTasks).toBe(3);
    // Outstanding tasks: Hotel (1)
    expect(metrics.outstandingTasks).toBe(1);
    // Overdue tasks: Hotel (1)
    expect(metrics.overdueTasks).toBe(1);

    // Completion rate: 3/4 = 75%
    expect(metrics.overallCompletionRate).toBe(75);

    // Total agreed cost excludes cancelled vendor: 5000 + 3000 = 8000
    expect(metrics.totalAgreedCost).toBe(8000);
  });
});

describe("Search, Filter, and Sort Engine", () => {
  const vendors: Vendor[] = [
    {
      id: "v-1",
      name: "Apex Photography Studio",
      category: "photography",
      contactName: "Sarah Connor",
      bookingStatus: "booked",
      cost: 4000,
      checklist: [
        { id: "t-1", title: "Portfolio review", completed: true },
      ],
    },
    {
      id: "v-2",
      name: "Bella Vista Reception",
      category: "venue",
      contactName: "Marcus Aurelius",
      bookingStatus: "shortlisted",
      cost: 12000,
      checklist: [
        { id: "t-2", title: "Tour venue", completed: false, dueDate: "2026-09-01" }, // Overdue
      ],
    },
    {
      id: "v-3",
      name: "Chef Pierre Catering",
      category: "catering",
      contactName: "Pierre Laurent",
      bookingStatus: "contacted",
      cost: 7500,
      checklist: [
        { id: "t-3", title: "Dietary review", completed: false, dueDate: "2027-01-01" },
      ],
    },
  ];

  it("filters by text search across name and contact", () => {
    const byName = filterAndSortVendors(vendors, { searchQuery: "Apex" });
    expect(byName).toHaveLength(1);
    expect(byName[0].name).toBe("Apex Photography Studio");

    const byContact = filterAndSortVendors(vendors, { searchQuery: "Marcus" });
    expect(byContact).toHaveLength(1);
    expect(byContact[0].name).toBe("Bella Vista Reception");
  });

  it("filters by category", () => {
    const venuesOnly = filterAndSortVendors(vendors, { category: "venue" });
    expect(venuesOnly).toHaveLength(1);
    expect(venuesOnly[0].category).toBe("venue");
  });

  it("filters by booking status", () => {
    const bookedOnly = filterAndSortVendors(vendors, { bookingStatus: "booked" });
    expect(bookedOnly).toHaveLength(1);
    expect(bookedOnly[0].name).toBe("Apex Photography Studio");
  });

  it("filters by task status (outstanding and overdue)", () => {
    const referenceDate = new Date("2026-10-31T00:00:00.000Z");

    const withOverdue = filterAndSortVendors(
      vendors,
      { taskFilter: "has_overdue" },
      referenceDate
    );
    expect(withOverdue).toHaveLength(1);
    expect(withOverdue[0].name).toBe("Bella Vista Reception");

    const allCompleted = filterAndSortVendors(vendors, { taskFilter: "all_completed" });
    expect(allCompleted).toHaveLength(1);
    expect(allCompleted[0].name).toBe("Apex Photography Studio");
  });

  it("sorts by cost and name", () => {
    const costDesc = filterAndSortVendors(vendors, { sortBy: "cost-desc" });
    expect(costDesc[0].cost).toBe(12000);
    expect(costDesc[2].cost).toBe(4000);

    const costAsc = filterAndSortVendors(vendors, { sortBy: "cost-asc" });
    expect(costAsc[0].cost).toBe(4000);
    expect(costAsc[2].cost).toBe(12000);

    const nameAsc = filterAndSortVendors(vendors, { sortBy: "name-asc" });
    expect(nameAsc[0].name).toBe("Apex Photography Studio");
    expect(nameAsc[2].name).toBe("Chef Pierre Catering");
  });
});

