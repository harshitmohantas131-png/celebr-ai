"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Printer,
  Download,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  Users,
  Coins,
  Calendar,
  ChevronDown,
  ChevronUp,
  Tag,
  RefreshCw,
  Send,
  Info,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatBudgetAmount } from "@/lib/utils";
import { planStorage } from "@/lib/storage/planStorage";
import type {
  ChecklistPriority,
  ChecklistStatus,
  ChecklistTask,
  EventPlan,
  PlanSection,
} from "@/types/event";

interface PlanDashboardViewProps {
  initialPlan: EventPlan;
}

export function PlanDashboardView({ initialPlan }: PlanDashboardViewProps) {
  const [plan, setPlan] = useState<EventPlan>(initialPlan);
  const [checklist, setChecklist] = useState<ChecklistTask[]>(initialPlan.checklist);
  const [checklistFilter, setChecklistFilter] = useState<ChecklistStatus | "all">("all");
  const [checklistPriorityFilter, setChecklistPriorityFilter] = useState<
    ChecklistPriority | "all"
  >("all");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    [initialPlan.budget.categories[0]?.id || ""]: true,
  });

  // Refinement state
  const [refinementOpen, setRefinementOpen] = useState(false);
  const [refinementInstructions, setRefinementInstructions] = useState("");
  const [targetSection, setTargetSection] = useState<PlanSection | "">("");
  const [isRefining, setIsRefining] = useState(false);
  const [refinementError, setRefinementError] = useState<string | null>(null);
  const [refinementSuccess, setRefinementSuccess] = useState<string | null>(null);

  // Checkbox toggle handler
  const toggleTaskStatus = (taskId: string) => {
    const updatedTasks = checklist.map((t) => {
      if (t.id === taskId) {
        const nextStatus: ChecklistStatus =
          t.status === "completed" ? "pending" : "completed";
        return { ...t, status: nextStatus };
      }
      return t;
    });

    setChecklist(updatedTasks);
    const updatedPlan: EventPlan = {
      ...plan,
      checklist: updatedTasks,
    };
    setPlan(updatedPlan);
    planStorage.save(updatedPlan);
  };

  // Milestone toggle handler
  const toggleMilestone = (milestoneId: string) => {
    const updatedMilestones = plan.milestones.map((m) =>
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );
    const updatedPlan: EventPlan = {
      ...plan,
      milestones: updatedMilestones,
    };
    setPlan(updatedPlan);
    planStorage.save(updatedPlan);
  };

  // Category accordion toggle
  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Export Plan Handler
  const handleExportMarkdown = () => {
    const mdContent = generatePlanMarkdown(plan);
    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${plan.eventDetails.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_CelebrAI_Plan.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Refinement Submission
  const handleRefineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refinementInstructions.trim() || isRefining) return;

    setIsRefining(true);
    setRefinementError(null);
    setRefinementSuccess(null);

    try {
      const response = await fetch("/api/plan/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          instructions: refinementInstructions.trim(),
          targetSection: targetSection || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result?.error?.message || "Failed to refine plan. Your previous plan has been preserved."
        );
      }

      const refinedPlan: EventPlan = result.data;
      setPlan(refinedPlan);
      setChecklist(refinedPlan.checklist);
      planStorage.save(refinedPlan);

      setRefinementSuccess("Celebration plan successfully updated with your refinements!");
      setRefinementInstructions("");
      setRefinementOpen(false);
    } catch (err: unknown) {
      setRefinementError(
        err instanceof Error ? err.message : "An unexpected error occurred during refinement."
      );
    } finally {
      setIsRefining(false);
    }
  };

  const { eventDetails, overview, budget, milestones, schedule } = plan;
  const calc = budget.calculation;
  const currency = eventDetails.currency;

  // Checklist counts & filtering
  const totalTasks = checklist.length;
  const completedTasks = checklist.filter((t) => t.status === "completed").length;
  const checklistProgressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const filteredTasks = checklist.filter((task) => {
    if (checklistFilter !== "all" && task.status !== checklistFilter) return false;
    if (checklistPriorityFilter !== "all" && task.priority !== checklistPriorityFilter) {
      return false;
    }
    return true;
  });

  // Budget utilization percentage
  const budgetUtilization =
    calc.totalBudget > 0
      ? Math.min(Math.round((calc.totalEstimatedCost / calc.totalBudget) * 100), 100)
      : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* ─── Top Navigation & Action Toolbar (Hidden on Print) ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)] rounded-[var(--radius-sm)]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={Printer}
            onClick={handlePrint}
            aria-label="Print celebration plan"
          >
            Print
          </Button>

          <Button
            size="sm"
            variant="outline"
            icon={Download}
            onClick={handleExportMarkdown}
            aria-label="Export celebration plan as Markdown file"
          >
            Export Markdown
          </Button>

          <Button
            size="sm"
            variant="primary"
            icon={Sparkles}
            onClick={() => setRefinementOpen(!refinementOpen)}
            aria-expanded={refinementOpen}
            aria-controls="refinement-panel"
          >
            {refinementOpen ? "Close Refinement" : "Refine with AI"}
          </Button>
        </div>
      </div>

      {/* ─── Refinement Success Banner ──────────────────────────── */}
      {refinementSuccess && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-3 p-4 rounded-[var(--radius-md)] bg-[color:var(--success-light)] border border-[color:var(--success)]/40 text-[color:var(--text-primary)] print:hidden"
        >
          <CheckCircle2 size={18} className="shrink-0 text-[color:var(--success)] mt-0.5" />
          <div className="text-sm">{refinementSuccess}</div>
        </div>
      )}

      {/* ─── Refinement Panel (Collapsible / Accessible) ────────── */}
      {refinementOpen && (
        <Card
          id="refinement-panel"
          className="border-[color:var(--accent-primary)]/40 bg-[color:var(--accent-primary-light)]/20 print:hidden"
        >
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[color:var(--accent-primary)]" />
              <h2 className="text-base font-semibold text-[color:var(--text-primary)]">
                Refine Celebration Plan with Gemini
              </h2>
            </div>
            <p className="text-xs text-[color:var(--text-secondary)] mt-1">
              Ask CelebrAI to adjust pricing allocations, modify activities, or adapt the theme.
              Your previous plan is preserved if refinement encounters any issue.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRefineSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="refine-instructions"
                  className="text-sm font-medium text-[color:var(--text-primary)]"
                >
                  Refinement Instructions <span className="text-[color:var(--error)]">*</span>
                </label>
                <textarea
                  id="refine-instructions"
                  rows={3}
                  value={refinementInstructions}
                  onChange={(e) => setRefinementInstructions(e.target.value)}
                  placeholder="e.g. Cut photography costs by 15% and reallocate to cocktail hour food; add a tea ceremony milestone..."
                  className="w-full p-3 text-sm bg-[color:var(--bg-card)] text-[color:var(--text-primary)] border border-[color:var(--border)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)] focus:ring-offset-1 resize-y placeholder:text-[color:var(--text-muted)] hover:border-[color:var(--border-strong)] transition-colors"
                  disabled={isRefining}
                  required
                />
              </div>

              {/* Quick suggestion pills */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[color:var(--text-secondary)]">Quick suggestions:</span>
                {[
                  "Reduce catering costs by 10%",
                  "Make timeline more relaxed",
                  "Add traditional cultural rituals",
                  "Make activities family-friendly",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setRefinementInstructions(suggestion)}
                    className="px-2.5 py-1 rounded-full border border-[color:var(--border)] hover:border-[color:var(--accent-primary)] hover:bg-[color:var(--accent-primary-light)]/40 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors text-xs"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              {/* Target Section Filter */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-[color:var(--text-secondary)]">
                  <SlidersHorizontal size={14} />
                  <span>Target Focus:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(["", "budget", "timeline", "schedule", "checklist"] as const).map(
                    (sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setTargetSection(sec)}
                        className={[
                          "px-2.5 py-1 rounded-[var(--radius-sm)] text-xs font-medium border transition-colors",
                          targetSection === sec
                            ? "border-[color:var(--accent-primary)] bg-[color:var(--accent-primary)] text-white"
                            : "border-[color:var(--border)] bg-[color:var(--bg-card)] text-[color:var(--text-secondary)] hover:border-[color:var(--border-strong)]",
                        ].join(" ")}
                      >
                        {sec === "" ? "Entire Plan" : sec.charAt(0).toUpperCase() + sec.slice(1)}
                      </button>
                    )
                  )}
                </div>
              </div>

              {refinementError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 p-3 rounded-[var(--radius-sm)] bg-[color:var(--error-light)] border border-[color:var(--error)]/30 text-[color:var(--error)] text-xs sm:text-sm"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{refinementError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRefinementOpen(false)}
                  disabled={isRefining}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  icon={isRefining ? RefreshCw : Send}
                  loading={isRefining}
                  disabled={isRefining || !refinementInstructions.trim()}
                >
                  {isRefining ? "Refining Plan..." : "Submit Refinement"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ─── Section A: Plan Header & Overview ─────────────────── */}
      <section aria-labelledby="plan-overview-heading" className="space-y-6">
        <div className="bg-[color:var(--bg-card)] border border-[color:var(--border)] rounded-[var(--radius-xl)] p-6 sm:p-8 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="rose" size="md">
                {eventDetails.eventType.charAt(0).toUpperCase() + eventDetails.eventType.slice(1)}
              </Badge>
              {plan.metadata?.version && plan.metadata.version > 1 && (
                <Badge variant="gold" size="sm">
                  Refined v{plan.metadata.version}
                </Badge>
              )}
            </div>

            <span className="text-xs text-[color:var(--text-muted)]">
              {plan.metadata?.createdAt ? `Created ${new Date(plan.metadata.createdAt).toLocaleDateString()}` : ""}
            </span>
          </div>

          <h1
            id="plan-overview-heading"
            className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[color:var(--text-primary)] mb-3"
          >
            {eventDetails.name}
          </h1>

          <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs sm:text-sm text-[color:var(--text-secondary)] mb-6 border-b border-[color:var(--border)] pb-6">
            <div className="flex items-center gap-1.5">
              <Calendar size={16} className="text-[color:var(--accent-primary)] shrink-0" />
              <span>{eventDetails.eventDate || "Date TBD"}</span>
            </div>

            {eventDetails.location && (
              <div className="flex items-center gap-1.5">
                <MapPin size={16} className="text-[color:var(--accent-primary)] shrink-0" />
                <span>{eventDetails.location}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <Users size={16} className="text-[color:var(--accent-primary)] shrink-0" />
              <span>{eventDetails.guestCount} Guests</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Coins size={16} className="text-[color:var(--accent-primary)] shrink-0" />
              <span>
                Target: {formatBudgetAmount(eventDetails.totalBudget, currency)} ({currency})
              </span>
            </div>
          </div>

          {/* AI Executive Summary */}
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--text-secondary)] mb-1">
                Executive Vision
              </h2>
              <p className="text-sm sm:text-base text-[color:var(--text-primary)] leading-relaxed">
                {overview.summary}
              </p>
            </div>

            {/* Theme Concept & Color Palette */}
            {(overview.themeConcept || (overview.colorPalette && overview.colorPalette.length > 0)) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {overview.themeConcept && (
                  <div className="p-3.5 rounded-[var(--radius-md)] bg-[color:var(--bg-subtle)] border border-[color:var(--border)]">
                    <span className="text-xs font-semibold text-[color:var(--text-secondary)] block mb-1">
                      Theme Concept
                    </span>
                    <span className="text-sm text-[color:var(--text-primary)]">
                      {overview.themeConcept}
                    </span>
                  </div>
                )}

                {overview.colorPalette && overview.colorPalette.length > 0 && (
                  <div className="p-3.5 rounded-[var(--radius-md)] bg-[color:var(--bg-subtle)] border border-[color:var(--border)]">
                    <span className="text-xs font-semibold text-[color:var(--text-secondary)] block mb-1.5">
                      Curated Color Palette
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {overview.colorPalette.map((color) => (
                        <span
                          key={color}
                          className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[color:var(--bg-card)] border border-[color:var(--border)] text-[color:var(--text-primary)]"
                        >
                          {color}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Estimates Disclaimer Banner */}
        <div className="flex items-start gap-2.5 p-3.5 rounded-[var(--radius-md)] bg-[color:var(--gold-light)]/60 border border-[color:var(--gold)]/30 text-[color:var(--text-primary)] text-xs leading-relaxed">
          <Info size={16} className="text-[color:var(--gold)] shrink-0 mt-0.5" />
          <span>
            <strong>Planning Estimates Disclaimer:</strong> All budget allocations, milestone dates,
            and checklist tasks generated by CelebrAI are algorithmic estimates designed for
            coordination. They do not constitute verified vendor bookings, contracts, or price guarantees.
          </span>
        </div>
      </section>

      {/* ─── Section B: Budget Breakdown ───────────────────────── */}
      <section aria-labelledby="budget-breakdown-heading" className="space-y-6">
        <div>
          <h2
            id="budget-breakdown-heading"
            className="text-xl sm:text-2xl font-bold text-[color:var(--text-primary)] mb-1"
          >
            Financial Model & Allocations
          </h2>
          <p className="text-xs sm:text-sm text-[color:var(--text-secondary)]">
            Algorithmic budget allocations derived from validated line items with a separate
            contingency reserve.
          </p>
        </div>

        {/* Over-Budget Alert Banner */}
        {calc.isOverBudget && (
          <div
            role="alert"
            className="flex items-start gap-3 p-4 rounded-[var(--radius-md)] bg-[color:var(--error-light)] border border-[color:var(--error)] text-[color:var(--text-primary)]"
          >
            <AlertTriangle size={20} className="text-[color:var(--error)] shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong className="font-semibold block mb-0.5 text-[color:var(--error)]">
                Budget Exceeded
              </strong>
              <span>
                Estimated costs exceed your target budget by{" "}
                <strong>{formatBudgetAmount(calc.overBudgetAmount, currency)}</strong>. You can
                use the <em>Refine with AI</em> tool to reallocate expenses or adjust category priorities.
              </span>
            </div>
          </div>
        )}

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 sm:p-5">
            <span className="text-xs font-medium text-[color:var(--text-secondary)] block mb-1">
              Target Budget
            </span>
            <div className="text-xl sm:text-2xl font-bold text-[color:var(--text-primary)]">
              {formatBudgetAmount(calc.totalBudget, currency)}
            </div>
            <span className="text-xs text-[color:var(--text-muted)] mt-1 block">
              {currency} Total
            </span>
          </Card>

          <Card className="p-4 sm:p-5">
            <span className="text-xs font-medium text-[color:var(--text-secondary)] block mb-1">
              Category Subtotal
            </span>
            <div className="text-xl sm:text-2xl font-bold text-[color:var(--text-primary)]">
              {formatBudgetAmount(calc.categorySubtotal, currency)}
            </div>
            <span className="text-xs text-[color:var(--text-muted)] mt-1 block">
              Across {budget.categories.length} categories
            </span>
          </Card>

          <Card className="p-4 sm:p-5">
            <span className="text-xs font-medium text-[color:var(--text-secondary)] block mb-1">
              Contingency Reserve
            </span>
            <div className="text-xl sm:text-2xl font-bold text-[color:var(--gold)]">
              {formatBudgetAmount(calc.contingencyAmount, currency)}
            </div>
            <span className="text-xs text-[color:var(--text-muted)] mt-1 block">
              {(calc.contingencyRate * 100).toFixed(0)}% safety reserve
            </span>
          </Card>

          <Card
            className={[
              "p-4 sm:p-5 border",
              calc.isOverBudget
                ? "border-[color:var(--error)]/60 bg-[color:var(--error-light)]/20"
                : "border-[color:var(--success)]/60 bg-[color:var(--success-light)]/20",
            ].join(" ")}
          >
            <span className="text-xs font-medium text-[color:var(--text-secondary)] block mb-1">
              {calc.isOverBudget ? "Over Budget Amount" : "Remaining Cushion"}
            </span>
            <div
              className={[
                "text-xl sm:text-2xl font-bold",
                calc.isOverBudget
                  ? "text-[color:var(--error)]"
                  : "text-[color:var(--success)]",
              ].join(" ")}
            >
              {calc.isOverBudget
                ? `+${formatBudgetAmount(calc.overBudgetAmount, currency)}`
                : formatBudgetAmount(calc.remainingBudget, currency)}
            </div>
            <span className="text-xs text-[color:var(--text-muted)] mt-1 block">
              Total Est: {formatBudgetAmount(calc.totalEstimatedCost, currency)}
            </span>
          </Card>
        </div>

        {/* Budget Utilization Bar */}
        <div className="bg-[color:var(--bg-card)] p-4 sm:p-5 rounded-[var(--radius-lg)] border border-[color:var(--border)]">
          <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-[color:var(--text-primary)] mb-2">
            <span>Budget Utilization</span>
            <span
              className={
                calc.isOverBudget ? "text-[color:var(--error)] font-bold" : "text-[color:var(--text-secondary)]"
              }
            >
              {budgetUtilization}% of target
            </span>
          </div>
          <Progress
            value={budgetUtilization}
            color={calc.isOverBudget ? "error" : budgetUtilization > 90 ? "gold" : "primary"}
            aria-label={`Budget utilization: ${budgetUtilization} percent`}
          />
        </div>

        {/* Category Breakdown & Detailed Line Items */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-[color:var(--text-primary)]">
            Category Allocations & Line Items
          </h3>

          <div className="space-y-3">
            {budget.categories.map((category) => {
              const breakdown = calc.categoryBreakdown.find((c) => c.categoryId === category.id);
              const isExpanded = expandedCategories[category.id] ?? false;

              return (
                <div
                  key={category.id}
                  className="bg-[color:var(--bg-card)] border border-[color:var(--border)] rounded-[var(--radius-md)] overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    aria-expanded={isExpanded}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-[color:var(--bg-subtle)] transition-colors focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[color:var(--accent-primary-light)] text-[color:var(--accent-primary)] flex items-center justify-center font-bold text-xs shrink-0">
                        {category.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-semibold text-sm text-[color:var(--text-primary)] block">
                          {category.name}
                        </span>
                        <span className="text-xs text-[color:var(--text-secondary)]">
                          {category.items.length} line {category.items.length === 1 ? "item" : "items"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="font-bold text-sm text-[color:var(--text-primary)] block">
                          {formatBudgetAmount(breakdown?.subtotal ?? 0, currency)}
                        </span>
                        <span className="text-xs text-[color:var(--text-muted)]">
                          {breakdown?.percentageOfTotal ?? 0}% of est.
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={18} className="text-[color:var(--text-secondary)]" />
                      ) : (
                        <ChevronDown size={18} className="text-[color:var(--text-secondary)]" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Line Items Table */}
                  {isExpanded && (
                    <div className="border-t border-[color:var(--border)] p-4 bg-[color:var(--bg-subtle)]/40">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs sm:text-sm">
                          <thead>
                            <tr className="border-b border-[color:var(--border)] text-[color:var(--text-secondary)] text-xs">
                              <th className="pb-2 font-medium">Deliverable / Service</th>
                              <th className="pb-2 font-medium">Priority</th>
                              <th className="pb-2 font-medium">Estimated Cost</th>
                              <th className="pb-2 font-medium">Planning Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[color:var(--border)]/60">
                            {category.items.map((item) => (
                              <tr key={item.id} className="text-[color:var(--text-primary)]">
                                <td className="py-2.5 font-medium pr-2">{item.name}</td>
                                <td className="py-2.5 pr-2">
                                  <Badge
                                    size="sm"
                                    variant={
                                      item.priority === "high"
                                        ? "rose"
                                        : item.priority === "medium"
                                        ? "gold"
                                        : "default"
                                    }
                                  >
                                    {item.priority}
                                  </Badge>
                                </td>
                                <td className="py-2.5 font-semibold text-[color:var(--accent-primary)] pr-2">
                                  {formatBudgetAmount(item.estimatedCost, currency)}
                                </td>
                                <td className="py-2.5 text-xs text-[color:var(--text-secondary)]">
                                  {item.notes || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Section C: Preparation Timeline ──────────────────── */}
      <section aria-labelledby="timeline-heading" className="space-y-6">
        <div>
          <h2
            id="timeline-heading"
            className="text-xl sm:text-2xl font-bold text-[color:var(--text-primary)] mb-1"
          >
            Preparation Timeline & Milestones
          </h2>
          <p className="text-xs sm:text-sm text-[color:var(--text-secondary)]">
            Chronological deliverables leading up to your celebration. Click checkmarks to track
            progress.
          </p>
        </div>

        <div className="space-y-3">
          {milestones.map((milestone) => {
            const isCompleted = milestone.completed;

            return (
              <div
                key={milestone.id}
                className={[
                  "p-4 rounded-[var(--radius-md)] border flex items-start gap-4 transition-all",
                  isCompleted
                    ? "bg-[color:var(--success-light)]/20 border-[color:var(--success)]/40 text-[color:var(--text-muted)]"
                    : "bg-[color:var(--bg-card)] border-[color:var(--border)] hover:border-[color:var(--border-strong)]",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={() => toggleMilestone(milestone.id)}
                  aria-label={`Mark milestone "${milestone.title}" as ${
                    isCompleted ? "pending" : "completed"
                  }`}
                  className="mt-0.5 text-[color:var(--accent-primary)] hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)] rounded-full"
                >
                  {isCompleted ? (
                    <CheckCircle2 size={20} className="text-[color:var(--success)]" />
                  ) : (
                    <Circle size={20} className="text-[color:var(--text-secondary)]" />
                  )}
                </button>

                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <span
                      className={[
                        "font-semibold text-sm",
                        isCompleted
                          ? "line-through text-[color:var(--text-secondary)]"
                          : "text-[color:var(--text-primary)]",
                      ].join(" ")}
                    >
                      {milestone.title}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[color:var(--accent-primary)]">
                        {milestone.targetDate}
                      </span>
                      <Badge size="sm" variant="default">
                        {milestone.daysBeforeEvent === 0
                          ? "Event Day"
                          : `${milestone.daysBeforeEvent}d before`}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-[color:var(--text-secondary)] leading-relaxed mb-2">
                    {milestone.description}
                  </p>

                  <div className="flex items-center gap-2">
                    <Tag size={12} className="text-[color:var(--text-muted)]" />
                    <span className="text-xs text-[color:var(--text-muted)]">
                      {milestone.category}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Section D: Event-Day Run-of-Show Schedule ─────────── */}
      <section aria-labelledby="schedule-heading" className="space-y-6">
        <div>
          <h2
            id="schedule-heading"
            className="text-xl sm:text-2xl font-bold text-[color:var(--text-primary)] mb-1"
          >
            Event-Day Run-of-Show
          </h2>
          <p className="text-xs sm:text-sm text-[color:var(--text-secondary)]">
            Chronological minute-by-minute schedule designed for flawless day-of coordination.
          </p>
        </div>

        <div className="relative pl-6 border-l-2 border-[color:var(--accent-primary)]/40 space-y-6">
          {schedule.map((item) => (
            <div key={item.id} className="relative group">
              {/* Dot on the timeline line */}
              <div
                className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-[color:var(--accent-primary)] border-2 border-[color:var(--bg-page)]"
                aria-hidden="true"
              />

              <div className="bg-[color:var(--bg-card)] border border-[color:var(--border)] rounded-[var(--radius-md)] p-4 hover:border-[color:var(--border-strong)] transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <Clock size={15} className="text-[color:var(--accent-primary)]" />
                    <span className="font-bold text-sm text-[color:var(--text-primary)]">
                      {item.startTime} – {item.endTime}
                    </span>
                  </div>

                  {item.location && (
                    <div className="flex items-center gap-1 text-xs text-[color:var(--text-secondary)]">
                      <MapPin size={12} />
                      <span>{item.location}</span>
                    </div>
                  )}
                </div>

                <h3 className="text-base font-semibold text-[color:var(--text-primary)] mb-1">
                  {item.title}
                </h3>

                <p className="text-xs sm:text-sm text-[color:var(--text-secondary)] leading-relaxed">
                  {item.description}
                </p>

                {item.responsibleRole && (
                  <div className="mt-2 text-xs font-medium text-[color:var(--accent-primary)]">
                    Lead: {item.responsibleRole}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Section E: Vendor & Planning Checklist ─────────────── */}
      <section aria-labelledby="checklist-heading" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2
              id="checklist-heading"
              className="text-xl sm:text-2xl font-bold text-[color:var(--text-primary)] mb-1"
            >
              Vendor & Coordination Checklist
            </h2>
            <p className="text-xs sm:text-sm text-[color:var(--text-secondary)]">
              Interactive deliverables list. Progress updates are preserved automatically.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[color:var(--text-secondary)]">
              {completedTasks} of {totalTasks} Completed ({checklistProgressPercent}%)
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <Progress
          value={checklistProgressPercent}
          color="primary"
          aria-label={`Checklist progress: ${completedTasks} of ${totalTasks} tasks completed`}
        />

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[color:var(--bg-card)] p-3 rounded-[var(--radius-md)] border border-[color:var(--border)] text-xs print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-[color:var(--text-secondary)] font-medium">Status:</span>
            {(["all", "pending", "completed"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setChecklistFilter(st)}
                className={[
                  "px-2.5 py-1 rounded-[var(--radius-sm)] font-medium capitalize transition-colors",
                  checklistFilter === st
                    ? "bg-[color:var(--accent-primary)] text-white"
                    : "text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-subtle)]",
                ].join(" ")}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[color:var(--text-secondary)] font-medium">Priority:</span>
            {(["all", "high", "medium", "low"] as const).map((pr) => (
              <button
                key={pr}
                type="button"
                onClick={() => setChecklistPriorityFilter(pr)}
                className={[
                  "px-2 py-1 rounded-[var(--radius-sm)] font-medium capitalize transition-colors",
                  checklistPriorityFilter === pr
                    ? "bg-[color:var(--accent-primary)] text-white"
                    : "text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-subtle)]",
                ].join(" ")}
              >
                {pr}
              </button>
            ))}
          </div>
        </div>

        {/* Task List */}
        {filteredTasks.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No tasks match this filter"
            description="Adjust your status or priority filter to view other deliverables."
          />
        ) : (
          <div className="space-y-2.5">
            {filteredTasks.map((task) => {
              const isCompleted = task.status === "completed";

              return (
                <div
                  key={task.id}
                  className={[
                    "p-3.5 rounded-[var(--radius-md)] border flex items-center justify-between gap-3 transition-colors",
                    isCompleted
                      ? "bg-[color:var(--success-light)]/20 border-[color:var(--success)]/30 text-[color:var(--text-muted)]"
                      : "bg-[color:var(--bg-card)] border-[color:var(--border)] hover:border-[color:var(--border-strong)]",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleTaskStatus(task.id)}
                      aria-label={`Toggle task "${task.title}" status`}
                      className="text-[color:var(--accent-primary)] hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)] rounded-full shrink-0"
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={18} className="text-[color:var(--success)]" />
                      ) : (
                        <Circle size={18} className="text-[color:var(--text-secondary)]" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <span
                        className={[
                          "text-sm font-medium block truncate",
                          isCompleted
                            ? "line-through text-[color:var(--text-secondary)]"
                            : "text-[color:var(--text-primary)]",
                        ].join(" ")}
                      >
                        {task.title}
                      </span>
                      {task.notes && (
                        <span className="text-xs text-[color:var(--text-muted)] block line-clamp-1">
                          {task.notes}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge size="sm" variant="default">
                      {task.category}
                    </Badge>
                    <Badge
                      size="sm"
                      variant={
                        task.priority === "high"
                          ? "rose"
                          : task.priority === "medium"
                          ? "gold"
                          : "default"
                      }
                    >
                      {task.priority}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Section F: Personalized Ideas & Concepts ─────────── */}
      {overview.personalizedIdeas && overview.personalizedIdeas.length > 0 && (
        <section aria-labelledby="ideas-heading" className="space-y-4">
          <div>
            <h2
              id="ideas-heading"
              className="text-xl sm:text-2xl font-bold text-[color:var(--text-primary)] mb-1"
            >
              Creative Personalization & Signature Ideas
            </h2>
            <p className="text-xs sm:text-sm text-[color:var(--text-secondary)]">
              Curated creative cues synthesized specifically for {eventDetails.name}.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {overview.personalizedIdeas.map((idea, i) => (
              <Card key={i} className="p-4 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-[color:var(--gold-light)] text-[color:var(--gold)] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-xs sm:text-sm text-[color:var(--text-primary)] leading-relaxed">
                  {idea}
                </p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Generates an accessible, clean Markdown document representing the complete celebration plan.
 */
function generatePlanMarkdown(plan: EventPlan): string {
  const { eventDetails, overview, budget, milestones, schedule, checklist } = plan;
  const calc = budget.calculation;
  const currency = eventDetails.currency;

  let md = `# CelebrAI Event Plan: ${eventDetails.name}\n\n`;
  md += `> Generated by CelebrAI on ${plan.metadata?.createdAt ? new Date(plan.metadata.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}\n\n`;

  md += `## Event Summary\n`;
  md += `- **Archetype**: ${eventDetails.eventType}\n`;
  md += `- **Date**: ${eventDetails.eventDate || "TBD"}\n`;
  md += `- **Location**: ${eventDetails.location || "Not specified"}\n`;
  md += `- **Guest Count**: ${eventDetails.guestCount}\n`;
  md += `- **Currency**: ${currency}\n`;
  md += `- **Target Budget**: ${formatBudgetAmount(calc.totalBudget, currency)}\n`;
  md += `- **Total Estimated Cost**: ${formatBudgetAmount(calc.totalEstimatedCost, currency)}\n`;
  md += `- **Contingency Reserve**: ${formatBudgetAmount(calc.contingencyAmount, currency)} (${(calc.contingencyRate * 100).toFixed(0)}%)\n`;
  md += `- **Status**: ${calc.isOverBudget ? `OVER BUDGET by ${formatBudgetAmount(calc.overBudgetAmount, currency)}` : "Within Budget"}\n\n`;

  md += `## Executive Vision\n`;
  md += `${overview.summary}\n\n`;

  if (overview.themeConcept) {
    md += `**Theme**: ${overview.themeConcept}\n\n`;
  }

  md += `## Budget Breakdown\n`;
  for (const cat of budget.categories) {
    const breakdown = calc.categoryBreakdown.find((b) => b.categoryId === cat.id);
    md += `### ${cat.name} (${formatBudgetAmount(breakdown?.subtotal || 0, currency)})\n`;
    for (const item of cat.items) {
      md += `- **${item.name}**: ${formatBudgetAmount(item.estimatedCost, currency)} [${item.priority}]${item.notes ? ` — ${item.notes}` : ""}\n`;
    }
    md += `\n`;
  }

  md += `## Preparation Milestones\n`;
  for (const m of milestones) {
    md += `- [${m.completed ? "x" : " "}] **${m.targetDate}** (${m.daysBeforeEvent}d before): ${m.title} — ${m.description}\n`;
  }
  md += `\n`;

  md += `## Event-Day Run-of-Show\n`;
  for (const s of schedule) {
    md += `- **${s.startTime} – ${s.endTime}**: ${s.title}${s.location ? ` (${s.location})` : ""} — ${s.description}\n`;
  }
  md += `\n`;

  md += `## Coordination Checklist\n`;
  for (const c of checklist) {
    md += `- [${c.status === "completed" ? "x" : " "}] **[${c.category}]** ${c.title} (${c.priority} priority)\n`;
  }
  md += `\n`;

  md += `---\n`;
  md += `*Disclaimer: All pricing figures and milestones are AI-synthesized estimates for coordination purposes only, not binding quotations.*\n`;

  return md;
}
