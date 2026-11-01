import React, { Suspense } from "react";
import type { Metadata } from "next";
import { BudgetCalculatorView } from "@/features/budget";
import { LoadingState } from "@/components/ui/LoadingState";

export const metadata: Metadata = {
  title: "Smart Budget Calculator — CelebrAI",
  description:
    "Comprehensive event budget calculator with integer precision, category allocations, actual cost tracking, and contingency management.",
};

export default function BudgetPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading budget calculator..." />}>
      <BudgetCalculatorView />
    </Suspense>
  );
}

