/**
 * Zod validation schemas for timeline milestones and schedule items.
 */

import { z } from "zod";
import { EVENT_LIMITS } from "@/lib/constants/limits";
import {
  isValidCalendarDate,
  isValidTimeString,
  parseTimeToMinutes,
} from "@/lib/utils/date";

export const milestoneStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "cancelled",
]);

export const milestonePrioritySchema = z.enum(["high", "medium", "low"]);

export const timelineMilestoneSchema = z.object({
  id: z.string().min(1).max(50),
  title: z
    .string()
    .trim()
    .min(1, "Milestone title is required.")
    .max(EVENT_LIMITS.TITLE_MAX_LENGTH),
  description: z.string().max(EVENT_LIMITS.DESCRIPTION_MAX_LENGTH).default(""),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Target date must be in YYYY-MM-DD format.")
    .refine(isValidCalendarDate, "Target date must be a valid calendar date."),
  daysBeforeEvent: z
    .number()
    .int("daysBeforeEvent must be an integer.")
    .min(0, "daysBeforeEvent cannot be negative."),
  category: z.string().trim().min(1).max(50),
  completed: z.boolean().default(false),
  time: z
    .string()
    .refine((val) => !val || isValidTimeString(val), "Time must be in HH:mm 24-hour format.")
    .optional(),
  priority: milestonePrioritySchema.default("medium"),
  status: milestoneStatusSchema.optional(),
});

export const milestoneFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Milestone title is required.")
    .max(EVENT_LIMITS.TITLE_MAX_LENGTH, `Title must be ${EVENT_LIMITS.TITLE_MAX_LENGTH} characters or less.`),
  description: z
    .string()
    .max(EVENT_LIMITS.DESCRIPTION_MAX_LENGTH, `Description must be ${EVENT_LIMITS.DESCRIPTION_MAX_LENGTH} characters or less.`)
    .default(""),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Target date must be in YYYY-MM-DD format.")
    .refine(isValidCalendarDate, "Target date must be a valid calendar date."),
  time: z
    .string()
    .refine((val) => !val || isValidTimeString(val), "Time must be in HH:mm 24-hour format.")
    .optional(),
  priority: milestonePrioritySchema.default("medium"),
  category: z.string().trim().min(1, "Category is required.").max(50),
  status: milestoneStatusSchema.default("pending"),
});

export type MilestoneFormData = z.infer<typeof milestoneFormSchema>;

export const scheduleItemFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Schedule item title is required.")
      .max(EVENT_LIMITS.TITLE_MAX_LENGTH, `Title must be ${EVENT_LIMITS.TITLE_MAX_LENGTH} characters or less.`),
    startTime: z
      .string()
      .refine(isValidTimeString, "Start time must be in HH:mm 24-hour format."),
    endTime: z
      .string()
      .refine(isValidTimeString, "End time must be in HH:mm 24-hour format."),
    description: z
      .string()
      .max(EVENT_LIMITS.DESCRIPTION_MAX_LENGTH, `Description must be ${EVENT_LIMITS.DESCRIPTION_MAX_LENGTH} characters or less.`)
      .default(""),
    location: z.string().max(100).optional(),
    responsibleRole: z.string().max(100).optional(),
  })
  .refine(
    (item) => {
      const startMin = parseTimeToMinutes(item.startTime);
      const endMin = parseTimeToMinutes(item.endTime);
      if (startMin === null || endMin === null) return false;
      return startMin < endMin;
    },
    {
      message: "End time must be strictly after start time.",
      path: ["endTime"],
    }
  );

export type ScheduleItemFormData = z.infer<typeof scheduleItemFormSchema>;

export const scheduleItemSchema = z
  .object({
    id: z.string().min(1).max(50),
    title: z
      .string()
      .trim()
      .min(1, "Schedule item title is required.")
      .max(EVENT_LIMITS.TITLE_MAX_LENGTH),
    startTime: z
      .string()
      .refine(isValidTimeString, "Start time must be in HH:mm 24-hour format."),
    endTime: z
      .string()
      .refine(isValidTimeString, "End time must be in HH:mm 24-hour format."),
    description: z.string().max(EVENT_LIMITS.DESCRIPTION_MAX_LENGTH).default(""),
    location: z.string().max(100).optional(),
    responsibleRole: z.string().max(100).optional(),
  })
  .refine(
    (item) => {
      const startMin = parseTimeToMinutes(item.startTime);
      const endMin = parseTimeToMinutes(item.endTime);
      if (startMin === null || endMin === null) return false;
      return startMin < endMin;
    },
    {
      message: "Schedule item end time must be strictly after start time.",
      path: ["endTime"],
    }
  );

