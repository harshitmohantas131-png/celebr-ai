/**
 * Zod validation schema for vendor checklist tasks.
 */

import { z } from "zod";
import {
  CHECKLIST_PRIORITIES,
  CHECKLIST_STATUSES,
  EVENT_LIMITS,
} from "@/lib/constants/limits";
import { isValidCalendarDate } from "@/lib/utils/date";

export const checklistTaskSchema = z.object({
  id: z.string().min(1).max(50),
  title: z
    .string()
    .trim()
    .min(1, "Checklist task title is required.")
    .max(EVENT_LIMITS.TITLE_MAX_LENGTH),
  category: z.string().trim().min(1).max(50),
  status: z.enum(CHECKLIST_STATUSES),
  priority: z.enum(CHECKLIST_PRIORITIES),
  dueDate: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      return isValidCalendarDate(val);
    }, "Due date must be a valid calendar date in YYYY-MM-DD format."),
  notes: z.string().max(EVENT_LIMITS.NOTES_MAX_LENGTH).optional(),
});

