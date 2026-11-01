/**
 * CelebrAI Domain Limits and Configuration Constants.
 * Centralized, documented limits enforced consistently across client and server.
 */

export const SUPPORTED_EVENT_TYPES = ["wedding", "birthday", "community"] as const;
export type SupportedEventType = (typeof SUPPORTED_EVENT_TYPES)[number];

export const SUPPORTED_CURRENCIES = ["USD", "INR"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: SupportedCurrency = "USD";
export const DEFAULT_CONTINGENCY_RATE = 0.1; // 10%
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

export const AI_CONFIG = {
  DEFAULT_MODEL: DEFAULT_GEMINI_MODEL,
  GENERATION_TIMEOUT_MS: 60000,
  MAX_OUTPUT_TOKENS: 8192,
  TEMPERATURE: 0.4,
} as const;

export const API_LIMITS = {
  MAX_REQUEST_BODY_BYTES: 64 * 1024, // 64 KB
  RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 5,
  RATE_LIMIT_MAX_ENTRIES: 10000,
} as const;

export const EVENT_LIMITS = {
  // Event Details
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 120,
  LOCATION_MAX_LENGTH: 200,
  GUEST_COUNT_MIN: 1,
  GUEST_COUNT_MAX: 10000,
  BUDGET_MIN: 1,
  BUDGET_MAX: 100_000_000, // 100M in respective currency
  THEME_MAX_LENGTH: 500,
  ADDITIONAL_INSTRUCTIONS_MAX_LENGTH: 1000,
  REFINEMENT_REQUEST_MAX_LENGTH: 1000,

  // Bounded collections
  MAX_DIETARY_REQUIREMENTS: 20,
  MAX_PLANNING_PRIORITIES: 10,
  MAX_CULTURAL_PREFERENCES: 10,
  ITEM_TEXT_MAX_LENGTH: 50,
  CULTURAL_PREF_TEXT_MAX_LENGTH: 100,

  // AI Plan Generation limits
  MAX_PERSONALIZED_IDEAS: 15,
  PERSONALIZED_IDEA_MAX_LENGTH: 300,
  OVERVIEW_SUMMARY_MAX_LENGTH: 1000,

  // Budget Limits
  MAX_BUDGET_CATEGORIES: 20,
  MAX_BUDGET_ITEMS_PER_CATEGORY: 50,
  MAX_TOTAL_BUDGET_ITEMS: 200,
  MAX_CONTINGENCY_RATE: 0.5, // 50% max contingency reserve
  MINOR_UNIT_FACTOR: 100, // 100 cents/paise per unit

  // Timeline & Schedule Limits
  MAX_TIMELINE_MILESTONES: 50,
  MAX_SCHEDULE_ITEMS: 50,
  TITLE_MAX_LENGTH: 150,
  DESCRIPTION_MAX_LENGTH: 500,

  // Checklist Limits
  MAX_CHECKLIST_TASKS: 100,
  NOTES_MAX_LENGTH: 300,

  // Date Policy Limits
  MAX_YEARS_IN_FUTURE: 10,
} as const;

export const CHECKLIST_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export const CHECKLIST_PRIORITIES = ["high", "medium", "low"] as const;

export const BUDGET_PRIORITIES = ["high", "medium", "low"] as const;

export const PLAN_SECTIONS = [
  "overview",
  "budget",
  "timeline",
  "schedule",
  "checklist",
] as const;

