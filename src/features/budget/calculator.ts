/**
 * Deterministic Budget Calculation Engine for CelebrAI.
 *
 * Implements pure financial calculations using integer minor units (cents / paise)
 * to prevent floating-point accumulation errors.
 *
 * Conventions:
 * - Contingency is calculated as a percentage of the category subtotal (default 10%)
 *   and included exactly once in the total estimated cost.
 * - Negative, non-finite (NaN, Infinity), and mixed currencies are strictly rejected.
 * - AI-proposed totals are never trusted; the application recalculates the actual total
 *   from validated line items.
 * - If estimated cost exceeds budget, the real total is preserved and an explicit warning is returned.
 */

import {
  DEFAULT_CONTINGENCY_RATE,
  EVENT_LIMITS,
  SUPPORTED_CURRENCIES,
} from "@/lib/constants/limits";
import { formatBudgetAmount } from "@/lib/utils";
import type {
  BudgetCalculationResult,
  BudgetCategory,
  CalculateBudgetInput,
  CategoryBreakdown,
  Currency,
} from "@/types/event";

export class BudgetCalculationError extends Error {
  public readonly code:
    | "INVALID_AMOUNT"
    | "NEGATIVE_AMOUNT"
    | "UNSUPPORTED_CURRENCY"
    | "MIXED_CURRENCIES"
    | "INVALID_CONTINGENCY";

  constructor(
    message: string,
    code:
      | "INVALID_AMOUNT"
      | "NEGATIVE_AMOUNT"
      | "UNSUPPORTED_CURRENCY"
      | "MIXED_CURRENCIES"
      | "INVALID_CONTINGENCY"
  ) {
    super(message);
    this.name = "BudgetCalculationError";
    this.code = code;
  }
}

/**
 * Converts a major currency unit (e.g. 10.50) to integer minor units (e.g. 1050 cents/paise).
 * Rejects negative, NaN, Infinity, and non-numeric inputs.
 */
export function toMinorUnits(amount: number): number {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    throw new BudgetCalculationError(
      `Monetary amount must be a finite number. Received: ${amount}`,
      "INVALID_AMOUNT"
    );
  }
  if (amount < 0) {
    throw new BudgetCalculationError(
      `Monetary amount cannot be negative. Received: ${amount}`,
      "NEGATIVE_AMOUNT"
    );
  }
  return Math.round(amount * EVENT_LIMITS.MINOR_UNIT_FACTOR);
}

/**
 * Converts integer minor units back to a major currency amount rounded to 2 decimal places.
 */
export function fromMinorUnits(minorUnits: number): number {
  return Number((minorUnits / EVENT_LIMITS.MINOR_UNIT_FACTOR).toFixed(2));
}

/**
 * Validates that the provided currency is supported.
 */
export function validateCurrency(currency: string): asserts currency is Currency {
  if (!SUPPORTED_CURRENCIES.includes(currency as Currency)) {
    throw new BudgetCalculationError(
      `Unsupported currency "${currency}". CelebrAI supports: ${SUPPORTED_CURRENCIES.join(", ")}`,
      "UNSUPPORTED_CURRENCY"
    );
  }
}

/**
 * Pure calculation function for event budgets.
 * Computes category subtotal, contingency amount, total estimated cost, and remaining budget.
 */
export function calculateBudget(input: CalculateBudgetInput): BudgetCalculationResult {
  const currency: Currency = input.currency ?? "USD";
  validateCurrency(currency);

  const totalBudgetMinor = toMinorUnits(input.totalBudget);

  // Validate contingency rate / fixed amount
  let contingencyMinor = 0;
  let effectiveContingencyRate = input.contingencyRate ?? DEFAULT_CONTINGENCY_RATE;

  if (input.fixedContingencyAmount !== undefined) {
    contingencyMinor = toMinorUnits(input.fixedContingencyAmount);
    effectiveContingencyRate = 0;
  } else {
    if (
      typeof effectiveContingencyRate !== "number" ||
      !Number.isFinite(effectiveContingencyRate) ||
      effectiveContingencyRate < 0 ||
      effectiveContingencyRate > EVENT_LIMITS.MAX_CONTINGENCY_RATE
    ) {
      throw new BudgetCalculationError(
        `Contingency rate must be between 0 and ${EVENT_LIMITS.MAX_CONTINGENCY_RATE}. Received: ${effectiveContingencyRate}`,
        "INVALID_CONTINGENCY"
      );
    }
  }

  // Accumulate categories and verify line items
  let categorySubtotalMinor = 0;
  const categoryBreakdown: CategoryBreakdown[] = [];

  for (const category of input.categories) {
    let catSubtotalMinor = 0;

    for (const item of category.items) {
      // Validate currency if specified on the item
      if (item.currency && item.currency !== currency) {
        throw new BudgetCalculationError(
          `Mixed currencies detected in category "${category.name}". Item "${item.name}" specifies ${item.currency}, but budget is in ${currency}.`,
          "MIXED_CURRENCIES"
        );
      }

      const itemMinor = toMinorUnits(item.estimatedCost);
      catSubtotalMinor += itemMinor;
    }

    categorySubtotalMinor += catSubtotalMinor;

    categoryBreakdown.push({
      categoryId: category.id,
      categoryName: category.name,
      subtotal: fromMinorUnits(catSubtotalMinor),
      percentageOfTotal: 0, // Computed after total is finalized
      itemCount: category.items.length,
    });
  }

  // If percentage-based contingency, calculate strictly from category subtotal
  if (input.fixedContingencyAmount === undefined) {
    contingencyMinor = Math.round(categorySubtotalMinor * effectiveContingencyRate);
  }

  // Final totals
  const totalEstimatedCostMinor = categorySubtotalMinor + contingencyMinor;
  const remainingBudgetMinor = totalBudgetMinor - totalEstimatedCostMinor;
  const isOverBudget = remainingBudgetMinor < 0;
  const overBudgetAmountMinor = isOverBudget ? Math.abs(remainingBudgetMinor) : 0;

  // Finalize category percentages based on total estimated cost (or category subtotal if total is 0)
  for (const cat of categoryBreakdown) {
    const catMinor = toMinorUnits(cat.subtotal);
    cat.percentageOfTotal =
      totalEstimatedCostMinor > 0
        ? Number(((catMinor / totalEstimatedCostMinor) * 100).toFixed(2))
        : 0;
  }

  const warnings: string[] = [];
  if (isOverBudget) {
    const overFormatted = formatBudgetAmount(fromMinorUnits(overBudgetAmountMinor), currency);
    const estFormatted = formatBudgetAmount(fromMinorUnits(totalEstimatedCostMinor), currency);
    const budgetFormatted = formatBudgetAmount(fromMinorUnits(totalBudgetMinor), currency);
    warnings.push(
      `Proposed plan exceeds the total budget of ${budgetFormatted} by ${overFormatted} (Total estimated: ${estFormatted}).`
    );
  }

  return {
    currency,
    totalBudget: fromMinorUnits(totalBudgetMinor),
    categorySubtotal: fromMinorUnits(categorySubtotalMinor),
    contingencyRate: effectiveContingencyRate,
    contingencyAmount: fromMinorUnits(contingencyMinor),
    totalEstimatedCost: fromMinorUnits(totalEstimatedCostMinor),
    remainingBudget: fromMinorUnits(remainingBudgetMinor),
    isOverBudget,
    overBudgetAmount: fromMinorUnits(overBudgetAmountMinor),
    categoryBreakdown,
    warnings,
  };
}

export interface StandardCategory {
  id: string;
  name: string;
  description: string;
}

export const STANDARD_BUDGET_CATEGORIES: StandardCategory[] = [
  { id: "cat-venue", name: "Venue & Rentals", description: "Site rental, tables, chairs, lighting, tents" },
  { id: "cat-catering", name: "Catering & Bar", description: "Food, beverages, bar service, service staff" },
  { id: "cat-decor", name: "Décor & Florals", description: "Centerpieces, bouquets, installations, signage" },
  { id: "cat-entertainment", name: "Entertainment & Music", description: "DJ, live band, sound rig, MC, performers" },
  { id: "cat-photography", name: "Photography & Videography", description: "Lead shooter, video edits, photobooth" },
  { id: "cat-attire", name: "Attire & Beauty", description: "Outfits, tailoring, hair styling, makeup" },
  { id: "cat-transport", name: "Transport & Logistics", description: "Shuttles, parking, equipment transport" },
  { id: "cat-accommodation", name: "Accommodation", description: "Host hotel, bridal suite, room blocks" },
  { id: "cat-invitations", name: "Invitations & Stationery", description: "Save the dates, print invites, stamps, menus" },
  { id: "cat-staffing", name: "Staffing & Coordination", description: "Day-of coordinator, security, cleanup crew" },
  { id: "cat-miscellaneous", name: "Miscellaneous & Favors", description: "Guest favors, tips, emergency cash, licensing" },
];

export interface SmartCategoryMetrics {
  id: string;
  name: string;
  allocatedAmount: number;
  estimatedSubtotal: number;
  actualSubtotal: number;
  itemsCount: number;
  recordedActualsCount: number;
  isOverAllocated: boolean;
  isActualOverEstimated: boolean;
  actualOverrunAmount: number;
  percentageOfBudget: number;
}

export interface SmartBudgetMetrics {
  currency: Currency;
  totalBudget: number;
  categorySubtotal: number;
  contingencyRate: number;
  contingencyAmount: number;
  totalEstimatedCost: number;
  estimatedRemaining: number;
  isEstimatedOverBudget: boolean;
  estimatedOverBudgetAmount: number;
  estimatedUtilization: number;

  // Actual costs
  totalActualSpent: number;
  recordedActualsCount: number;
  missingActualsCount: number;
  actualRemaining: number;
  isActualOverBudget: boolean;
  actualOverBudgetAmount: number;
  actualUtilization: number;
  projectedTotal: number;
  isProjectedOverBudget: boolean;
  projectedOverBudgetAmount: number;

  // Payment statuses
  paidTotal: number;
  partiallyPaidTotal: number;
  unpaidTotal: number;
  paidCount: number;
  partiallyPaidCount: number;
  unpaidCount: number;

  // Overrun tracking
  itemsOverEstimateCount: number;
  totalOverrunAmount: number;

  // Category breakdown
  categories: SmartCategoryMetrics[];
  warnings: string[];
}

/**
 * Computes authoritative, comprehensive financial metrics for an EventPlan's budget.
 * Distinguishes estimated costs, actual spending to date, projected totals, and payment distributions.
 */
export function calculateSmartBudgetMetrics(
  totalBudget: number,
  currency: Currency,
  categories: BudgetCategory[],
  contingencyRate: number = DEFAULT_CONTINGENCY_RATE
): SmartBudgetMetrics {
  validateCurrency(currency);

  const totalBudgetMinor = toMinorUnits(totalBudget);
  const effectiveContingencyRate = Math.max(0, Math.min(contingencyRate, EVENT_LIMITS.MAX_CONTINGENCY_RATE));

  let categorySubtotalMinor = 0;
  let totalActualSpentMinor = 0;
  let unrecordedEstimatedMinor = 0;
  let recordedActualsCount = 0;
  let missingActualsCount = 0;
  let itemsOverEstimateCount = 0;
  let totalOverrunMinor = 0;

  let paidMinor = 0;
  let partiallyPaidMinor = 0;
  let unpaidMinor = 0;
  let paidCount = 0;
  let partiallyPaidCount = 0;
  let unpaidCount = 0;

  const categoryMetrics: SmartCategoryMetrics[] = [];

  for (const cat of categories) {
    let catEstMinor = 0;
    let catActMinor = 0;
    let catRecordedCount = 0;

    for (const item of cat.items) {
      if (item.currency && item.currency !== currency) {
        throw new BudgetCalculationError(
          `Mixed currency "${item.currency}" on expense "${item.name}". Expected ${currency}.`,
          "MIXED_CURRENCIES"
        );
      }

      const itemEstMinor = toMinorUnits(item.estimatedCost);
      catEstMinor += itemEstMinor;

      const hasActual = item.actualCost !== undefined && item.actualCost !== null;
      if (hasActual) {
        const itemActMinor = toMinorUnits(item.actualCost!);
        catActMinor += itemActMinor;
        totalActualSpentMinor += itemActMinor;
        catRecordedCount += 1;
        recordedActualsCount += 1;

        if (itemActMinor > itemEstMinor) {
          itemsOverEstimateCount += 1;
          totalOverrunMinor += itemActMinor - itemEstMinor;
        }

        const costToCount = itemActMinor;
        if (item.paymentStatus === "paid") {
          paidMinor += costToCount;
          paidCount += 1;
        } else if (item.paymentStatus === "partially_paid") {
          partiallyPaidMinor += costToCount;
          partiallyPaidCount += 1;
        } else {
          unpaidMinor += costToCount;
          unpaidCount += 1;
        }
      } else {
        missingActualsCount += 1;
        unrecordedEstimatedMinor += itemEstMinor;
        unpaidMinor += itemEstMinor;
        unpaidCount += 1;
      }
    }

    categorySubtotalMinor += catEstMinor;

    const allocatedAmountMinor =
      cat.allocatedAmount !== undefined ? toMinorUnits(cat.allocatedAmount) : catEstMinor;

    categoryMetrics.push({
      id: cat.id,
      name: cat.name,
      allocatedAmount: fromMinorUnits(allocatedAmountMinor),
      estimatedSubtotal: fromMinorUnits(catEstMinor),
      actualSubtotal: fromMinorUnits(catActMinor),
      itemsCount: cat.items.length,
      recordedActualsCount: catRecordedCount,
      isOverAllocated: catEstMinor > allocatedAmountMinor,
      isActualOverEstimated: catActMinor > catEstMinor,
      actualOverrunAmount:
        catActMinor > catEstMinor ? fromMinorUnits(catActMinor - catEstMinor) : 0,
      percentageOfBudget:
        totalBudgetMinor > 0 ? Number(((catEstMinor / totalBudgetMinor) * 100).toFixed(1)) : 0,
    });
  }

  const contingencyMinor = Math.round(categorySubtotalMinor * effectiveContingencyRate);
  const totalEstimatedCostMinor = categorySubtotalMinor + contingencyMinor;
  const estimatedRemainingMinor = totalBudgetMinor - totalEstimatedCostMinor;
  const isEstimatedOverBudget = estimatedRemainingMinor < 0;
  const estimatedOverBudgetAmountMinor = isEstimatedOverBudget
    ? Math.abs(estimatedRemainingMinor)
    : 0;

  const actualRemainingMinor = totalBudgetMinor - totalActualSpentMinor;
  const isActualOverBudget = actualRemainingMinor < 0;
  const actualOverBudgetAmountMinor = isActualOverBudget ? Math.abs(actualRemainingMinor) : 0;

  const projectedTotalMinor = totalActualSpentMinor + unrecordedEstimatedMinor + contingencyMinor;
  const isProjectedOverBudget = projectedTotalMinor > totalBudgetMinor;
  const projectedOverBudgetAmountMinor = isProjectedOverBudget
    ? projectedTotalMinor - totalBudgetMinor
    : 0;

  const estimatedUtilization =
    totalBudgetMinor > 0 ? Math.round((totalEstimatedCostMinor / totalBudgetMinor) * 100) : 0;
  const actualUtilization =
    totalBudgetMinor > 0 ? Math.round((totalActualSpentMinor / totalBudgetMinor) * 100) : 0;

  const warnings: string[] = [];
  if (isEstimatedOverBudget) {
    const overAmt = formatBudgetAmount(fromMinorUnits(estimatedOverBudgetAmountMinor), currency);
    const estTot = formatBudgetAmount(fromMinorUnits(totalEstimatedCostMinor), currency);
    const budTot = formatBudgetAmount(fromMinorUnits(totalBudgetMinor), currency);
    warnings.push(
      `Estimated budget exceeds limit by ${overAmt} (Estimated total: ${estTot} vs Target: ${budTot}).`
    );
  }
  if (isActualOverBudget) {
    const actOver = formatBudgetAmount(fromMinorUnits(actualOverBudgetAmountMinor), currency);
    const actTot = formatBudgetAmount(fromMinorUnits(totalActualSpentMinor), currency);
    warnings.push(`Actual spending has exceeded total budget by ${actOver} (Spent: ${actTot}).`);
  }
  if (itemsOverEstimateCount > 0) {
    const overrunFormatted = formatBudgetAmount(fromMinorUnits(totalOverrunMinor), currency);
    warnings.push(
      `${itemsOverEstimateCount} expense item(s) exceed their initial estimates by ${overrunFormatted} in total.`
    );
  }

  return {
    currency,
    totalBudget: fromMinorUnits(totalBudgetMinor),
    categorySubtotal: fromMinorUnits(categorySubtotalMinor),
    contingencyRate: effectiveContingencyRate,
    contingencyAmount: fromMinorUnits(contingencyMinor),
    totalEstimatedCost: fromMinorUnits(totalEstimatedCostMinor),
    estimatedRemaining: fromMinorUnits(estimatedRemainingMinor),
    isEstimatedOverBudget,
    estimatedOverBudgetAmount: fromMinorUnits(estimatedOverBudgetAmountMinor),
    estimatedUtilization,

    totalActualSpent: fromMinorUnits(totalActualSpentMinor),
    recordedActualsCount,
    missingActualsCount,
    actualRemaining: fromMinorUnits(actualRemainingMinor),
    isActualOverBudget,
    actualOverBudgetAmount: fromMinorUnits(actualOverBudgetAmountMinor),
    actualUtilization,
    projectedTotal: fromMinorUnits(projectedTotalMinor),
    isProjectedOverBudget,
    projectedOverBudgetAmount: fromMinorUnits(projectedOverBudgetAmountMinor),

    paidTotal: fromMinorUnits(paidMinor),
    partiallyPaidTotal: fromMinorUnits(partiallyPaidMinor),
    unpaidTotal: fromMinorUnits(unpaidMinor),
    paidCount,
    partiallyPaidCount,
    unpaidCount,

    itemsOverEstimateCount,
    totalOverrunAmount: fromMinorUnits(totalOverrunMinor),

    categories: categoryMetrics,
    warnings,
  };
}

