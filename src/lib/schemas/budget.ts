/**
 * Zod validation schemas for budget calculations and line items.
 */

import { z } from "zod";
import {
  BUDGET_PRIORITIES,
  EVENT_LIMITS,
  SUPPORTED_CURRENCIES,
} from "@/lib/constants/limits";
import { isValidCalendarDate } from "@/lib/utils/date";

export const paymentStatusSchema = z.enum(["unpaid", "partially_paid", "paid"]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const budgetLineItemSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().trim().min(1).max(100),
  estimatedCost: z
    .number({
      error: "Estimated cost must be a number.",
    })
    .finite("Estimated cost must be a finite number.")
    .min(0, "Estimated cost cannot be negative."),
  priority: z.enum(BUDGET_PRIORITIES),
  categoryId: z.string().min(1).max(50),
  notes: z.string().max(EVENT_LIMITS.NOTES_MAX_LENGTH).optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  actualCost: z
    .number()
    .finite("Actual cost must be a finite number.")
    .min(0, "Actual cost cannot be negative.")
    .optional(),
  paymentStatus: paymentStatusSchema.default("unpaid").optional(),
  vendorName: z.string().max(100).optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be in YYYY-MM-DD format.")
    .refine(isValidCalendarDate, "Due date must be a valid calendar date.")
    .optional(),
});

export const expenseFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Expense name is required.")
    .max(100, "Expense name must be 100 characters or less."),
  categoryId: z.string().min(1, "Please select an expense category."),
  estimatedCost: z
    .number({
      error: "Estimated cost must be a valid number.",
    })
    .finite("Estimated cost must be a finite number.")
    .min(0, "Estimated cost cannot be negative."),
  actualCost: z
    .number()
    .finite("Actual cost must be a finite number.")
    .min(0, "Actual cost cannot be negative.")
    .optional(),
  paymentStatus: paymentStatusSchema.default("unpaid"),
  priority: z.enum(BUDGET_PRIORITIES).default("medium"),
  vendorName: z.string().max(100, "Vendor name must be 100 characters or less.").optional(),
  notes: z.string().max(EVENT_LIMITS.NOTES_MAX_LENGTH, "Notes must be 500 characters or less.").optional(),
  dueDate: z
    .string()
    .refine((val) => !val || isValidCalendarDate(val), "Due date must be in YYYY-MM-DD format.")
    .optional(),
});

export type ExpenseFormData = z.infer<typeof expenseFormSchema>;

export const budgetCategorySchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().trim().min(1).max(100),
  allocatedAmount: z.number().finite().min(0).optional(),
  items: z
    .array(budgetLineItemSchema)
    .max(
      EVENT_LIMITS.MAX_BUDGET_ITEMS_PER_CATEGORY,
      `Cannot exceed ${EVENT_LIMITS.MAX_BUDGET_ITEMS_PER_CATEGORY} items per budget category.`
    ),
});

export const calculateBudgetInputSchema = z.object({
  totalBudget: z
    .number({
      error: "Total budget must be a number.",
    })
    .finite("Total budget must be a finite number.")
    .min(0, "Total budget cannot be negative."),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  categories: z
    .array(budgetCategorySchema)
    .max(
      EVENT_LIMITS.MAX_BUDGET_CATEGORIES,
      `Cannot exceed ${EVENT_LIMITS.MAX_BUDGET_CATEGORIES} budget categories.`
    ),
  contingencyRate: z
    .number()
    .finite()
    .min(0, "Contingency rate cannot be negative.")
    .max(
      EVENT_LIMITS.MAX_CONTINGENCY_RATE,
      `Contingency rate cannot exceed ${EVENT_LIMITS.MAX_CONTINGENCY_RATE * 100}%.`
    )
    .optional(),
  fixedContingencyAmount: z
    .number()
    .finite()
    .min(0, "Fixed contingency amount cannot be negative.")
    .optional(),
});

export const categoryBreakdownSchema = z.object({
  categoryId: z.string().min(1),
  categoryName: z.string().min(1),
  subtotal: z.number().finite().min(0),
  percentageOfTotal: z.number().finite().min(0).max(100),
  itemCount: z.number().int().min(0),
});

export const budgetCalculationResultSchema = z.object({
  currency: z.enum(SUPPORTED_CURRENCIES),
  totalBudget: z.number().finite().min(0),
  categorySubtotal: z.number().finite().min(0),
  contingencyRate: z.number().finite().min(0).max(EVENT_LIMITS.MAX_CONTINGENCY_RATE),
  contingencyAmount: z.number().finite().min(0),
  totalEstimatedCost: z.number().finite().min(0),
  remainingBudget: z.number().finite(),
  isOverBudget: z.boolean(),
  overBudgetAmount: z.number().finite().min(0),
  categoryBreakdown: z.array(categoryBreakdownSchema),
  warnings: z.array(z.string()),
});

