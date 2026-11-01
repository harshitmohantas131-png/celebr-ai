import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/plan/route";
import * as aiModule from "@/lib/ai";
import * as gemini from "@/lib/ai/gemini";
import { planApiRateLimiter } from "@/lib/security/rateLimiter";
import type { EventDetails } from "@/types/event";

describe("POST /api/plan Route Handler", () => {
  const originalEnv = process.env;

  const validEventPayload: EventDetails = {
    name: "Maya & Leo's Vineyard Wedding",
    eventType: "wedding",
    eventDate: "2027-06-15",
    location: "Napa Valley, CA",
    guestCount: 100,
    totalBudget: 35000,
    currency: "USD",
    theme: "Rustic Elegance",
    culturalPreferences: ["Sangeet"],
    dietaryRequirements: ["Vegetarian"],
    planningPriorities: ["Venue", "Music"],
    additionalInstructions: "Include local wine tasting.",
  };

  const validRawPlanOutput = {
    overview: {
      summary: "A scenic rustic vineyard celebration.",
      personalizedIdeas: ["Sunset acoustic recessional"],
      themeConcept: "Rustic Elegance",
      colorPalette: ["Olive Green", "Warm Terracotta"],
    },
    budget: {
      categories: [
        {
          id: "venue",
          name: "Venue & Rentals",
          allocatedAmount: 15000,
          items: [
            {
              id: "v1",
              name: "Vineyard Hall Rental",
              estimatedCost: 12000,
              priority: "high",
              categoryId: "venue",
            },
            {
              id: "v2",
              name: "Tables & Chairs",
              estimatedCost: 3000,
              priority: "medium",
              categoryId: "venue",
            },
          ],
        },
        {
          id: "catering",
          name: "Catering",
          allocatedAmount: 10000,
          items: [
            {
              id: "c1",
              name: "Buffet Dinner",
              estimatedCost: 8000,
              priority: "high",
              categoryId: "catering",
            },
          ],
        },
      ],
      contingencyRate: 0.1,
    },
    milestones: [
      {
        id: "m1",
        title: "Secure Venue",
        description: "Sign hall lease",
        targetDate: "2027-01-15",
        daysBeforeEvent: 151,
        category: "Venue",
        completed: true,
      },
      {
        id: "m2",
        title: "Send Invites",
        description: "RSVP cards mailed",
        targetDate: "2027-03-15",
        daysBeforeEvent: 92,
        category: "Guest Management",
        completed: false,
      },
    ],
    schedule: [
      {
        id: "s1",
        title: "Guest Arrival",
        startTime: "15:00",
        endTime: "16:00",
        description: "Welcome beverages in courtyard",
      },
      {
        id: "s2",
        title: "Ceremony",
        startTime: "16:00",
        endTime: "17:00",
        description: "Vow exchange",
      },
    ],
    checklist: [
      {
        id: "t1",
        title: "Confirm Caterer",
        category: "Catering",
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
    return new Request("http://localhost:3000/api/plan", {
      method: "POST",
      headers: {
        "x-forwarded-for": "127.0.0.1",
        ...headers,
      },
      body: raw,
    });
  };

  it("successfully synthesizes a valid plan with recalculated budget totals", async () => {
    vi.spyOn(gemini, "generateRawPlan").mockResolvedValue(validRawPlanOutput);

    const response = await POST(createRequest(validEventPayload));
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();

    const plan = json.data;
    expect(plan.id).toBeDefined();
    expect(plan.eventDetails.name).toBe("Maya & Leo's Vineyard Wedding");

    // Authoritative recalculation checks:
    // Category Subtotal = 12000 + 3000 + 8000 = 23,000
    // Contingency = 10% of 23,000 = 2,300
    // Total Estimated Cost = 25,300
    // Budget = 35,000 -> Remaining = 9,700
    expect(plan.budget.calculation.categorySubtotal).toBe(23000);
    expect(plan.budget.calculation.contingencyAmount).toBe(2300);
    expect(plan.budget.calculation.totalEstimatedCost).toBe(25300);
    expect(plan.budget.calculation.remainingBudget).toBe(9700);
    expect(plan.budget.calculation.isOverBudget).toBe(false);
  });

  it("preserves over-budget status and generates warning without altering costs", async () => {
    // Event budget is only 20,000, but estimated cost is 25,300
    const overBudgetPayload: EventDetails = {
      ...validEventPayload,
      totalBudget: 20000,
    };

    vi.spyOn(gemini, "generateRawPlan").mockResolvedValue(validRawPlanOutput);

    const response = await POST(createRequest(overBudgetPayload));
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    const plan = json.data;

    expect(plan.budget.calculation.isOverBudget).toBe(true);
    expect(plan.budget.calculation.overBudgetAmount).toBe(5300);
    expect(plan.budget.calculation.warnings).toHaveLength(1);
    expect(plan.budget.calculation.warnings[0]).toContain("exceeds the total budget of $20,000.00 by $5,300.00");
  });

  it("returns 400 on malformed JSON payload", async () => {
    const response = await POST(createRequest("{not-a-valid-json"));
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("MALFORMED_JSON");
  });

  it("returns 400 on invalid event schema without calling Gemini", async () => {
    const spy = vi.spyOn(aiModule, "generateRawPlan");

    const invalidPayload = {
      ...validEventPayload,
      guestCount: -5, // Invalid negative guest count
    };

    const response = await POST(createRequest(invalidPayload));
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns 400 when date is in the past without calling Gemini", async () => {
    const spy = vi.spyOn(aiModule, "generateRawPlan");

    const pastDatePayload = {
      ...validEventPayload,
      eventDate: "2020-01-01",
    };

    const response = await POST(createRequest(pastDatePayload));
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns 413 when payload exceeds maximum size limit", async () => {
    const largePayload = {
      ...validEventPayload,
      additionalInstructions: "X".repeat(70 * 1024), // 70 KB payload
    };

    const response = await POST(createRequest(largePayload));
    expect(response.status).toBe(413);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("returns 429 when rate limit is exceeded", async () => {
    vi.spyOn(gemini, "generateRawPlan").mockResolvedValue(validRawPlanOutput);

    // Make 5 requests (the limit)
    for (let i = 0; i < 5; i++) {
      const res = await POST(createRequest(validEventPayload));
      expect(res.status).toBe(200);
    }

    // 6th request must be rate limited
    const response = await POST(createRequest(validEventPayload));
    expect(response.status).toBe(429);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(response.headers.get("Retry-After")).toBeDefined();
  });

  it("returns 503 when GEMINI_API_KEY is not configured", async () => {
    delete process.env.GEMINI_API_KEY;

    const response = await POST(createRequest(validEventPayload));
    expect(response.status).toBe(503);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("CONFIGURATION_ERROR");
  });

  it("returns 504 on Gemini timeout", async () => {
    vi.spyOn(gemini, "generateRawPlan").mockRejectedValue(
      new aiModule.GeminiTimeoutError()
    );

    const response = await POST(createRequest(validEventPayload));
    expect(response.status).toBe(504);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("TIMEOUT_ERROR");
  });

  it("returns 502 on Gemini provider failure", async () => {
    vi.spyOn(gemini, "generateRawPlan").mockRejectedValue(
      new aiModule.GeminiProviderError("Google API returned internal error.")
    );

    const response = await POST(createRequest(validEventPayload));
    expect(response.status).toBe(502);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("PROVIDER_ERROR");
  });

  it("returns 502 when model generates schema-invalid timeline milestones", async () => {
    const invalidMilestoneOutput = {
      ...validRawPlanOutput,
      milestones: [
        {
          id: "m-invalid",
          title: "Late Task",
          description: "After event",
          targetDate: "2027-06-20", // After event date (2027-06-15)
          daysBeforeEvent: 0,
          category: "Logistics",
          completed: false,
        },
      ],
    };

    vi.spyOn(gemini, "generateRawPlan").mockResolvedValue(invalidMilestoneOutput);

    const response = await POST(createRequest(validEventPayload));
    expect(response.status).toBe(502);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("INVALID_MODEL_OUTPUT");
  });

  it("returns 502 when model generates reversed schedule intervals", async () => {
    const invalidScheduleOutput = {
      ...validRawPlanOutput,
      schedule: [
        {
          id: "s-rev",
          title: "Reversed Ceremony",
          startTime: "16:00",
          endTime: "15:00", // Start after end
          description: "Impossible interval",
        },
      ],
    };

    vi.spyOn(gemini, "generateRawPlan").mockResolvedValue(invalidScheduleOutput);

    const response = await POST(createRequest(validEventPayload));
    expect(response.status).toBe(502);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("INVALID_MODEL_OUTPUT");
  });

  it("returns 500 on unexpected runtime exceptions without leaking secrets", async () => {
    vi.spyOn(aiModule, "synthesizeEventPlan").mockRejectedValue(
      new Error("Unexpected crash with secret AIzaSySecretKey123")
    );

    const response = await POST(createRequest(validEventPayload));
    expect(response.status).toBe(500);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(json)).not.toContain("AIzaSySecretKey123");
  });
});
