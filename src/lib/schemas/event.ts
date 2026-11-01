/**
 * Zod validation schemas for event details and creation.
 * Server and client validation for CelebrAI events.
 */

import { z } from "zod";
import {
  DEFAULT_CURRENCY,
  EVENT_LIMITS,
  PLAN_SECTIONS,
  SUPPORTED_CURRENCIES,
  SUPPORTED_EVENT_TYPES,
} from "@/lib/constants/limits";
import {
  isFutureOrToday,
  isValidCalendarDate,
  isWithinFutureHorizon,
} from "@/lib/utils/date";

/**
 * Reusable Zod date validator enforcing ISO calendar date and event-date policy.
 */
export const eventDateSchema = (referenceDate?: Date) =>
  z
    .string({
      error: "Event date is required.",
    })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Event date must be in YYYY-MM-DD format.")
    .refine((val) => isValidCalendarDate(val), {
      message: "Event date must be a valid calendar date.",
    })
    .refine((val) => isFutureOrToday(val, referenceDate), {
      message: "Event date cannot be in the past.",
    })
    .refine((val) => isWithinFutureHorizon(val, EVENT_LIMITS.MAX_YEARS_IN_FUTURE, referenceDate), {
      message: `Event date must be within ${EVENT_LIMITS.MAX_YEARS_IN_FUTURE} years from today.`,
    });

/**
 * Strict server-side schema for full EventDetails.
 */
export const eventDetailsSchema = z.object({
  name: z
    .string({
      error: "Event name is required.",
    })
    .trim()
    .min(EVENT_LIMITS.NAME_MIN_LENGTH, "Event name or title is required.")
    .max(
      EVENT_LIMITS.NAME_MAX_LENGTH,
      `Event name cannot exceed ${EVENT_LIMITS.NAME_MAX_LENGTH} characters.`
    ),
  eventType: z.enum(SUPPORTED_EVENT_TYPES, {
    error: "Event type must be wedding, birthday, or community.",
  }),
  eventDate: eventDateSchema(),
  location: z
    .string()
    .max(
      EVENT_LIMITS.LOCATION_MAX_LENGTH,
      `Location cannot exceed ${EVENT_LIMITS.LOCATION_MAX_LENGTH} characters.`
    )
    .default(""),
  guestCount: z
    .number({
      error: "Guest count must be a number.",
    })
    .int("Guest count must be an integer.")
    .min(EVENT_LIMITS.GUEST_COUNT_MIN, "Guest count must be a positive number.")
    .max(
      EVENT_LIMITS.GUEST_COUNT_MAX,
      `Guest count cannot exceed ${EVENT_LIMITS.GUEST_COUNT_MAX.toLocaleString()}.`
    ),
  totalBudget: z
    .number({
      error: "Budget must be a number.",
    })
    .finite("Budget must be a finite number.")
    .min(EVENT_LIMITS.BUDGET_MIN, "Budget must be a positive number.")
    .max(
      EVENT_LIMITS.BUDGET_MAX,
      `Budget cannot exceed ${EVENT_LIMITS.BUDGET_MAX.toLocaleString()}.`
    ),
  currency: z
    .enum(SUPPORTED_CURRENCIES, {
      error: "Currency must be either USD or INR.",
    })
    .default(DEFAULT_CURRENCY),
  theme: z
    .string()
    .max(
      EVENT_LIMITS.THEME_MAX_LENGTH,
      `Theme notes cannot exceed ${EVENT_LIMITS.THEME_MAX_LENGTH} characters.`
    )
    .default(""),
  culturalPreferences: z
    .array(
      z
        .string()
        .max(
          EVENT_LIMITS.CULTURAL_PREF_TEXT_MAX_LENGTH,
          `Cultural preference text cannot exceed ${EVENT_LIMITS.CULTURAL_PREF_TEXT_MAX_LENGTH} characters.`
        )
    )
    .max(
      EVENT_LIMITS.MAX_CULTURAL_PREFERENCES,
      `Cannot exceed ${EVENT_LIMITS.MAX_CULTURAL_PREFERENCES} cultural preferences.`
    )
    .default([]),
  dietaryRequirements: z
    .array(
      z
        .string()
        .max(
          EVENT_LIMITS.ITEM_TEXT_MAX_LENGTH,
          `Dietary requirement cannot exceed ${EVENT_LIMITS.ITEM_TEXT_MAX_LENGTH} characters.`
        )
    )
    .max(
      EVENT_LIMITS.MAX_DIETARY_REQUIREMENTS,
      `Cannot exceed ${EVENT_LIMITS.MAX_DIETARY_REQUIREMENTS} dietary requirements.`
    )
    .default([]),
  planningPriorities: z
    .array(
      z
        .string()
        .max(
          EVENT_LIMITS.ITEM_TEXT_MAX_LENGTH,
          `Planning priority cannot exceed ${EVENT_LIMITS.ITEM_TEXT_MAX_LENGTH} characters.`
        )
    )
    .max(
      EVENT_LIMITS.MAX_PLANNING_PRIORITIES,
      `Cannot exceed ${EVENT_LIMITS.MAX_PLANNING_PRIORITIES} planning priorities.`
    )
    .default([]),
  additionalInstructions: z
    .string()
    .max(
      EVENT_LIMITS.ADDITIONAL_INSTRUCTIONS_MAX_LENGTH,
      `Additional instructions cannot exceed ${EVENT_LIMITS.ADDITIONAL_INSTRUCTIONS_MAX_LENGTH} characters.`
    )
    .default(""),
});

/**
 * Flexible Event Form Schema used by `/events/new` client component.
 * Allows optional date/guest/budget while validating them strictly if provided.
 */
export const eventFormSchema = z.object({
  eventName: z
    .string()
    .trim()
    .min(1, "Event name or title is required.")
    .max(
      EVENT_LIMITS.NAME_MAX_LENGTH,
      `Event name cannot exceed ${EVENT_LIMITS.NAME_MAX_LENGTH} characters.`
    ),
  eventType: z.enum(SUPPORTED_EVENT_TYPES, {
    error: "Event type must be wedding, birthday, or community.",
  }),
  eventDate: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true;
        return isValidCalendarDate(val) && isFutureOrToday(val);
      },
      {
        message: "Target event date must be a valid future or present calendar date (YYYY-MM-DD).",
      }
    ),
  guestCount: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true;
        const num = Number(val);
        return Number.isInteger(num) && num >= EVENT_LIMITS.GUEST_COUNT_MIN && num <= EVENT_LIMITS.GUEST_COUNT_MAX;
      },
      {
        message: "Guest count must be a positive number.",
      }
    ),
  budget: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true;
        const num = Number(val);
        return !isNaN(num) && Number.isFinite(num) && num >= EVENT_LIMITS.BUDGET_MIN && num <= EVENT_LIMITS.BUDGET_MAX;
      },
      {
        message: "Budget must be a positive number.",
      }
    ),
  currency: z.enum(SUPPORTED_CURRENCIES).default(DEFAULT_CURRENCY),
  location: z
    .string()
    .max(
      EVENT_LIMITS.LOCATION_MAX_LENGTH,
      `Location cannot exceed ${EVENT_LIMITS.LOCATION_MAX_LENGTH} characters.`
    )
    .optional(),
  themeNotes: z
    .string()
    .max(
      EVENT_LIMITS.THEME_MAX_LENGTH,
      `Theme notes cannot exceed ${EVENT_LIMITS.THEME_MAX_LENGTH} characters.`
    )
    .optional(),
  dietaryRequirements: z.string().max(300).optional(),
  planningPriorities: z.string().max(300).optional(),
  culturalPreferences: z.string().max(300).optional(),
  additionalInstructions: z
    .string()
    .max(
      EVENT_LIMITS.ADDITIONAL_INSTRUCTIONS_MAX_LENGTH,
      `Additional instructions cannot exceed ${EVENT_LIMITS.ADDITIONAL_INSTRUCTIONS_MAX_LENGTH} characters.`
    )
    .optional(),
});

/**
 * Refinement request schema for iterative plan adjustments.
 */
export const refinementRequestSchema = z.object({
  instructions: z
    .string({
      error: "Refinement instructions are required.",
    })
    .trim()
    .min(1, "Instructions cannot be empty.")
    .max(
      EVENT_LIMITS.REFINEMENT_REQUEST_MAX_LENGTH,
      `Refinement instructions cannot exceed ${EVENT_LIMITS.REFINEMENT_REQUEST_MAX_LENGTH} characters.`
    ),
  targetSection: z.enum(PLAN_SECTIONS).optional(),
});

/**
 * Plan metadata schema.
 */
export const planMetadataSchema = z.object({
  createdAt: z.string().datetime({ message: "createdAt must be an ISO 8601 datetime string." }),
  version: z.number().int().positive(),
  currency: z.enum(SUPPORTED_CURRENCIES),
  eventType: z.enum(SUPPORTED_EVENT_TYPES),
});

