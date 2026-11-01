import React, { Suspense } from "react";
import { LoadingState } from "@/components/ui/LoadingState";
import { NewEventForm } from "./NewEventForm";

export const metadata = {
  title: "Plan a Celebration — CelebrAI",
  description: "Configure your celebration parameters for AI-assisted event planning.",
};

export default function NewEventPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading celebration planner..." />}>
      <NewEventForm />
    </Suspense>
  );
}
