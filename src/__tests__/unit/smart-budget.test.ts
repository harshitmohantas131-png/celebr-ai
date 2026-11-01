import { describe, it, expect } from "vitest";
import {
  calculateSmartBudgetMetrics,
  STANDARD_BUDGET_CATEGORIES,
} from "@/features/budget";
import { expenseFormSchema, paymentStatusSchema } from "@/lib/schemas/budget";
import type { BudgetCategory } from "@/types/event";

describe("Smart Budget Calculator Engine & Metrics", () => {
  const sampleCategories: BudgetCategory[] = [
    {
      id: "venue",
      name: "Venue",
      allocatedAmount: 6000,
      items: [
        {
          id: "v1",
          categoryId: "venue",
          name: "Main Ballroom",
          estimatedCost: 5000,
          actualCost: 5500, // Overrun of $500
          paymentStatus: "paid",
          priority: "high",
        },
        {
          id: "v2",
          categoryId: "venue",
          name: "Stage Lighting",
          estimatedCost: 800,
          actualCost: 750, // Under estimate
          paymentStatus: "partially_paid",
          priority: "medium",
        },
      ],
    },
    {
      id: "catering",
      name: "Catering",
      allocatedAmount: 4000,
      items: [
        {
          id: "c1",
          categoryId: "catering",
          name: "Dinner Service",
          estimatedCost: 3500,
          // Missing actual cost
          paymentStatus: "unpaid",
          priority: "high",
        },
      ],
    },
  ];

  it("calculates exact metrics with integer minor units", () => {
    const metrics = calculateSmartBudgetMetrics(
      12000, // total budget
      "USD",
      sampleCategories,
      0.1 // 10% contingency
    );

    // Estimated subtotal: 5000 + 800 + 3500 = 9300
    // Total estimated cost includes 10% contingency on 9300 = 930 -> 10230
    expect(metrics.categorySubtotal).toBe(9300);
    expect(metrics.totalEstimatedCost).toBe(10230);

    // Actual spent: 5500 + 750 = 6250
    expect(metrics.totalActualSpent).toBe(6250);

    // Items with actual cost: 2. Missing actual cost: 1
    expect(metrics.recordedActualsCount).toBe(2);
    expect(metrics.missingActualsCount).toBe(1);

    // Projected total: 6250 (actuals recorded) + 3500 (unrecorded estimate) + 930 (contingency) = 10680
    expect(metrics.projectedTotal).toBe(10680);
    expect(metrics.isProjectedOverBudget).toBe(false);

    // Remaining against budget: 12000 - 6250 = 5750
    expect(metrics.actualRemaining).toBe(5750);
  });

  it("correctly identifies overruns on line items and categories", () => {
    const metrics = calculateSmartBudgetMetrics(
      12000,
      "USD",
      sampleCategories,
      0.1
    );

    // Line item overrun: Ballroom estimated 5000, actual 5500 -> +500
    expect(metrics.totalOverrunAmount).toBe(500);
    expect(metrics.itemsOverEstimateCount).toBe(1);

    // Venue category: 5500 + 750 = 6250 actual vs 5800 estimated -> overrun!
    const venueMetrics = metrics.categories.find((c) => c.id === "venue");
    expect(venueMetrics).toBeDefined();
    expect(venueMetrics?.isActualOverEstimated).toBe(true);
    expect(venueMetrics?.actualOverrunAmount).toBe(450); // 6250 - 5800 = 450
  });

  it("tracks payment status distribution", () => {
    const metrics = calculateSmartBudgetMetrics(
      12000,
      "USD",
      sampleCategories,
      0.1
    );

    // Paid: 5500 (Ballroom)
    expect(metrics.paidTotal).toBe(5500);
    expect(metrics.paidCount).toBe(1);
    // Partially paid: 750 (Stage Lighting)
    expect(metrics.partiallyPaidTotal).toBe(750);
    expect(metrics.partiallyPaidCount).toBe(1);
    // Unpaid: 3500 (Dinner Service estimated, since actual is unrecorded)
    expect(metrics.unpaidTotal).toBe(3500);
    expect(metrics.unpaidCount).toBe(1);
  });

  it("detects over-budget conditions accurately", () => {
    // If budget is only 8000
    const metrics = calculateSmartBudgetMetrics(
      8000,
      "USD",
      sampleCategories,
      0.1
    );

    // Projected total is 10680 > 8000
    expect(metrics.isProjectedOverBudget).toBe(true);
  });

  it("handles zero budget and empty categories gracefully", () => {
    const metrics = calculateSmartBudgetMetrics(0, "USD", [], 0.1);

    expect(metrics.totalBudget).toBe(0);
    expect(metrics.totalEstimatedCost).toBe(0);
    expect(metrics.totalActualSpent).toBe(0);
    expect(metrics.contingencyAmount).toBe(0);
    expect(metrics.projectedTotal).toBe(0);
    expect(metrics.actualUtilization).toBe(0);
    expect(metrics.recordedActualsCount).toBe(0);
    expect(metrics.missingActualsCount).toBe(0);
    expect(metrics.itemsOverEstimateCount).toBe(0);
  });

  it("standard budget categories are well defined and unique", () => {
    expect(STANDARD_BUDGET_CATEGORIES.length).toBeGreaterThan(5);
    const ids = STANDARD_BUDGET_CATEGORIES.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });
});

describe("Expense Form & Payment Status Validation Schemas", () => {
  it("validates payment statuses", () => {
    expect(paymentStatusSchema.safeParse("unpaid").success).toBe(true);
    expect(paymentStatusSchema.safeParse("partially_paid").success).toBe(true);
    expect(paymentStatusSchema.safeParse("paid").success).toBe(true);
    expect(paymentStatusSchema.safeParse("overdue").success).toBe(false);
  });

  it("validates a sound expense form payload", () => {
    const valid = {
      name: "Sound & Audio System",
      categoryId: "cat-entertainment",
      estimatedCost: 1200,
      actualCost: 1150,
      priority: "high",
      paymentStatus: "paid",
      vendorName: "ProAudio Ltd",
      dueDate: "2026-11-15",
      notes: "Includes wireless microphones",
    };

    const result = expenseFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects invalid expense inputs", () => {
    // Empty name
    const emptyName = expenseFormSchema.safeParse({
      name: "   ",
      categoryId: "cat-venue",
      estimatedCost: 500,
    });
    expect(emptyName.success).toBe(false);

    // Negative estimated cost
    const negEstimate = expenseFormSchema.safeParse({
      name: "Floral Centerpieces",
      categoryId: "cat-decor",
      estimatedCost: -50,
    });
    expect(negEstimate.success).toBe(false);

    // Negative actual cost
    const negActual = expenseFormSchema.safeParse({
      name: "Floral Centerpieces",
      categoryId: "cat-decor",
      estimatedCost: 500,
      actualCost: -20,
    });
    expect(negActual.success).toBe(false);

    // Non-finite cost
    const nanCost = expenseFormSchema.safeParse({
      name: "Floral Centerpieces",
      categoryId: "cat-decor",
      estimatedCost: Infinity,
    });
    expect(nanCost.success).toBe(false);
  });
});
