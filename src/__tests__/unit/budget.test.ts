import { describe, it, expect } from "vitest";
import {
  calculateBudget,
  toMinorUnits,
  fromMinorUnits,
  BudgetCalculationError,
} from "@/features/budget";
import { formatBudgetAmount } from "@/lib/utils";
import type { BudgetCategory, Currency } from "@/types/event";

describe("Budget Calculation Engine", () => {
  const sampleCategories: BudgetCategory[] = [
    {
      id: "venue",
      name: "Venue & Rentals",
      items: [
        {
          id: "v1",
          categoryId: "venue",
          name: "Garden Hall Rental",
          estimatedCost: 4000,
          priority: "high",
        },
        {
          id: "v2",
          categoryId: "venue",
          name: "Tables & Chairs",
          estimatedCost: 1500,
          priority: "medium",
        },
      ],
    },
    {
      id: "catering",
      name: "Catering & Beverage",
      items: [
        {
          id: "c1",
          categoryId: "catering",
          name: "Dinner Buffet (100 guests)",
          estimatedCost: 3000,
          priority: "high",
        },
      ],
    },
  ];

  it("calculates correct category subtotal, contingency, and total", () => {
    // Subtotal: 4000 + 1500 + 3000 = 8500
    // Contingency: 10% of 8500 = 850
    // Total Estimated: 8500 + 850 = 9350
    // Budget: 10000 -> Remaining: 650
    const result = calculateBudget({
      totalBudget: 10000,
      currency: "USD",
      categories: sampleCategories,
      contingencyRate: 0.1,
    });

    expect(result.categorySubtotal).toBe(8500);
    expect(result.contingencyRate).toBe(0.1);
    expect(result.contingencyAmount).toBe(850);
    expect(result.totalEstimatedCost).toBe(9350);
    expect(result.remainingBudget).toBe(650);
    expect(result.isOverBudget).toBe(false);
    expect(result.overBudgetAmount).toBe(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("includes contingency exactly once in the final total", () => {
    const result = calculateBudget({
      totalBudget: 15000,
      currency: "USD",
      categories: sampleCategories,
      contingencyRate: 0.15, // 15%
    });

    // Subtotal = 8500
    // Contingency = 8500 * 0.15 = 1275
    // Total = 8500 + 1275 = 9775
    expect(result.contingencyAmount).toBe(1275);
    expect(result.totalEstimatedCost).toBe(result.categorySubtotal + result.contingencyAmount);
    expect(result.totalEstimatedCost).toBe(9775);
  });

  it("supports fixed contingency amount", () => {
    const result = calculateBudget({
      totalBudget: 10000,
      currency: "USD",
      categories: sampleCategories,
      fixedContingencyAmount: 500,
    });

    expect(result.categorySubtotal).toBe(8500);
    expect(result.contingencyAmount).toBe(500);
    expect(result.totalEstimatedCost).toBe(9000);
    expect(result.remainingBudget).toBe(1000);
  });

  it("handles exact-budget boundary condition", () => {
    // Total Estimated is 9350 with 10% contingency
    const result = calculateBudget({
      totalBudget: 9350,
      currency: "USD",
      categories: sampleCategories,
      contingencyRate: 0.1,
    });

    expect(result.totalEstimatedCost).toBe(9350);
    expect(result.remainingBudget).toBe(0);
    expect(result.isOverBudget).toBe(false);
    expect(result.overBudgetAmount).toBe(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("identifies over-budget plans without altering actual costs", () => {
    // Budget is 9000, total estimated is 9350 -> over by 350
    const result = calculateBudget({
      totalBudget: 9000,
      currency: "USD",
      categories: sampleCategories,
      contingencyRate: 0.1,
    });

    expect(result.totalEstimatedCost).toBe(9350);
    expect(result.remainingBudget).toBe(-350);
    expect(result.isOverBudget).toBe(true);
    expect(result.overBudgetAmount).toBe(350);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("exceeds the total budget of $9,000.00 by $350.00");
  });

  it("handles empty categories / zero line items", () => {
    const result = calculateBudget({
      totalBudget: 5000,
      currency: "USD",
      categories: [],
    });

    expect(result.categorySubtotal).toBe(0);
    expect(result.contingencyAmount).toBe(0);
    expect(result.totalEstimatedCost).toBe(0);
    expect(result.remainingBudget).toBe(5000);
    expect(result.isOverBudget).toBe(false);
  });

  it("calculates breakdown percentages accurately across categories", () => {
    const result = calculateBudget({
      totalBudget: 10000,
      currency: "USD",
      categories: sampleCategories,
      contingencyRate: 0, // 0 contingency to verify raw breakdown percentages
    });

    expect(result.categoryBreakdown).toHaveLength(2);
    // Venue: 5500 / 8500 = 64.71%
    // Catering: 3000 / 8500 = 35.29%
    expect(result.categoryBreakdown[0].categoryName).toBe("Venue & Rentals");
    expect(result.categoryBreakdown[0].subtotal).toBe(5500);
    expect(result.categoryBreakdown[0].percentageOfTotal).toBe(64.71);

    expect(result.categoryBreakdown[1].categoryName).toBe("Catering & Beverage");
    expect(result.categoryBreakdown[1].subtotal).toBe(3000);
    expect(result.categoryBreakdown[1].percentageOfTotal).toBe(35.29);
  });

  describe("Validation & Rejection of Malformed Inputs", () => {
    it("rejects negative line item amounts", () => {
      const invalidCategories: BudgetCategory[] = [
        {
          id: "cat",
          name: "Decor",
          items: [
            {
              id: "i1",
              categoryId: "cat",
              name: "Floral arrangement",
              estimatedCost: -250,
              priority: "medium",
            },
          ],
        },
      ];

      expect(() =>
        calculateBudget({
          totalBudget: 5000,
          categories: invalidCategories,
        })
      ).toThrow(BudgetCalculationError);
    });

    it("rejects non-finite monetary amounts (NaN and Infinity)", () => {
      const invalidCategories: BudgetCategory[] = [
        {
          id: "cat",
          name: "Decor",
          items: [
            {
              id: "i1",
              categoryId: "cat",
              name: "Floral arrangement",
              estimatedCost: NaN,
              priority: "medium",
            },
          ],
        },
      ];

      expect(() =>
        calculateBudget({
          totalBudget: 5000,
          categories: invalidCategories,
        })
      ).toThrowError(/finite number/);

      expect(() =>
        calculateBudget({
          totalBudget: Infinity,
          categories: [],
        })
      ).toThrowError(/finite number/);
    });

    it("rejects negative total budget", () => {
      expect(() =>
        calculateBudget({
          totalBudget: -5000,
          categories: [],
        })
      ).toThrow(BudgetCalculationError);
    });

    it("rejects mixed currencies between budget and line items", () => {
      const mixedCategories: BudgetCategory[] = [
        {
          id: "venue",
          name: "Venue",
          items: [
            {
              id: "i1",
              categoryId: "venue",
              name: "Deposit",
              estimatedCost: 1000,
              priority: "high",
              currency: "INR", // Mismatched currency
            },
          ],
        },
      ];

      expect(() =>
        calculateBudget({
          totalBudget: 5000,
          currency: "USD",
          categories: mixedCategories,
        })
      ).toThrowError(/Mixed currencies/);
    });

    it("rejects unsupported currencies", () => {
      expect(() =>
        calculateBudget({
          totalBudget: 5000,
          currency: "EUR" as unknown as Currency,
          categories: [],
        })
      ).toThrowError(/Unsupported currency/);
    });

    it("rejects invalid contingency rate", () => {
      expect(() =>
        calculateBudget({
          totalBudget: 5000,
          contingencyRate: -0.05,
          categories: [],
        })
      ).toThrow(BudgetCalculationError);

      expect(() =>
        calculateBudget({
          totalBudget: 5000,
          contingencyRate: 0.8, // Exceeds max 50%
          categories: [],
        })
      ).toThrow(BudgetCalculationError);
    });
  });

  describe("Floating-Point Precision & Rounding in Minor Units", () => {
    it("safely handles 0.1 + 0.2 floating point precision issues", () => {
      // 0.1 + 0.2 in JS IEEE 754 is 0.30000000000000004
      const categories: BudgetCategory[] = [
        {
          id: "items",
          name: "Small supplies",
          items: [
            { id: "1", categoryId: "items", name: "Item A", estimatedCost: 0.1, priority: "low" },
            { id: "2", categoryId: "items", name: "Item B", estimatedCost: 0.2, priority: "low" },
          ],
        },
      ];

      const result = calculateBudget({
        totalBudget: 1.0,
        currency: "USD",
        categories,
        contingencyRate: 0,
      });

      expect(result.categorySubtotal).toBe(0.3);
      expect(result.remainingBudget).toBe(0.7);
    });

    it("rounds fractional cents/paise consistently", () => {
      expect(toMinorUnits(10.555)).toBe(1056);
      expect(fromMinorUnits(1056)).toBe(10.56);
      expect(toMinorUnits(10.554)).toBe(1055);
      expect(fromMinorUnits(1055)).toBe(10.55);
    });
  });

  describe("Currency-Specific Formatting", () => {
    it("formats USD currency correctly", () => {
      const formatted = formatBudgetAmount(15000, "USD");
      expect(formatted).toBe("$15,000.00");
    });

    it("formats INR currency with Indian numbering system", () => {
      const formatted = formatBudgetAmount(150000, "INR");
      expect(formatted).toBe("₹1,50,000.00");
    });

    it("formats over-budget warning in INR correctly", () => {
      const inrCategories: BudgetCategory[] = [
        {
          id: "venue",
          name: "Palace Venue",
          items: [
            { id: "v", categoryId: "venue", name: "Hall", estimatedCost: 250000, priority: "high" },
          ],
        },
      ];

      const result = calculateBudget({
        totalBudget: 200000,
        currency: "INR",
        categories: inrCategories,
        contingencyRate: 0.1, // 25,000 contingency -> Total: 275,000
      });

      expect(result.isOverBudget).toBe(true);
      expect(result.overBudgetAmount).toBe(75000);
      expect(result.warnings[0]).toContain("₹75,000.00");
      expect(result.warnings[0]).toContain("₹2,75,000.00");
      expect(result.warnings[0]).toContain("₹2,00,000.00");
    });
  });
});

