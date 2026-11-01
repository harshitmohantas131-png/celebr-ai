"use client";

import React, { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import Link from "next/link";
import {
  CircleDollarSign,
  Plus,
  Sparkles,
  AlertTriangle,
  Filter,
  Calendar,
  Users,
  Edit2,
  Trash2,
  ArrowUpDown,
  CheckCircle,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Progress } from "@/components/ui/Progress";
import { planStorage } from "@/lib/storage/planStorage";
import { formatBudgetAmount } from "@/lib/utils";
import { formatIsoDate } from "@/lib/utils/date";
import type {
  BudgetCategory,
  BudgetLineItem,
  Currency,
  EventPlan,
} from "@/types/event";
import {
  calculateBudget,
  calculateSmartBudgetMetrics,
  STANDARD_BUDGET_CATEGORIES,
} from "./calculator";
import { ExpenseModal } from "./ExpenseModal";
import { DeleteExpenseDialog } from "./DeleteExpenseDialog";
import { ContingencyModal } from "./ContingencyModal";

const EMPTY_PLANS: EventPlan[] = [];

export function BudgetCalculatorView() {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const savedPlans = useSyncExternalStore(
    planStorage.subscribe,
    () => planStorage.getAll(),
    () => EMPTY_PLANS
  );

  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<
    "cost-desc" | "cost-asc" | "actual-desc" | "name-asc" | "category" | "payment"
  >("cost-desc");

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<BudgetLineItem | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<BudgetLineItem | null>(null);

  const [isContingencyModalOpen, setIsContingencyModalOpen] = useState(false);

  // Notification state
  const [notification, setNotification] = useState<string | null>(null);

  // Derive active plan safely
  const activePlanId =
    selectedPlanId && savedPlans.some((p) => p.id === selectedPlanId)
      ? selectedPlanId
      : savedPlans[0]?.id || "";

  const currentPlan = useMemo(
    () => savedPlans.find((p) => p.id === activePlanId) || null,
    [savedPlans, activePlanId]
  );

  // Clear notification after 4 seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  const currency: Currency = currentPlan?.eventDetails?.currency || "USD";
  const totalBudget = currentPlan?.eventDetails?.totalBudget || 0;
  const categories = useMemo(() => currentPlan?.budget?.categories || [], [currentPlan]);
  const contingencyRate = currentPlan?.budget?.contingencyRate ?? 0.1;

  // Flatten all line items for the expense table/list
  const allExpenses = useMemo(() => {
    const list: (BudgetLineItem & { categoryName: string })[] = [];
    for (const cat of categories) {
      for (const item of cat.items) {
        list.push({
          ...item,
          categoryName: cat.name,
        });
      }
    }
    return list;
  }, [categories]);

  // Categories list for select dropdowns
  const existingCategories = useMemo(
    () => categories.map((c) => ({ id: c.id, name: c.name })),
    [categories]
  );

  // Authoritative smart budget metrics
  const metrics = useMemo(() => {
    if (!currentPlan) return null;
    return calculateSmartBudgetMetrics(totalBudget, currency, categories, contingencyRate);
  }, [currentPlan, totalBudget, currency, categories, contingencyRate]);

  // Filter and sort expenses
  const filteredExpenses = useMemo(() => {
    let list = [...allExpenses];

    // Status Filter
    if (statusFilter !== "all") {
      list = list.filter((item) => {
        if (statusFilter === "over_estimate") {
          return item.actualCost !== undefined && item.actualCost > item.estimatedCost;
        }
        if (statusFilter === "unrecorded") {
          return item.actualCost === undefined || item.actualCost === null;
        }
        return (item.paymentStatus || "unpaid") === statusFilter;
      });
    }

    // Category Filter
    if (categoryFilter !== "all") {
      list = list.filter((item) => item.categoryId === categoryFilter);
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === "cost-desc") return b.estimatedCost - a.estimatedCost;
      if (sortBy === "cost-asc") return a.estimatedCost - b.estimatedCost;
      if (sortBy === "actual-desc") {
        const actA = a.actualCost ?? -1;
        const actB = b.actualCost ?? -1;
        return actB - actA;
      }
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "category") return a.categoryName.localeCompare(b.categoryName);
      if (sortBy === "payment") {
        const order: Record<string, number> = { unpaid: 1, partially_paid: 2, paid: 3 };
        return (order[a.paymentStatus || "unpaid"] || 0) - (order[b.paymentStatus || "unpaid"] || 0);
      }
      return 0;
    });

    return list;
  }, [allExpenses, statusFilter, categoryFilter, sortBy]);

  // Helper to persist updated categories & recalculated totals
  const persistBudgetUpdate = (
    updatedCategories: BudgetCategory[],
    newContingencyRate?: number,
    successMsg?: string
  ) => {
    if (!currentPlan) return;

    const rate = newContingencyRate ?? currentPlan.budget.contingencyRate;

    // Authoritative calculation via budget engine
    const calculation = calculateBudget({
      totalBudget: currentPlan.eventDetails.totalBudget,
      currency: currentPlan.eventDetails.currency,
      categories: updatedCategories,
      contingencyRate: rate,
    });

    const updatedPlan: EventPlan = {
      ...currentPlan,
      budget: {
        categories: updatedCategories,
        contingencyRate: rate,
        calculation,
      },
    };

    planStorage.save(updatedPlan);
    if (successMsg) {
      setNotification(successMsg);
    }
  };

  // Add or Edit Expense
  const handleSaveExpense = (savedExpense: BudgetLineItem) => {
    const targetCatId = savedExpense.categoryId;
    let categoryExists = false;

    // Check if category exists or needs to be resolved from standard
    const stdCat = STANDARD_BUDGET_CATEGORIES.find((c) => c.id === targetCatId);
    const catName = stdCat?.name || "General Expenses";

    const updatedCategories: BudgetCategory[] = categories.map((cat) => {
      // Remove item if it was previously in this category and moved
      const cleanItems = cat.items.filter((item) => item.id !== savedExpense.id);

      if (cat.id === targetCatId) {
        categoryExists = true;
        return {
          ...cat,
          items: [...cleanItems, savedExpense],
        };
      }
      return {
        ...cat,
        items: cleanItems,
      };
    });

    if (!categoryExists) {
      updatedCategories.push({
        id: targetCatId,
        name: catName,
        items: [savedExpense],
      });
    }

    persistBudgetUpdate(
      updatedCategories,
      undefined,
      editingExpense
        ? `Expense "${savedExpense.name}" updated successfully.`
        : `Expense "${savedExpense.name}" added to budget.`
    );
    setEditingExpense(null);
  };

  // Delete Expense
  const handleDeleteExpenseConfirm = () => {
    if (!deletingExpense) return;

    const updatedCategories: BudgetCategory[] = categories.map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => item.id !== deletingExpense.id),
    }));

    persistBudgetUpdate(
      updatedCategories,
      undefined,
      `Expense "${deletingExpense.name}" deleted from budget.`
    );
    setDeletingExpense(null);
    setIsDeleteModalOpen(false);
  };

  // Adjust Contingency Rate
  const handleSaveContingencyRate = (newRate: number) => {
    persistBudgetUpdate(
      categories,
      newRate,
      `Contingency reserve adjusted to ${(newRate * 100).toFixed(0)}%.`
    );
  };

  // Quick Plan Creation
  const handleCreateQuickPlan = () => {
    const defaultDate = formatIsoDate(new Date(Date.now() + 120 * 24 * 60 * 60 * 1000));
    const newPlanId = `plan-budget-${Date.now().toString(36)}`;

    const starterCategories: BudgetCategory[] = [
      {
        id: "cat-venue",
        name: "Venue & Rentals",
        allocatedAmount: 12000,
        items: [
          {
            id: `exp-${Date.now().toString(36)}-1`,
            name: "Main Reception Hall Rental",
            categoryId: "cat-venue",
            estimatedCost: 8000,
            actualCost: 8200,
            priority: "high",
            paymentStatus: "paid",
            notes: "Includes chairs and security deposit",
            currency: "USD",
          },
          {
            id: `exp-${Date.now().toString(36)}-2`,
            name: "Ambient Bistro Lighting & Tables",
            categoryId: "cat-venue",
            estimatedCost: 2500,
            priority: "medium",
            paymentStatus: "unpaid",
            currency: "USD",
          },
        ],
      },
      {
        id: "cat-catering",
        name: "Catering & Bar",
        allocatedAmount: 10000,
        items: [
          {
            id: `exp-${Date.now().toString(36)}-3`,
            name: "Plated Dinner Service (75 guests)",
            categoryId: "cat-catering",
            estimatedCost: 7500,
            priority: "high",
            paymentStatus: "partially_paid",
            vendorName: "Artisanal Catering Co.",
            currency: "USD",
          },
        ],
      },
      {
        id: "cat-photography",
        name: "Photography & Videography",
        allocatedAmount: 4000,
        items: [
          {
            id: `exp-${Date.now().toString(36)}-4`,
            name: "8-Hour Lead Photographer Package",
            categoryId: "cat-photography",
            estimatedCost: 3500,
            priority: "high",
            paymentStatus: "unpaid",
            currency: "USD",
          },
        ],
      },
    ];

    const calculation = calculateBudget({
      totalBudget: 35000,
      currency: "USD",
      categories: starterCategories,
      contingencyRate: 0.1,
    });

    const newPlan: EventPlan = {
      id: newPlanId,
      eventDetails: {
        name: "My Upcoming Celebration",
        eventType: "wedding",
        eventDate: defaultDate,
        location: "Grand Ballroom",
        guestCount: 75,
        totalBudget: 35000,
        currency: "USD",
        theme: "Modern Chic",
        culturalPreferences: [],
        dietaryRequirements: [],
        planningPriorities: ["Venue", "Catering"],
        additionalInstructions: "",
      },
      overview: {
        summary: "Celebration budget model initialized for financial tracking and expense management.",
        personalizedIdeas: ["Budget tracking with actual cost recording"],
      },
      budget: {
        categories: starterCategories,
        contingencyRate: 0.1,
        calculation,
      },
      milestones: [],
      schedule: [],
      checklist: [],
      metadata: {
        createdAt: new Date().toISOString(),
        version: 1,
        currency: "USD",
        eventType: "wedding",
      },
    };

    planStorage.save(newPlan);
    setSelectedPlanId(newPlanId);
    setNotification("New celebration budget created with starter categories and sample expenses!");
  };

  if (!isClient) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4 text-center">
        <div className="inline-block p-4 rounded-full bg-[color:var(--accent-primary-light)] text-[color:var(--accent-primary)] mb-4 animate-pulse">
          <CircleDollarSign size={32} />
        </div>
        <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">
          Loading Budget Calculator...
        </h1>
      </div>
    );
  }

  // Zero-state if no saved plans exist
  if (savedPlans.length === 0) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 pb-16">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[color:var(--text-primary)] mb-2">
            Smart Budget Calculator
          </h1>
          <p className="text-sm text-[color:var(--text-secondary)]">
            Track planned allocations, recorded actual vendor quotes, payment statuses, and safety contingency reserves.
          </p>
        </div>

        <EmptyState
          icon={CircleDollarSign}
          title="No Budget Plans Found"
          description="Create your celebration with the AI Event Architect to auto-generate a comprehensive budget model, or initialize a budget directly."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/events/new">
                <Button variant="primary" icon={Sparkles}>
                  Plan a Celebration with AI
                </Button>
              </Link>
              <Button variant="outline" icon={Plus} onClick={handleCreateQuickPlan}>
                Start Quick Budget
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* ─── Notification Banner ─────────────────────────────────── */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 p-4 rounded-[var(--radius-md)] bg-[color:var(--success-light)] border border-[color:var(--success)]/40 text-[color:var(--text-primary)] animate-in fade-in"
        >
          <CheckCircle size={18} className="text-[color:var(--success)] shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium">{notification}</span>
        </div>
      )}

      {/* ─── Page Header & Event Switcher ───────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[color:var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[color:var(--text-primary)]">
              Smart Budget Calculator
            </h1>
            <Badge variant="primary" size="sm">
              Minor-Unit Engine
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-[color:var(--text-secondary)]">
            Deterministic financial modeling with real-time actual expense reconciliation and payment tracking.
          </p>
        </div>

        {/* Event Selector Dropdown */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <label
            htmlFor="budget-event-select"
            className="text-xs font-semibold uppercase tracking-wider text-[color:var(--text-secondary)] whitespace-nowrap"
          >
            Active Event:
          </label>
          <select
            id="budget-event-select"
            value={activePlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            className="h-10 px-3 text-sm font-medium bg-[color:var(--bg-card)] text-[color:var(--text-primary)] border border-[color:var(--border)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)] transition-colors"
          >
            {savedPlans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.eventDetails.name} ({p.eventDetails.currency})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── Active Event Meta Strip ────────────────────────────── */}
      {currentPlan && (
        <Card className="p-4 sm:p-5 bg-[color:var(--bg-card)] border border-[color:var(--border)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg text-[color:var(--text-primary)]">
                  {currentPlan.eventDetails.name}
                </span>
                <Badge
                  size="sm"
                  variant={
                    currentPlan.eventDetails.eventType === "wedding"
                      ? "rose"
                      : currentPlan.eventDetails.eventType === "birthday"
                      ? "gold"
                      : "default"
                  }
                >
                  {currentPlan.eventDetails.eventType}
                </Badge>
                <Badge size="sm" variant="outline">
                  {currentPlan.eventDetails.currency}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-[color:var(--text-secondary)]">
                <span className="inline-flex items-center gap-1">
                  <Calendar size={14} className="text-[color:var(--accent-primary)]" aria-hidden="true" />
                  <span>Date: <strong>{currentPlan.eventDetails.eventDate || "TBD"}</strong></span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users size={14} className="text-[color:var(--accent-primary)]" aria-hidden="true" />
                  <span>{currentPlan.eventDetails.guestCount} Guests</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Receipt size={14} className="text-[color:var(--accent-primary)]" aria-hidden="true" />
                  <span>{allExpenses.length} Expense Items</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href={`/plans/${currentPlan.id}`}>
                <Button variant="outline" size="sm">
                  View Full Plan Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* ─── Warning Banners (Over-Budget & Item Overruns) ───────── */}
      {metrics && metrics.warnings.length > 0 && (
        <div className="space-y-3">
          {metrics.warnings.map((warn, i) => (
            <div
              key={i}
              role="alert"
              className="flex items-start gap-3 p-4 rounded-[var(--radius-md)] bg-[color:var(--error-light)] border border-[color:var(--error)] text-[color:var(--text-primary)]"
            >
              <AlertTriangle size={20} className="text-[color:var(--error)] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-sm">
                <strong className="block font-semibold text-[color:var(--error)]">
                  Financial Over-Budget Warning
                </strong>
                <span>{warn}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Summary KPI Metrics Grid ───────────────────────────── */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* 1. Total Target Budget */}
          <Card className="p-3 sm:p-3.5 flex flex-col justify-between min-h-[96px]">
            <span
              className="text-[11px] sm:text-xs font-medium text-[color:var(--text-secondary)] block mb-1 truncate"
              title="Total Budget"
            >
              Total Budget
            </span>
            <div
              className="text-base sm:text-lg xl:text-xl font-bold tracking-tight text-[color:var(--text-primary)] tabular-nums truncate"
              title={formatBudgetAmount(metrics.totalBudget, currency)}
            >
              {formatBudgetAmount(metrics.totalBudget, currency)}
            </div>
            <span
              className="text-[11px] text-[color:var(--text-muted)] mt-1 block truncate"
              title="Declared spending ceiling"
            >
              Declared spending ceiling
            </span>
          </Card>

          {/* 2. Total Estimated Cost */}
          <Card className="p-3 sm:p-3.5 flex flex-col justify-between min-h-[96px]">
            <span
              className="text-[11px] sm:text-xs font-medium text-[color:var(--text-secondary)] block mb-1 truncate"
              title="Estimated Subtotal"
            >
              Estimated Subtotal
            </span>
            <div
              className={[
                "text-base sm:text-lg xl:text-xl font-bold tracking-tight tabular-nums truncate",
                metrics.isEstimatedOverBudget
                  ? "text-[color:var(--error)]"
                  : "text-[color:var(--text-primary)]",
              ].join(" ")}
              title={formatBudgetAmount(metrics.totalEstimatedCost, currency)}
            >
              {formatBudgetAmount(metrics.totalEstimatedCost, currency)}
            </div>
            <span
              className="text-[11px] text-[color:var(--text-muted)] mt-1 block truncate"
              title={
                metrics.isEstimatedOverBudget
                  ? `Exceeds target by ${formatBudgetAmount(metrics.estimatedOverBudgetAmount, currency)}`
                  : `${formatBudgetAmount(metrics.estimatedRemaining, currency)} remaining cushion`
              }
            >
              {metrics.isEstimatedOverBudget
                ? `Exceeds target by ${formatBudgetAmount(metrics.estimatedOverBudgetAmount, currency)}`
                : `${formatBudgetAmount(metrics.estimatedRemaining, currency)} remaining`}
            </span>
          </Card>

          {/* 3. Actual Spent to Date */}
          <Card className="p-3 sm:p-3.5 flex flex-col justify-between min-h-[96px]">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span
                className="text-[11px] sm:text-xs font-medium text-[color:var(--text-secondary)] truncate"
                title="Actual Spent"
              >
                Actual Spent
              </span>
              <Badge
                size="sm"
                variant={metrics.missingActualsCount > 0 ? "gold" : "success"}
                className="text-[10px] px-1.5 py-0 shrink-0 font-medium"
              >
                {metrics.recordedActualsCount}/{allExpenses.length}
              </Badge>
            </div>
            <div
              className={[
                "text-base sm:text-lg xl:text-xl font-bold tracking-tight tabular-nums truncate",
                metrics.isActualOverBudget
                  ? "text-[color:var(--error)]"
                  : metrics.totalActualSpent > 0
                  ? "text-[color:var(--success)]"
                  : "text-[color:var(--text-primary)]",
              ].join(" ")}
              title={formatBudgetAmount(metrics.totalActualSpent, currency)}
            >
              {formatBudgetAmount(metrics.totalActualSpent, currency)}
            </div>
            <span
              className="text-[11px] text-[color:var(--text-muted)] mt-1 block truncate"
              title={
                metrics.missingActualsCount > 0
                  ? `${metrics.missingActualsCount} item(s) pending quotes`
                  : "All actuals recorded"
              }
            >
              {metrics.missingActualsCount > 0
                ? `${metrics.missingActualsCount} quote(s) pending`
                : "All actuals recorded"}
            </span>
          </Card>

          {/* 4. Remaining Cushion */}
          <Card className="p-3 sm:p-3.5 flex flex-col justify-between min-h-[96px]">
            <span
              className="text-[11px] sm:text-xs font-medium text-[color:var(--text-secondary)] block mb-1 truncate"
              title="Remaining Cushion"
            >
              Remaining Cushion
            </span>
            <div
              className={[
                "text-base sm:text-lg xl:text-xl font-bold tracking-tight tabular-nums truncate",
                metrics.isActualOverBudget
                  ? "text-[color:var(--error)]"
                  : "text-[color:var(--accent-primary)]",
              ].join(" ")}
              title={formatBudgetAmount(metrics.actualRemaining, currency)}
            >
              {formatBudgetAmount(metrics.actualRemaining, currency)}
            </div>
            <span
              className="text-[11px] text-[color:var(--text-muted)] mt-1 block truncate"
              title="Unspent actual cushion"
            >
              Unspent actual cushion
            </span>
          </Card>

          {/* 5. Contingency Safety Reserve */}
          <Card className="p-3 sm:p-3.5 flex flex-col justify-between min-h-[96px] col-span-2 md:col-span-1">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span
                className="text-[11px] sm:text-xs font-medium text-[color:var(--text-secondary)] truncate"
                title="Contingency Reserve"
              >
                Contingency Reserve
              </span>
              <button
                type="button"
                onClick={() => setIsContingencyModalOpen(true)}
                aria-label="Adjust Reserve"
                className="text-xs text-[color:var(--accent-primary)] hover:underline font-semibold focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)] rounded-xs shrink-0 whitespace-nowrap"
              >
                Adjust
              </button>
            </div>
            <div
              className="text-base sm:text-lg xl:text-xl font-bold tracking-tight text-[color:var(--gold)] tabular-nums truncate"
              title={formatBudgetAmount(metrics.contingencyAmount, currency)}
            >
              {formatBudgetAmount(metrics.contingencyAmount, currency)}
            </div>
            <span
              className="text-[11px] text-[color:var(--text-muted)] mt-1 block truncate"
              title={`${(metrics.contingencyRate * 100).toFixed(0)}% safety cushion on subtotal`}
            >
              {(metrics.contingencyRate * 100).toFixed(0)}% safety cushion on subtotal
            </span>
          </Card>
        </div>
      )}

      {/* ─── Health & Payment Distribution Bar ──────────────────── */}
      {metrics && (
        <Card className="p-5 space-y-4 bg-[color:var(--bg-card)] border border-[color:var(--border)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[color:var(--text-primary)]">
                Budget Health & Allocation Overview
              </h2>
              <p className="text-xs text-[color:var(--text-secondary)]">
                Committed expenses vs. declared spending limit.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--accent-primary)]" />
                <span>Estimated: <strong>{metrics.estimatedUtilization}%</strong></span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--success)]" />
                <span>Actual Spent: <strong>{metrics.actualUtilization}%</strong></span>
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <Progress
              value={Math.min(100, metrics.estimatedUtilization)}
              aria-label="Budget utilization progress"
            />
          </div>

          {/* Payment Status Summary Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[color:var(--border)]/60 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-[var(--radius-sm)] bg-[color:var(--success-light)]/40 border border-[color:var(--success)]/30">
              <span className="text-[color:var(--success)] font-medium">Fully Paid:</span>
              <strong className="text-[color:var(--text-primary)]">
                {formatBudgetAmount(metrics.paidTotal, currency)} ({metrics.paidCount})
              </strong>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-[var(--radius-sm)] bg-[color:var(--gold-light)]/40 border border-[color:var(--gold)]/30">
              <span className="text-[color:var(--gold)] font-medium">Partially Paid:</span>
              <strong className="text-[color:var(--text-primary)]">
                {formatBudgetAmount(metrics.partiallyPaidTotal, currency)} ({metrics.partiallyPaidCount})
              </strong>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-[var(--radius-sm)] bg-[color:var(--bg-subtle)] border border-[color:var(--border)]">
              <span className="text-[color:var(--text-secondary)] font-medium">Unpaid / Pending:</span>
              <strong className="text-[color:var(--text-primary)]">
                {formatBudgetAmount(metrics.unpaidTotal, currency)} ({metrics.unpaidCount})
              </strong>
            </div>
          </div>
        </Card>
      )}

      {/* ─── Expense Breakdown by Category ──────────────────────── */}
      {metrics && metrics.categories.length > 0 && (
        <section aria-labelledby="category-breakdown-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2
              id="category-breakdown-heading"
              className="text-lg sm:text-xl font-bold text-[color:var(--text-primary)]"
            >
              Category Allocation Breakdown
            </h2>
            <span className="text-xs text-[color:var(--text-secondary)]">
              {metrics.categories.length} active categories
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.categories.map((cat) => (
              <Card
                key={cat.id}
                className={[
                  "p-4 border transition-all",
                  cat.isActualOverEstimated
                    ? "border-[color:var(--error)]/50 bg-[color:var(--error-light)]/10"
                    : "border-[color:var(--border)] bg-[color:var(--bg-card)]",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-sm text-[color:var(--text-primary)]">
                    {cat.name}
                  </h3>
                  <Badge size="sm" variant={cat.isActualOverEstimated ? "error" : "default"}>
                    {cat.percentageOfBudget}% of budget
                  </Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-[color:var(--text-secondary)]">
                    <span>Estimated Cost:</span>
                    <strong className="text-[color:var(--text-primary)]">
                      {formatBudgetAmount(cat.estimatedSubtotal, currency)}
                    </strong>
                  </div>

                  <div className="flex justify-between text-[color:var(--text-secondary)]">
                    <span>Actual Spent:</span>
                    <strong
                      className={
                        cat.isActualOverEstimated
                          ? "text-[color:var(--error)] font-bold"
                          : "text-[color:var(--success)]"
                      }
                    >
                      {formatBudgetAmount(cat.actualSubtotal, currency)}
                    </strong>
                  </div>

                  {cat.isActualOverEstimated && (
                    <div className="text-[11px] font-semibold text-[color:var(--error)] pt-1">
                      Over estimate by {formatBudgetAmount(cat.actualOverrunAmount, currency)}
                    </div>
                  )}

                  <div className="pt-1 text-[11px] text-[color:var(--text-muted)] flex justify-between">
                    <span>{cat.itemsCount} expense item(s)</span>
                    <span>{cat.recordedActualsCount} quotes recorded</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ─── Detailed Expenses Table / List ─────────────────────── */}
      <section aria-labelledby="expenses-table-heading" className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2
              id="expenses-table-heading"
              className="text-lg sm:text-xl font-bold text-[color:var(--text-primary)]"
            >
              Expense Line Items & Invoices
            </h2>
            <p className="text-xs text-[color:var(--text-secondary)]">
              Track vendor quotes, recorded actual invoices, and payment disbursements.
            </p>
          </div>

          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              setEditingExpense(null);
              setIsExpenseModalOpen(true);
            }}
          >
            Add Expense
          </Button>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[color:var(--bg-card)] rounded-[var(--radius-md)] border border-[color:var(--border)] text-xs">
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter expenses by status">
            {[
              { id: "all", label: "All Items", count: allExpenses.length },
              { id: "unpaid", label: "Unpaid", count: allExpenses.filter((e) => (e.paymentStatus || "unpaid") === "unpaid").length },
              { id: "partially_paid", label: "Partially Paid", count: allExpenses.filter((e) => e.paymentStatus === "partially_paid").length },
              { id: "paid", label: "Fully Paid", count: allExpenses.filter((e) => e.paymentStatus === "paid").length },
              { id: "over_estimate", label: "Over Estimate", count: allExpenses.filter((e) => e.actualCost !== undefined && e.actualCost > e.estimatedCost).length },
            ].map((pill) => {
              const isSelected = statusFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setStatusFilter(pill.id)}
                  className={[
                    "px-2.5 py-1 text-xs font-medium rounded-full transition-colors flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)]",
                    isSelected
                      ? pill.id === "over_estimate"
                        ? "bg-[color:var(--error)] text-white"
                        : "bg-[color:var(--accent-primary)] text-white"
                      : "bg-[color:var(--bg-subtle)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-muted)]",
                  ].join(" ")}
                >
                  <span>{pill.label}</span>
                  <span
                    className={[
                      "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-[color:var(--border)] text-[color:var(--text-secondary)]",
                    ].join(" ")}
                  >
                    {pill.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Category & Sorting Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-[color:var(--text-secondary)]">
              <Filter size={14} aria-hidden="true" />
              <span>Category:</span>
              <select
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-8 px-2 text-xs bg-[color:var(--bg-card)] text-[color:var(--text-primary)] border border-[color:var(--border)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-1 focus:ring-[color:var(--border-focus)]"
              >
                <option value="all">All Categories</option>
                {existingCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-[color:var(--text-secondary)]">
              <ArrowUpDown size={14} aria-hidden="true" />
              <span>Sort:</span>
              <select
                aria-label="Sort expenses by"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as
                      | "cost-desc"
                      | "cost-asc"
                      | "actual-desc"
                      | "name-asc"
                      | "category"
                      | "payment"
                  )
                }
                className="h-8 px-2 text-xs bg-[color:var(--bg-card)] text-[color:var(--text-primary)] border border-[color:var(--border)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-1 focus:ring-[color:var(--border-focus)]"
              >
                <option value="cost-desc">Estimated: High to Low</option>
                <option value="cost-asc">Estimated: Low to High</option>
                <option value="actual-desc">Actual: High to Low</option>
                <option value="name-asc">Name: A to Z</option>
                <option value="category">Category</option>
                <option value="payment">Payment Status</option>
              </select>
            </div>
          </div>
        </div>

        {/* Expenses List */}
        {filteredExpenses.length === 0 ? (
          <div className="p-8 text-center bg-[color:var(--bg-card)] rounded-[var(--radius-lg)] border border-[color:var(--border)]">
            <Receipt size={32} className="mx-auto text-[color:var(--text-muted)] mb-2" aria-hidden="true" />
            <p className="text-sm font-medium text-[color:var(--text-secondary)] mb-3">
              No expenses match your selected filter criteria.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setStatusFilter("all");
                setCategoryFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExpenses.map((expense) => {
              const hasActual = expense.actualCost !== undefined && expense.actualCost !== null;
              const isOverEstimate = hasActual && expense.actualCost! > expense.estimatedCost;
              const overrunAmt = isOverEstimate ? expense.actualCost! - expense.estimatedCost : 0;

              return (
                <Card
                  key={expense.id}
                  className={[
                    "p-4 sm:p-5 transition-all border",
                    isOverEstimate
                      ? "border-[color:var(--error)]/60 bg-[color:var(--error-light)]/10"
                      : "bg-[color:var(--bg-card)] border-[color:var(--border)] hover:border-[color:var(--border-strong)]",
                  ].join(" ")}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Item Details */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-sm sm:text-base text-[color:var(--text-primary)]">
                          {expense.name}
                        </h3>

                        {/* Category Chip */}
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[color:var(--bg-subtle)] text-[color:var(--text-secondary)] font-medium">
                          {expense.categoryName}
                        </span>

                        {/* Priority Badge */}
                        <Badge
                          size="sm"
                          variant={
                            expense.priority === "high"
                              ? "rose"
                              : expense.priority === "medium"
                              ? "gold"
                              : "default"
                          }
                        >
                          {expense.priority}
                        </Badge>

                        {/* Payment Status Badge */}
                        <Badge
                          size="sm"
                          variant={
                            expense.paymentStatus === "paid"
                              ? "success"
                              : expense.paymentStatus === "partially_paid"
                              ? "gold"
                              : "default"
                          }
                        >
                          {expense.paymentStatus === "paid"
                            ? "Paid"
                            : expense.paymentStatus === "partially_paid"
                            ? "Partially Paid"
                            : "Unpaid"}
                        </Badge>

                        {/* Over-estimate badge */}
                        {isOverEstimate && (
                          <Badge size="sm" variant="error" className="font-bold">
                            +{formatBudgetAmount(overrunAmt, currency)} Over Estimate
                          </Badge>
                        )}
                      </div>

                      {/* Notes / Vendor info */}
                      {expense.notes && (
                        <p className="text-xs text-[color:var(--text-secondary)]">
                          {expense.notes}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-[color:var(--text-muted)]">
                        {expense.vendorName && (
                          <span>
                            Vendor: <strong className="text-[color:var(--text-secondary)]">{expense.vendorName}</strong>
                          </span>
                        )}

                        {expense.dueDate && (
                          <>
                            <span>·</span>
                            <span>Due: {expense.dueDate}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Financial Figures & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-[color:var(--border)]/60">
                      {/* Financial Numbers */}
                      <div className="text-right">
                        <div className="text-xs text-[color:var(--text-muted)]">Estimated</div>
                        <div className="font-bold text-sm sm:text-base text-[color:var(--accent-primary)]">
                          {formatBudgetAmount(expense.estimatedCost, currency)}
                        </div>
                      </div>

                      <div className="text-right min-w-[5.5rem]">
                        <div className="text-xs text-[color:var(--text-muted)]">Actual Quote</div>
                        {hasActual ? (
                          <div
                            className={[
                              "font-bold text-sm sm:text-base",
                              isOverEstimate
                                ? "text-[color:var(--error)]"
                                : "text-[color:var(--success)]",
                            ].join(" ")}
                          >
                            {formatBudgetAmount(expense.actualCost!, currency)}
                          </div>
                        ) : (
                          <span className="text-[11px] font-medium text-[color:var(--text-muted)] italic">
                            Pending quote
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingExpense(expense);
                            setIsExpenseModalOpen(true);
                          }}
                          aria-label={`Edit expense "${expense.name}"`}
                          className="p-1.5 rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)] transition-colors"
                        >
                          <Edit2 size={16} aria-hidden="true" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDeletingExpense(expense);
                            setIsDeleteModalOpen(true);
                          }}
                          aria-label={`Delete expense "${expense.name}"`}
                          className="p-1.5 rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:text-[color:var(--error)] hover:bg-[color:var(--error-light)] focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)] transition-colors"
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── MODALS & DIALOGS ────────────────────────────────────── */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
        initialExpense={editingExpense}
        currency={currency}
        existingCategories={existingCategories}
      />

      <DeleteExpenseDialog
        isOpen={isDeleteModalOpen}
        expenseName={deletingExpense?.name || "Expense"}
        onConfirm={handleDeleteExpenseConfirm}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setDeletingExpense(null);
        }}
      />

      <ContingencyModal
        isOpen={isContingencyModalOpen}
        onClose={() => setIsContingencyModalOpen(false)}
        currentRate={contingencyRate}
        categorySubtotal={metrics?.categorySubtotal || 0}
        currency={currency}
        onSave={handleSaveContingencyRate}
      />
    </div>
  );
}
