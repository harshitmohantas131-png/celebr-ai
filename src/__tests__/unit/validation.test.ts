import { describe, it, expect } from "vitest";
import {
  eventDetailsSchema,
  eventFormSchema,
  refinementRequestSchema,
  planMetadataSchema,
  eventDateSchema,
} from "@/lib/schemas/event";
import {
  eventOverviewSchema,
  eventPlanSchema,
} from "@/lib/schemas/plan";
import {
  budgetLineItemSchema,
  budgetCategorySchema,
  calculateBudgetInputSchema,
} from "@/lib/schemas/budget";
import {
  timelineMilestoneSchema,
  scheduleItemSchema,
} from "@/lib/schemas/timeline";
import { checklistTaskSchema } from "@/lib/schemas/checklist";
import { EVENT_LIMITS } from "@/lib/constants/limits";

describe("Event Details Validation", () => {
  const getValidWeddingData = () => ({
    name: "Maya & Leo's Vineyard Wedding",
    eventType: "wedding" as const,
    eventDate: "2027-06-15",
    location: "Napa Valley, CA",
    guestCount: 120,
    totalBudget: 45000,
    currency: "USD" as const,
    theme: "Rustic elegance with eucalyptus greenery and warm string lights",
    culturalPreferences: ["Traditional Indian Sangeet evening"],
    dietaryRequirements: ["Vegetarian", "Gluten-Free"],
    planningPriorities: ["Scenic Venue", "Live Acoustic Duo", "Photography"],
    additionalInstructions: "Please allocate extra budget for local wine pairing.",
  });

  it("validates valid wedding event data", () => {
    const data = getValidWeddingData();
    const result = eventDetailsSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("validates valid birthday event data", () => {
    const data = {
      ...getValidWeddingData(),
      name: "Liam's 30th Rooftop Birthday",
      eventType: "birthday" as const,
      guestCount: 45,
      totalBudget: 6000,
      currency: "USD" as const,
    };
    const result = eventDetailsSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("validates valid community event data with INR currency", () => {
    const data = {
      ...getValidWeddingData(),
      name: "Diwali Community Festival & Food Fair",
      eventType: "community" as const,
      guestCount: 500,
      totalBudget: 350000,
      currency: "INR" as const,
    };
    const result = eventDetailsSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects unsupported event types", () => {
    const data = {
      ...getValidWeddingData(),
      eventType: "corporate_gala",
    };
    const result = eventDetailsSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Event type must be wedding, birthday, or community");
    }
  });

  it("rejects unsupported currencies", () => {
    const data = {
      ...getValidWeddingData(),
      currency: "EUR",
    };
    const result = eventDetailsSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Currency must be either USD or INR");
    }
  });

  describe("Event Date Policies", () => {
    it("rejects past dates", () => {
      const data = {
        ...getValidWeddingData(),
        eventDate: "2020-01-01",
      };
      const result = eventDetailsSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("cannot be in the past"))).toBe(true);
      }
    });

    it("rejects invalid calendar dates like Feb 31", () => {
      const data = {
        ...getValidWeddingData(),
        eventDate: "2027-02-31",
      };
      const result = eventDetailsSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("valid calendar date"))).toBe(true);
      }
    });

    it("rejects non-leap year Feb 29", () => {
      const data = {
        ...getValidWeddingData(),
        eventDate: "2027-02-29", // 2027 is not leap year
      };
      const result = eventDetailsSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("accepts valid leap year Feb 29", () => {
      const schema = eventDateSchema(new Date("2027-01-01"));
      const result = schema.safeParse("2028-02-29"); // 2028 is leap year
      expect(result.success).toBe(true);
    });

    it("rejects malformed date strings", () => {
      const data = {
        ...getValidWeddingData(),
        eventDate: "tomorrow",
      };
      const result = eventDetailsSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects dates exceeding maximum 10-year planning horizon", () => {
      const data = {
        ...getValidWeddingData(),
        eventDate: "2045-01-01",
      };
      const result = eventDetailsSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes("within 10 years"))).toBe(true);
      }
    });
  });

  describe("Guest Count & Budget Boundaries", () => {
    it("rejects zero and negative guest counts", () => {
      expect(eventDetailsSchema.safeParse({ ...getValidWeddingData(), guestCount: 0 }).success).toBe(false);
      expect(eventDetailsSchema.safeParse({ ...getValidWeddingData(), guestCount: -10 }).success).toBe(false);
    });

    it("rejects decimal guest counts", () => {
      const result = eventDetailsSchema.safeParse({ ...getValidWeddingData(), guestCount: 50.5 });
      expect(result.success).toBe(false);
    });

    it("rejects guest counts exceeding limit", () => {
      const result = eventDetailsSchema.safeParse({
        ...getValidWeddingData(),
        guestCount: EVENT_LIMITS.GUEST_COUNT_MAX + 1,
      });
      expect(result.success).toBe(false);
    });

    it("accepts maximum allowable guest count", () => {
      const result = eventDetailsSchema.safeParse({
        ...getValidWeddingData(),
        guestCount: EVENT_LIMITS.GUEST_COUNT_MAX,
      });
      expect(result.success).toBe(true);
    });

    it("rejects zero and negative budgets", () => {
      expect(eventDetailsSchema.safeParse({ ...getValidWeddingData(), totalBudget: 0 }).success).toBe(false);
      expect(eventDetailsSchema.safeParse({ ...getValidWeddingData(), totalBudget: -100 }).success).toBe(false);
    });

    it("rejects non-finite budgets (NaN, Infinity)", () => {
      expect(eventDetailsSchema.safeParse({ ...getValidWeddingData(), totalBudget: NaN }).success).toBe(false);
      expect(eventDetailsSchema.safeParse({ ...getValidWeddingData(), totalBudget: Infinity }).success).toBe(false);
    });

    it("rejects budget exceeding maximum allowed application limit", () => {
      const result = eventDetailsSchema.safeParse({
        ...getValidWeddingData(),
        totalBudget: EVENT_LIMITS.BUDGET_MAX + 1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("String Length Limits & Missing Fields", () => {
    it("rejects missing event name", () => {
      const result = eventDetailsSchema.safeParse({
        ...getValidWeddingData(),
        name: "   ",
      });
      expect(result.success).toBe(false);
    });

    it("rejects event name exceeding max length", () => {
      const result = eventDetailsSchema.safeParse({
        ...getValidWeddingData(),
        name: "A".repeat(EVENT_LIMITS.NAME_MAX_LENGTH + 1),
      });
      expect(result.success).toBe(false);
    });

    it("rejects oversized location", () => {
      const result = eventDetailsSchema.safeParse({
        ...getValidWeddingData(),
        location: "X".repeat(EVENT_LIMITS.LOCATION_MAX_LENGTH + 1),
      });
      expect(result.success).toBe(false);
    });

    it("rejects oversized theme notes", () => {
      const result = eventDetailsSchema.safeParse({
        ...getValidWeddingData(),
        theme: "T".repeat(EVENT_LIMITS.THEME_MAX_LENGTH + 1),
      });
      expect(result.success).toBe(false);
    });

    it("rejects oversized additional instructions", () => {
      const result = eventDetailsSchema.safeParse({
        ...getValidWeddingData(),
        additionalInstructions: "Z".repeat(EVENT_LIMITS.ADDITIONAL_INSTRUCTIONS_MAX_LENGTH + 1),
      });
      expect(result.success).toBe(false);
    });

    it("rejects bounded array exceeding maximum item count", () => {
      const dietary = Array.from({ length: EVENT_LIMITS.MAX_DIETARY_REQUIREMENTS + 1 }, (_, i) => `Diet ${i}`);
      const result = eventDetailsSchema.safeParse({
        ...getValidWeddingData(),
        dietaryRequirements: dietary,
      });
      expect(result.success).toBe(false);
    });

    it("rejects array items exceeding individual length limit", () => {
      const result = eventDetailsSchema.safeParse({
        ...getValidWeddingData(),
        planningPriorities: ["A".repeat(EVENT_LIMITS.ITEM_TEXT_MAX_LENGTH + 1)],
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("Event Form Schema (Client Form)", () => {
  it("validates minimal valid form submission", () => {
    const result = eventFormSchema.safeParse({
      eventName: "Maya's Birthday",
      eventType: "birthday",
    });
    expect(result.success).toBe(true);
  });

  it("validates full form submission with string numbers", () => {
    const result = eventFormSchema.safeParse({
      eventName: "Maya's Birthday",
      eventType: "birthday",
      guestCount: "50",
      budget: "5000",
      currency: "USD",
      eventDate: "2027-08-20",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative guest count string", () => {
    const result = eventFormSchema.safeParse({
      eventName: "Maya's Birthday",
      eventType: "birthday",
      guestCount: "-5",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.guestCount?.[0]).toBe("Guest count must be a positive number.");
    }
  });

  it("rejects negative budget string", () => {
    const result = eventFormSchema.safeParse({
      eventName: "Maya's Birthday",
      eventType: "birthday",
      budget: "-500",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.budget?.[0]).toBe("Budget must be a positive number.");
    }
  });
});

describe("Refinement Request & Metadata Schemas", () => {
  it("validates valid refinement request", () => {
    const result = refinementRequestSchema.safeParse({
      instructions: "Shift catering budget by 10% to live music.",
      targetSection: "budget",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty refinement instructions", () => {
    const result = refinementRequestSchema.safeParse({
      instructions: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects refinement instructions exceeding maximum length", () => {
    const result = refinementRequestSchema.safeParse({
      instructions: "X".repeat(EVENT_LIMITS.REFINEMENT_REQUEST_MAX_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("validates plan metadata", () => {
    const result = planMetadataSchema.safeParse({
      createdAt: new Date().toISOString(),
      version: 1,
      currency: "USD",
      eventType: "wedding",
    });
    expect(result.success).toBe(true);
  });
});

describe("AI Plan Entity Schemas", () => {
  it("validates budget line item with non-negative cost", () => {
    const result = budgetLineItemSchema.safeParse({
      id: "item-1",
      categoryId: "venue",
      name: "Barn Rental Deposit",
      estimatedCost: 3500,
      priority: "high",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative estimated cost in budget line item", () => {
    const result = budgetLineItemSchema.safeParse({
      id: "item-1",
      categoryId: "venue",
      name: "Barn Rental Deposit",
      estimatedCost: -500,
      priority: "high",
    });
    expect(result.success).toBe(false);
  });

  it("validates schedule item with chronological start and end times", () => {
    const result = scheduleItemSchema.safeParse({
      id: "sched-1",
      title: "Ceremony Begins",
      startTime: "14:00",
      endTime: "15:00",
      description: "Vows exchange at the pavilion",
    });
    expect(result.success).toBe(true);
  });

  it("rejects reversed schedule item interval", () => {
    const result = scheduleItemSchema.safeParse({
      id: "sched-1",
      title: "Ceremony Begins",
      startTime: "15:00",
      endTime: "14:00",
      description: "Invalid time sequence",
    });
    expect(result.success).toBe(false);
  });

  it("validates checklist task", () => {
    const result = checklistTaskSchema.safeParse({
      id: "task-1",
      title: "Book Wedding Cake Tasting",
      category: "Catering",
      status: "pending",
      priority: "high",
      dueDate: "2027-03-01",
    });
    expect(result.success).toBe(true);
  });

  it("validates event overview", () => {
    const result = eventOverviewSchema.safeParse({
      summary: "A warm autumn celebration with botanical accents.",
      personalizedIdeas: [
        "Personalized botanical welcome drinks featuring rosemary sprigs",
        "Golden hour photography session by the vineyard ridge",
      ],
      themeConcept: "Rustic botanical elegance",
      colorPalette: ["Olive Green", "Warm Terracotta", "Champagne Gold"],
    });
    expect(result.success).toBe(true);
  });

  it("validates timeline milestone schema", () => {
    const result = timelineMilestoneSchema.safeParse({
      id: "m-1",
      title: "Confirm Venue Booking",
      description: "Sign the lease contract",
      targetDate: "2027-04-10",
      daysBeforeEvent: 60,
      category: "Venue",
      completed: false,
    });
    expect(result.success).toBe(true);
  });

  it("validates budget category and calculation input schemas", () => {
    const catResult = budgetCategorySchema.safeParse({
      id: "cat-1",
      name: "Entertainment",
      items: [
        {
          id: "item-1",
          categoryId: "cat-1",
          name: "Live Band",
          estimatedCost: 2000,
          priority: "high",
        },
      ],
    });
    expect(catResult.success).toBe(true);

    const inputResult = calculateBudgetInputSchema.safeParse({
      totalBudget: 15000,
      currency: "USD",
      categories: [catResult.data!],
      contingencyRate: 0.1,
    });
    expect(inputResult.success).toBe(true);
  });

  it("validates comprehensive event plan schema", () => {
    const result = eventPlanSchema.safeParse({
      id: "plan-123",
      eventDetails: {
        name: "Maya & Leo's Wedding",
        eventType: "wedding",
        eventDate: "2027-06-15",
        location: "Napa, CA",
        guestCount: 100,
        totalBudget: 25000,
        currency: "USD",
        theme: "Rustic",
        culturalPreferences: [],
        dietaryRequirements: ["Vegetarian"],
        planningPriorities: ["Venue"],
        additionalInstructions: "",
      },
      overview: {
        summary: "A rustic vineyard gathering.",
        personalizedIdeas: ["Acoustic guitar recessional"],
      },
      budget: {
        categories: [
          {
            id: "cat-1",
            name: "Venue",
            items: [
              {
                id: "item-1",
                categoryId: "cat-1",
                name: "Rental",
                estimatedCost: 10000,
                priority: "high",
              },
            ],
          },
        ],
        contingencyRate: 0.1,
      },
      milestones: [
        {
          id: "m-1",
          title: "Book Venue",
          description: "Sign contract",
          targetDate: "2027-01-15",
          daysBeforeEvent: 150,
          category: "Venue",
          completed: true,
        },
      ],
      schedule: [
        {
          id: "s-1",
          title: "Ceremony",
          startTime: "14:00",
          endTime: "15:00",
          description: "Vows exchange",
        },
      ],
      checklist: [
        {
          id: "t-1",
          title: "Finalize menu",
          category: "Catering",
          status: "pending",
          priority: "high",
        },
      ],
      metadata: {
        createdAt: new Date().toISOString(),
        version: 1,
        currency: "USD",
        eventType: "wedding",
      },
    });

    expect(result.success).toBe(true);
  });
});

