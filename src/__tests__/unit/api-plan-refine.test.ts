import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/plan/refine/route";
import * as aiModule from "@/lib/ai";
import * as gemini from "@/lib/ai/gemini";
import { planApiRateLimiter } from "@/lib/security/rateLimiter";
import type { EventPlan } from "@/types/event";

describe("POST /api/plan/refine Route Handler", () => {
  const originalEnv = process.env;

  const validPlan: EventPlan = {
    id: "plan-refine-123",
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

  const validRefinedRawOutput = {
    overview: {
      summary: "A refined rustic celebration with enhanced acoustic elements.",
      personalizedIdeas: ["Acoustic duo during vows", "Guitar cocktail hour"],
    },
    budget: {
      categories: [
        {
          id: "venue",
          name: "Venue",
          items: [
            {
              id: "v1",
              name: "Hall",
              estimatedCost: 10000, // Reduced from 12000
              priority: "high",
              categoryId: "venue",
            },
          ],
        },
        {
          id: "music",
          name: "Live Music",
          items: [
            {
              id: "m1",
              name: "Acoustic Trio",
              estimatedCost: 2500,
              priority: "high",
              categoryId: "music",
            },
          ],
        },
      ],
      contingencyRate: 0.1,
    },
    milestones: [
      {
        id: "m1",
        title: "Book Hall & Musicians",
        description: "Confirm contracts",
        targetDate: "2027-01-15",
        daysBeforeEvent: 151,
        category: "Venue",
        completed: false,
      },
    ],
    schedule: [
      {
        id: "s1",
        title: "Ceremony & Acoustic Prelude",
        startTime: "15:30",
        endTime: "17:00",
        description: "Acoustic duo performs prelude and recessional",
      },
    ],
    checklist: [
      {
        id: "c1",
        title: "Sign Musician Contract",
        category: "Music",
        status: "pending",
        priority: "high",
      },
    ],
  };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, GEMINI_API_KEY: "valid-test-key-xyz" };
    planApiRateLimiter.reset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  const createRequest = (
    body: unknown,
    headers: Record<string, string> = { "Content-Type": "application/json" }
  ) => {
    const raw = typeof body === "string" ? body : JSON.stringify(body);
    return new Request("http://localhost:3000/api/plan/refine", {
      method: "POST",
      headers: {
        "x-forwarded-for": "127.0.0.1",
        ...headers,
      },
      body: raw,
    });
  };

  it("successfully refines a plan, recalculating totals and incrementing version", async () => {
    vi.spyOn(gemini, "generateRawRefinement").mockResolvedValue(validRefinedRawOutput);

    const response = await POST(
      createRequest({
        plan: validPlan,
        instructions: "Shift $2,000 from venue to hire a live acoustic trio.",
        targetSection: "budget",
      })
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);

    const refined = json.data;
    expect(refined.id).toBe(validPlan.id);
    expect(refined.metadata.version).toBe(2);

    // Subtotal: 10,000 + 2,500 = 12,500
    // Contingency: 10% of 12,500 = 1,250
    // Total Estimated: 13,750
    expect(refined.budget.calculation.categorySubtotal).toBe(12500);
    expect(refined.budget.calculation.contingencyAmount).toBe(1250);
    expect(refined.budget.calculation.totalEstimatedCost).toBe(13750);
  });

  it("returns 400 when refinement instructions are empty", async () => {
    const response = await POST(
      createRequest({
        plan: validPlan,
        instructions: "   ",
      })
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 on malformed JSON payload", async () => {
    const response = await POST(createRequest("{not-a-valid-json"));
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.code).toBe("MALFORMED_JSON");
  });

  it("returns 413 when payload exceeds maximum size limit", async () => {
    const largeBody = {
      plan: validPlan,
      instructions: "X".repeat(70 * 1024),
    };

    const response = await POST(createRequest(largeBody));
    expect(response.status).toBe(413);
    const json = await response.json();
    expect(json.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("returns 503 when GEMINI_API_KEY is missing", async () => {
    delete process.env.GEMINI_API_KEY;

    const response = await POST(
      createRequest({
        plan: validPlan,
        instructions: "Adjust catering.",
      })
    );

    expect(response.status).toBe(503);
    const json = await response.json();
    expect(json.error.code).toBe("CONFIGURATION_ERROR");
  });

  it("returns 504 on timeout during refinement", async () => {
    vi.spyOn(gemini, "generateRawRefinement").mockRejectedValue(
      new aiModule.GeminiTimeoutError("Plan refinement timed out.")
    );

    const response = await POST(
      createRequest({
        plan: validPlan,
        instructions: "Adjust catering.",
      })
    );

    expect(response.status).toBe(504);
    const json = await response.json();
    expect(json.error.code).toBe("TIMEOUT_ERROR");
  });

  it("returns 502 on invalid model output during refinement", async () => {
    const invalidMilestonesOutput = {
      ...validRefinedRawOutput,
      milestones: [
        {
          id: "m-inv",
          title: "Late task",
          description: "After event date",
          targetDate: "2027-06-25", // After event date
          daysBeforeEvent: 0,
          category: "Logistics",
          completed: false,
        },
      ],
    };

    vi.spyOn(gemini, "generateRawRefinement").mockResolvedValue(invalidMilestonesOutput);

    const response = await POST(
      createRequest({
        plan: validPlan,
        instructions: "Update timeline.",
      })
    );

    expect(response.status).toBe(502);
    const json = await response.json();
    expect(json.error.code).toBe("INVALID_MODEL_OUTPUT");
  });
});

