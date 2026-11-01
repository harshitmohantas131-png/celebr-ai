import React, { Suspense } from "react";
import { LoadingState } from "@/components/ui/LoadingState";
import { PlanClientLoader } from "./PlanClientLoader";

export const metadata = {
  title: "Celebration Plan Dashboard — CelebrAI",
  description: "AI-synthesized schedule, financial model, and vendor coordination checklist.",
};

export default function PlanPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading celebration plan..." />}>
      <PlanClientLoader />
    </Suspense>
  );
}
