/**
 * Shared utility functions.
 * Pure, side-effect-free helpers used across features.
 */

import type { Currency } from "@/types/event";

export * from "./date";

/**
 * Format a number as a currency string.
 * @example formatCurrency(1500) // "$1,500.00"
 */
export function formatCurrency(
  amount: number,
  locale = "en-US",
  currency = "USD"
): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    amount
  );
}

/**
 * Currency-aware formatting for CelebrAI event budgets.
 * Supports USD and INR with canonical regional number formatting.
 *
 * @example formatBudgetAmount(150000, "INR") // "₹1,50,000.00"
 * @example formatBudgetAmount(15000, "USD") // "$15,000.00"
 */
export function formatBudgetAmount(amount: number, currency: Currency = "USD"): string {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Clamp a number between min and max (inclusive).
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
