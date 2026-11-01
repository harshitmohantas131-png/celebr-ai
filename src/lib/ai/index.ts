/**
 * CelebrAI AI Service — Server-only orchestration.
 * Coordinates Gemini generation, strict schema validation, and deterministic recalculation.
 *
 * DO NOT import this module on the client side.
 */

import { DEFAULT_CONTINGENCY_RATE } from "@/lib/constants/limits";
import { calculateBudget } from "@/features/budget";
import { validatePreparationMilestones, validateSchedule } from "@/features/timeline";
import { validateChecklistTasks } from "@/features/vendors";
import { rawGeneratedPlanSchema, finalEventPlanSchema } from "@/lib/schemas/plan";
import type { EventDetails, EventPlan, PlanSection } from "@/types/event";
import * as gemini from "./gemini";

export * from "./gemini";
export * from "./prompts";

/**
 * Normalizes minor casing or vocabulary variations from LLMs into canonical domain enums.
 */
function normalizeRawPlan(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  const plan = data as Record<string, unknown>;

  // Normalize budget categories and line items
  if (plan.budget && typeof plan.budget === "object") {
    const b = plan.budget as Record<string, unknown>;
    if (typeof b.contingencyRate === "number") {
      let cr: number = b.contingencyRate;
      if (cr > 1 && cr <= 100) {
        cr = cr / 100;
      }
      if (cr > 0.5 || cr < 0) {
        cr = 0.1;
      }
      b.contingencyRate = cr;
    }
    if (Array.isArray(b.categories)) {
      for (const cat of b.categories) {
        if (cat && typeof cat === "object") {
          const catObj = cat as Record<string, unknown>;
          const items = catObj.items;
          if (Array.isArray(items)) {
            for (const item of items) {
              if (item && typeof item === "object") {
                const it = item as Record<string, unknown>;
                const p = String(it.priority || "").toLowerCase();
                it.priority =
                  p === "essential" || p === "urgent" || p === "high"
                    ? "high"
                    : p === "low" || p === "optional"
                    ? "low"
                    : "medium";
              }
            }
          }
        }
      }
    }
  }

  // Normalize checklist
  if (Array.isArray(plan.checklist)) {
    for (const task of plan.checklist) {
      if (task && typeof task === "object") {
        const t = task as Record<string, unknown>;
        const p = String(t.priority || "").toLowerCase();
        t.priority =
          p === "essential" || p === "urgent" || p === "high"
            ? "high"
            : p === "low" || p === "optional"
            ? "low"
            : "medium";
        const s = String(t.status || "").toLowerCase();
        t.status = ["pending", "in_progress", "completed", "cancelled"].includes(s)
          ? s
          : "pending";
      }
    }
  }

  return plan;
}

/**
 * End-to-end server orchestration function for event plan synthesis.
 * Calls Gemini, enforces strict structural validation, and calculates authoritative financial totals.
 */
export async function synthesizeEventPlan(
  details: EventDetails,
  options?: gemini.GeneratePlanOptions
): Promise<EventPlan> {
  // 1. Generate structured raw response from Gemini
  const rawData = await gemini.generateRawPlan(details, options);
  const normalizedData = normalizeRawPlan(rawData);

  // 2. Validate structural schema of raw model output
  const rawParseResult = rawGeneratedPlanSchema.safeParse(normalizedData);
  if (!rawParseResult.success) {
    const errorDetails = rawParseResult.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .slice(0, 3)
      .join("; ");
    throw new gemini.GeminiResponseParsingError(
      `Generated plan failed structural validation (${errorDetails}).`
    );
  }
  const rawPlan = rawParseResult.data;

  // 3. Domain validation for preparation milestones
  const milestoneValidation = validatePreparationMilestones(
    rawPlan.milestones,
    details.eventDate
  );
  if (!milestoneValidation.valid) {
    throw new gemini.GeminiResponseParsingError(
      `Generated timeline failed validation: ${milestoneValidation.errors.join("; ")}`
    );
  }

  // 4. Domain validation for event-day run-of-show schedule
  const scheduleValidation = validateSchedule(rawPlan.schedule);
  if (!scheduleValidation.valid) {
    throw new gemini.GeminiResponseParsingError(
      `Generated schedule failed validation: ${scheduleValidation.errors.join("; ")}`
    );
  }

  // 5. Domain validation for checklist tasks
  const checklistValidation = validateChecklistTasks(rawPlan.checklist);
  if (!checklistValidation.valid) {
    throw new gemini.GeminiResponseParsingError(
      `Generated checklist failed validation: ${checklistValidation.errors.join("; ")}`
    );
  }

  // 6. Authoritative budget calculation via deterministic engine
  const budgetCalculation = calculateBudget({
    totalBudget: details.totalBudget,
    currency: details.currency,
    categories: rawPlan.budget.categories,
    contingencyRate: rawPlan.budget.contingencyRate ?? DEFAULT_CONTINGENCY_RATE,
  });

  // 7. Assemble final verified event plan
  const finalPlan: EventPlan = {
    id: crypto.randomUUID(),
    eventDetails: details,
    overview: rawPlan.overview,
    budget: {
      categories: rawPlan.budget.categories,
      contingencyRate: budgetCalculation.contingencyRate,
      calculation: budgetCalculation,
    },
    milestones: milestoneValidation.sortedMilestones,
    schedule: scheduleValidation.sortedSchedule,
    checklist: checklistValidation.validatedTasks,
    metadata: {
      createdAt: new Date().toISOString(),
      version: 1,
      currency: details.currency,
      eventType: details.eventType,
    },
  };

  // 8. Final integrity check against complete plan schema
  const finalParseResult = finalEventPlanSchema.safeParse(finalPlan);
  if (!finalParseResult.success) {
    throw new gemini.GeminiResponseParsingError("Final assembled plan failed integrity validation.");
  }

  return finalPlan;
}

/**
 * End-to-end server orchestration for refining an existing event plan.
 * Takes the previous valid plan and new instructions, calls Gemini, revalidates,
 * deterministically recalculates financials, and returns an updated verified EventPlan.
 */
export async function refineEventPlan(
  plan: EventPlan,
  instructions: string,
  targetSection?: PlanSection,
  options?: gemini.GeneratePlanOptions
): Promise<EventPlan> {
  // 1. Generate refined raw plan from Gemini
  const rawData = await gemini.generateRawRefinement(
    plan,
    instructions,
    targetSection,
    options
  );

  // 2. Validate structural schema of raw output
  const normalizedData = normalizeRawPlan(rawData);
  const rawParseResult = rawGeneratedPlanSchema.safeParse(normalizedData);
  if (!rawParseResult.success) {
    const errorDetails = rawParseResult.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .slice(0, 3)
      .join("; ");
    throw new gemini.GeminiResponseParsingError(
      `Refined plan failed structural validation (${errorDetails}).`
    );
  }
  const rawPlan = rawParseResult.data;

  // 3. Domain validation for preparation milestones
  const milestoneValidation = validatePreparationMilestones(
    rawPlan.milestones,
    plan.eventDetails.eventDate
  );
  if (!milestoneValidation.valid) {
    throw new gemini.GeminiResponseParsingError(
      `Refined timeline failed validation: ${milestoneValidation.errors.join("; ")}`
    );
  }

  // 4. Domain validation for event-day run-of-show schedule
  const scheduleValidation = validateSchedule(rawPlan.schedule);
  if (!scheduleValidation.valid) {
    throw new gemini.GeminiResponseParsingError(
      `Refined schedule failed validation: ${scheduleValidation.errors.join("; ")}`
    );
  }

  // 5. Domain validation for checklist tasks
  const checklistValidation = validateChecklistTasks(rawPlan.checklist);
  if (!checklistValidation.valid) {
    throw new gemini.GeminiResponseParsingError(
      `Refined checklist failed validation: ${checklistValidation.errors.join("; ")}`
    );
  }

  // 6. Recalculate budget deterministically using original budget and currency
  const budgetCalculation = calculateBudget({
    totalBudget: plan.eventDetails.totalBudget,
    currency: plan.eventDetails.currency,
    categories: rawPlan.budget.categories,
    contingencyRate: rawPlan.budget.contingencyRate ?? DEFAULT_CONTINGENCY_RATE,
  });

  // 7. Assemble updated EventPlan preserving plan id, incrementing version
  const currentVersion = plan.metadata?.version || 1;
  const refinedPlan: EventPlan = {
    id: plan.id,
    eventDetails: plan.eventDetails,
    overview: rawPlan.overview,
    budget: {
      categories: rawPlan.budget.categories,
      contingencyRate: budgetCalculation.contingencyRate,
      calculation: budgetCalculation,
    },
    milestones: milestoneValidation.sortedMilestones,
    schedule: scheduleValidation.sortedSchedule,
    checklist: checklistValidation.validatedTasks,
    metadata: {
      createdAt: plan.metadata?.createdAt || new Date().toISOString(),
      version: currentVersion + 1,
      currency: plan.eventDetails.currency,
      eventType: plan.eventDetails.eventType,
    },
  };

  // 8. Final verification against complete schema
  const finalParseResult = finalEventPlanSchema.safeParse(refinedPlan);
  if (!finalParseResult.success) {
    throw new gemini.GeminiResponseParsingError(
      "Refined assembled plan failed integrity validation."
    );
  }

  return refinedPlan;
}
