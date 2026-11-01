"use client";

import React, { useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CalendarPlus, ArrowLeft } from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { planStorage } from "@/lib/storage/planStorage";
import { PlanDashboardView } from "@/features/planner/PlanDashboardView";

const emptySubscribe = () => () => {};

export function PlanClientLoader() {
  const params = useParams();
  const id = params?.id as string;

  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const plan = useSyncExternalStore(
    (cb) => planStorage.subscribe(cb),
    () => (id ? planStorage.getById(id) : null),
    () => null
  );

  if (!isClient) {
    return <LoadingState message="Loading celebration plan details..." />;
  }

  if (!plan) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)] rounded-[var(--radius-sm)]"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        <EmptyState
          icon={CalendarPlus}
          title="Celebration Plan Not Found"
          description="We couldn't locate this plan in your local browser storage. Saved plans are stored privately in this browser and are not synchronized across devices."
          action={
            <Link href="/events/new">
              <Button variant="primary">Create a New Celebration</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return <PlanDashboardView initialPlan={plan} />;
}
