/**
 * Zod validation schemas for AI-synthesized Event Plans and Overviews.
 */

import { z } from "zod";
import { EVENT_LIMITS } from "@/lib/constants/limits";
import { eventDetailsSchema, planMetadataSchema } from "./event";
import {
  budgetCategorySchema,
  budgetCalculationResultSchema,
} from "./budget";
import { timelineMilestoneSchema, scheduleItemSchema } from "./timeline";
import { checklistTaskSchema } from "./checklist";
import { vendorSchema } from "./vendor";

export const eventOverviewSchema = z.object({
  summary: z
    .string()
    .trim()
    .min(1, "Event summary is required.")
    .max(EVENT_LIMITS.OVERVIEW_SUMMARY_MAX_LENGTH),
  personalizedIdeas: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(EVENT_LIMITS.PERSONALIZED_IDEA_MAX_LENGTH)
    )
    .min(1, "At least one personalized idea is required.")
    .max(EVENT_LIMITS.MAX_PERSONALIZED_IDEAS),
  themeConcept: z.string().max(EVENT_LIMITS.THEME_MAX_LENGTH).optional(),
  colorPalette: z.array(z.string().max(50)).max(10).optional(),
});

/**
 * Schema for raw budget structure returned directly from the AI model.
 */
export const rawPlanBudgetSchema = z.object({
  categories: z
    .array(budgetCategorySchema)
    .min(1, "At least one budget category is required.")
    .max(EVENT_LIMITS.MAX_BUDGET_CATEGORIES),
  contingencyRate: z
    .number()
    .min(0)
    .max(EVENT_LIMITS.MAX_CONTINGENCY_RATE)
    .optional(),
});

/**
 * Raw generated output produced by the Gemini model before deterministic calculations.
 */
export const rawGeneratedPlanSchema = z.object({
  overview: eventOverviewSchema,
  budget: rawPlanBudgetSchema,
  milestones: z
    .array(timelineMilestoneSchema)
    .max(EVENT_LIMITS.MAX_TIMELINE_MILESTONES),
  schedule: z
    .array(scheduleItemSchema)
    .max(EVENT_LIMITS.MAX_SCHEDULE_ITEMS),
  checklist: z
    .array(checklistTaskSchema)
    .max(EVENT_LIMITS.MAX_CHECKLIST_TASKS),
});

export type RawGeneratedPlan = z.infer<typeof rawGeneratedPlanSchema>;

/**
 * Event plan schema (backward-compatible, allowing optional calculation).
 */
export const eventPlanSchema = z.object({
  id: z.string().min(1),
  eventDetails: eventDetailsSchema,
  overview: eventOverviewSchema,
  budget: z.object({
    categories: z
      .array(budgetCategorySchema)
      .min(1, "At least one budget category is required.")
      .max(EVENT_LIMITS.MAX_BUDGET_CATEGORIES),
    contingencyRate: z
      .number()
      .min(0)
      .max(EVENT_LIMITS.MAX_CONTINGENCY_RATE),
    calculation: budgetCalculationResultSchema.optional(),
  }),
  milestones: z
    .array(timelineMilestoneSchema)
    .max(EVENT_LIMITS.MAX_TIMELINE_MILESTONES),
  schedule: z
    .array(scheduleItemSchema)
    .max(EVENT_LIMITS.MAX_SCHEDULE_ITEMS),
  checklist: z
    .array(checklistTaskSchema)
    .max(EVENT_LIMITS.MAX_CHECKLIST_TASKS),
  vendors: z.array(vendorSchema).optional().default([]),
  metadata: planMetadataSchema,
});

/**
 * Fully normalized, final event plan containing authoritative calculation results.
 */
export const finalEventPlanSchema = eventPlanSchema.extend({
  budget: z.object({
    categories: z
      .array(budgetCategorySchema)
      .min(1, "At least one budget category is required.")
      .max(EVENT_LIMITS.MAX_BUDGET_CATEGORIES),
    contingencyRate: z
      .number()
      .min(0)
      .max(EVENT_LIMITS.MAX_CONTINGENCY_RATE),
    calculation: budgetCalculationResultSchema,
  }),
});
