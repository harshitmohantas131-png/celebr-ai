/**
 * Zod validation schemas for vendor records, checklists, and forms.
 */

import { z } from "zod";
import {
  BOOKING_STATUSES,
  VENDOR_CATEGORIES,
} from "@/types/vendor";
import { isValidCalendarDate } from "@/lib/utils/date";

export const vendorCategorySchema = z.enum(VENDOR_CATEGORIES);

export const bookingStatusSchema = z.enum(BOOKING_STATUSES);

export const vendorTaskSchema = z.object({
  id: z.string().min(1).max(50),
  title: z
    .string()
    .trim()
    .min(1, "Task title is required.")
    .max(150, "Task title must be 150 characters or less."),
  description: z.string().trim().max(500).optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be in YYYY-MM-DD format.")
    .refine(isValidCalendarDate, "Due date must be a valid calendar date.")
    .optional(),
  completed: z.boolean().default(false),
  notes: z.string().trim().max(300).optional(),
});

export const vendorSchema = z.object({
  id: z.string().min(1).max(50),
  name: z
    .string()
    .trim()
    .min(1, "Vendor name is required.")
    .max(120, "Vendor name must be 120 characters or less."),
  category: vendorCategorySchema,
  contactName: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z
    .string()
    .trim()
    .max(100)
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Please enter a valid email address.",
    })
    .optional(),
  website: z
    .string()
    .trim()
    .max(200)
    .refine(
      (val) => {
        if (!val) return true;
        try {
          const urlToTest = val.startsWith("http://") || val.startsWith("https://") ? val : `https://${val}`;
          new URL(urlToTest);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Please enter a valid website URL." }
    )
    .optional(),
  cost: z
    .number()
    .finite("Cost must be a finite number.")
    .min(0, "Cost cannot be negative.")
    .optional(),
  bookingStatus: bookingStatusSchema.default("shortlisted"),
  notes: z.string().trim().max(500).optional(),
  checklist: z.array(vendorTaskSchema).default([]),
  budgetLineItemId: z.string().max(50).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const vendorFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Vendor or business name is required.")
    .max(120, "Vendor name must be 120 characters or less."),
  category: vendorCategorySchema,
  contactName: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z
    .string()
    .trim()
    .max(100)
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Please enter a valid email address.",
    })
    .optional(),
  website: z
    .string()
    .trim()
    .max(200)
    .refine(
      (val) => {
        if (!val) return true;
        try {
          const urlToTest = val.startsWith("http://") || val.startsWith("https://") ? val : `https://${val}`;
          new URL(urlToTest);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Please enter a valid website URL." }
    )
    .optional(),
  cost: z
    .number()
    .finite("Cost must be a finite number.")
    .min(0, "Cost cannot be negative.")
    .optional(),
  bookingStatus: bookingStatusSchema.default("shortlisted"),
  notes: z.string().trim().max(500).optional(),
  budgetLineItemId: z.string().max(50).optional(),
  includeStarterTasks: z.boolean().optional(),
});

export type VendorFormData = z.infer<typeof vendorFormSchema>;

export const vendorTaskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Task title is required.")
    .max(150, "Task title must be 150 characters or less."),
  description: z.string().trim().max(500).optional(),
  dueDate: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true;
        return isValidCalendarDate(val);
      },
      { message: "Due date must be a valid calendar date (YYYY-MM-DD)." }
    ),
  completed: z.boolean().default(false),
  notes: z.string().trim().max(300).optional(),
});

export type VendorTaskFormData = z.infer<typeof vendorTaskFormSchema>;

