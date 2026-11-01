import React, { Suspense } from "react";
import type { Metadata } from "next";
import { TimelinePlannerView } from "@/features/timeline";
import { LoadingState } from "@/components/ui/LoadingState";

export const metadata: Metadata = {
  title: "Timeline Planner — CelebrAI",
  description:
    "Interactive preparation milestones, overdue task tracking, and event-day run-of-show schedule.",
};

export default function TimelinePage() {
  return (
    <Suspense fallback={<LoadingState message="Loading timeline planner..." />}>
      <TimelinePlannerView />
    </Suspense>
  );
}
