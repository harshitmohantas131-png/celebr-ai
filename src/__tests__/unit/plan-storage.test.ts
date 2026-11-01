import { describe, it, expect, beforeEach, vi } from "vitest";
import { planStorage, STORAGE_KEY } from "@/lib/storage/planStorage";
import type { EventPlan } from "@/types/event";

describe("planStorage Client Persistence Service", () => {
  const samplePlan: EventPlan = {
    id: "plan-test-123",
    eventDetails: {
      name: "Maya & Leo's Wedding",
      eventType: "wedding",
      eventDate: "2027-06-15",
      location: "Napa Valley, CA",
      guestCount: 100,
      totalBudget: 35000,
      currency: "USD",
      theme: "Rustic",
      culturalPreferences: [],
      dietaryRequirements: ["Vegetarian"],
      planningPriorities: ["Venue"],
      additionalInstructions: "",
    },
    overview: {
      summary: "A rustic celebration.",
      personalizedIdeas: ["Acoustic duo"],
    },
    budget: {
      categories: [
        {
          id: "venue",
          name: "Venue",
          allocatedAmount: 15000,
          items: [
            {
              id: "v1",
              name: "Hall",
              estimatedCost: 12000,
              priority: "high",
              categoryId: "venue",
            },
          ],
        },
      ],
      contingencyRate: 0.1,
      calculation: {
        currency: "USD",
        totalBudget: 35000,
        categorySubtotal: 12000,
        contingencyRate: 0.1,
        contingencyAmount: 1200,
        totalEstimatedCost: 13200,
        remainingBudget: 21800,
        isOverBudget: false,
        overBudgetAmount: 0,
        categoryBreakdown: [],
        warnings: [],
      },
    },
    milestones: [
      {
        id: "m1",
        title: "Book Hall",
        description: "Sign lease",
        targetDate: "2027-01-15",
        daysBeforeEvent: 151,
        category: "Venue",
        completed: false,
      },
    ],
    schedule: [
      {
        id: "s1",
        title: "Ceremony",
        startTime: "16:00",
        endTime: "17:00",
        description: "Vow exchange",
      },
    ],
    checklist: [
      {
        id: "c1",
        title: "Confirm menu",
        category: "Catering",
        status: "pending",
        priority: "high",
      },
    ],
    metadata: {
      createdAt: "2026-10-30T08:00:00.000Z",
      version: 1,
      currency: "USD",
      eventType: "wedding",
    },
  };

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("checks availability correctly", () => {
    expect(planStorage.isAvailable()).toBe(true);
  });

  it("saves a valid plan and retrieves it via getAll and getById", () => {
    const saved = planStorage.save(samplePlan);
    expect(saved).toBe(true);

    const all = planStorage.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("plan-test-123");
    expect(all[0].eventDetails.name).toBe("Maya & Leo's Wedding");

    const byId = planStorage.getById("plan-test-123");
    expect(byId).toBeDefined();
    expect(byId?.id).toBe("plan-test-123");
  });

  it("returns null when plan ID does not exist", () => {
    expect(planStorage.getById("non-existent-id")).toBeNull();
  });

  it("updates existing plan when saved again with identical ID", () => {
    planStorage.save(samplePlan);

    const updatedPlan: EventPlan = {
      ...samplePlan,
      eventDetails: {
        ...samplePlan.eventDetails,
        name: "Maya & Leo's Updated Wedding",
      },
    };

    planStorage.save(updatedPlan);

    const all = planStorage.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].eventDetails.name).toBe("Maya & Leo's Updated Wedding");
  });

  it("renames a saved plan successfully", () => {
    planStorage.save(samplePlan);

    const renamed = planStorage.rename("plan-test-123", "Leo & Maya's Grand Wedding");
    expect(renamed).toBe(true);

    const plan = planStorage.getById("plan-test-123");
    expect(plan?.eventDetails.name).toBe("Leo & Maya's Grand Wedding");
  });

  it("rejects empty rename string", () => {
    planStorage.save(samplePlan);
    const renamed = planStorage.rename("plan-test-123", "   ");
    expect(renamed).toBe(false);
  });

  it("deletes a saved plan", () => {
    planStorage.save(samplePlan);
    expect(planStorage.getAll()).toHaveLength(1);

    const deleted = planStorage.delete("plan-test-123");
    expect(deleted).toBe(true);
    expect(planStorage.getAll()).toHaveLength(0);
    expect(planStorage.getById("plan-test-123")).toBeNull();
  });

  it("clears all saved plans", () => {
    planStorage.save(samplePlan);
    planStorage.save({ ...samplePlan, id: "plan-test-456" });
    expect(planStorage.getAll()).toHaveLength(2);

    planStorage.clear();
    expect(planStorage.getAll()).toHaveLength(0);
  });

  it("gracefully filters out corrupted or invalid entries in localStorage", () => {
    const corruptData = [
      { invalid: "data" },
      "not an object",
      { version: 1, plan: { ...samplePlan, id: "valid-plan" } },
    ];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(corruptData));

    const retrieved = planStorage.getAll();
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].id).toBe("valid-plan");
  });

  it("handles storage exceptions gracefully when localStorage throws", () => {
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError: The operation is insecure.");
    });

    expect(planStorage.getAll()).toEqual([]);
    getItemSpy.mockRestore();
  });
});

