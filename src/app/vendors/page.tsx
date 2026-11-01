import React, { Suspense } from "react";
import type { Metadata } from "next";
import { VendorChecklistView } from "@/features/vendors";
import { LoadingState } from "@/components/ui/LoadingState";

export const metadata: Metadata = {
  title: "Vendor Checklist — CelebrAI",
  description:
    "Comprehensive vendor directory and checklist tracker. Coordinate event partners, track booking statuses, monitor contract deliverables, and prevent deadline overruns.",
};

export default function VendorsPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading vendor checklist..." />}>
      <VendorChecklistView />
    </Suspense>
  );
}

