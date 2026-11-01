/**
 * Zod validation schema for plan refinement requests.
 */

import { z } from "zod";
import { EVENT_LIMITS, PLAN_SECTIONS } from "@/lib/constants/limits";
import { finalEventPlanSchema } from "./plan";

export const refinePlanRequestSchema = z.object({
  plan: finalEventPlanSchema,
  instructions: z
    .string({
      error: "Refinement instructions are required.",
    })
    .trim()
    .min(1, "Instructions cannot be empty.")
    .max(
      EVENT_LIMITS.REFINEMENT_REQUEST_MAX_LENGTH,
      `Instructions cannot exceed ${EVENT_LIMITS.REFINEMENT_REQUEST_MAX_LENGTH} characters.`
    ),
  targetSection: z.enum(PLAN_SECTIONS).optional(),
});

export type RefinePlanRequest = z.infer<typeof refinePlanRequestSchema>;
