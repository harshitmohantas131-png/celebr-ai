"use client";

import React, { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Plus,
  Sparkles,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Filter,
  Calendar,
  MapPin,
  Users,
  Edit2,
  Trash2,
  ArrowUpDown,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Progress } from "@/components/ui/Progress";
import { planStorage } from "@/lib/storage/planStorage";
import {
  daysBetween,
  formatIsoDate,
  isMilestoneOverdue,
  isValidCalendarDate,
} from "@/lib/utils/date";
import type { EventPlan, EventType, ScheduleItem, TimelineMilestone } from "@/types/event";
import {
  calculateTimelineMetrics,
  filterAndSortMilestones,
  generateStarterMilestones,
  generateStarterSchedule,
} from "./starter";
import { validateSchedule } from "./validation";
import { MilestoneModal } from "./MilestoneModal";
import { ScheduleModal } from "./ScheduleModal";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

const EMPTY_PLANS: EventPlan[] = [];

export function TimelinePlannerView() {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Subscribe to local storage saved plans
  const savedPlans = useSyncExternalStore(
    planStorage.subscribe,
    () => planStorage.getAll(),
    () => EMPTY_PLANS
  );

  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"milestones" | "schedule">("milestones");

  // Filters & Sorting state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date-asc" | "date-desc" | "priority" | "status">("date-asc");

  // Modals state
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<TimelineMilestone | null>(null);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingScheduleItem, setEditingScheduleItem] = useState<ScheduleItem | null>(null);

  // Deletion state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "milestone" | "schedule";
    id: string;
    title: string;
  } | null>(null);

  // Starter timeline duplicate prompt
  const [starterDuplicatePrompt, setStarterDuplicatePrompt] = useState<"milestones" | "schedule" | null>(null);

  // Success alert
  const [notification, setNotification] = useState<string | null>(null);

  // Derive active plan id without calling setState in an effect
  const activePlanId =
    selectedPlanId && savedPlans.some((p) => p.id === selectedPlanId)
      ? selectedPlanId
      : savedPlans[0]?.id || "";

  // Clear notification after 4 seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  const currentPlan = useMemo(
    () => savedPlans.find((p) => p.id === activePlanId) || null,
    [savedPlans, activePlanId]
  );

  const milestones = useMemo(
    () => currentPlan?.milestones || [],
    [currentPlan]
  );

  const schedule = useMemo(
    () => currentPlan?.schedule || [],
    [currentPlan]
  );

  const eventDate = currentPlan?.eventDetails?.eventDate || "";
  const eventType: EventType = currentPlan?.eventDetails?.eventType || "wedding";

  // Timeline metrics (evaluated with client calendar date once mounted)
  const metrics = useMemo(
    () => (isClient ? calculateTimelineMetrics(milestones) : calculateTimelineMetrics([])),
    [milestones, isClient]
  );

  // Categories extracted from existing milestones
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    milestones.forEach((m) => {
      if (m.category && m.category.trim()) {
        set.add(m.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [milestones]);

  // Filtered and sorted milestones
  const filteredMilestones = useMemo(
    () =>
      isClient
        ? filterAndSortMilestones(milestones, {
            status: statusFilter,
            category: categoryFilter,
            sortBy,
          })
        : milestones,
    [milestones, statusFilter, categoryFilter, sortBy, isClient]
  );

  // Validate run sheet schedule
  const scheduleValidation = useMemo(
    () => validateSchedule(schedule),
    [schedule]
  );

  // Helper to save updated plan
  const persistPlanUpdate = (
    updater: (plan: EventPlan) => Partial<EventPlan>,
    successMessage?: string
  ) => {
    if (!currentPlan) return;
    const updates = updater(currentPlan);
    const updatedPlan: EventPlan = {
      ...currentPlan,
      ...updates,
      metadata: {
        ...currentPlan.metadata,
        createdAt: currentPlan.metadata.createdAt,
      },
    };
    planStorage.save(updatedPlan);
    if (successMessage) {
      setNotification(successMessage);
    }
  };

  // Milestone actions
  const handleSaveMilestone = (saved: TimelineMilestone) => {
    if (editingMilestone) {
      // Edit existing
      persistPlanUpdate(
        (plan) => ({
          milestones: plan.milestones.map((m) => (m.id === saved.id ? saved : m)),
        }),
        `Milestone "${saved.title}" updated successfully.`
      );
    } else {
      // Add new
      persistPlanUpdate(
        (plan) => ({
          milestones: [...plan.milestones, saved],
        }),
        `Milestone "${saved.title}" added to timeline.`
      );
    }
    setEditingMilestone(null);
  };

  const handleToggleComplete = (milestoneId: string) => {
    const target = milestones.find((m) => m.id === milestoneId);
    if (!target) return;
    const isNowCompleted = !target.completed;

    persistPlanUpdate((plan) => ({
      milestones: plan.milestones.map((m) =>
        m.id === milestoneId
          ? {
              ...m,
              completed: isNowCompleted,
              status: isNowCompleted ? "completed" : "pending",
            }
          : m
      ),
    }));
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === "milestone") {
      persistPlanUpdate(
        (plan) => ({
          milestones: plan.milestones.filter((m) => m.id !== deleteTarget.id),
        }),
        `Milestone "${deleteTarget.title}" deleted.`
      );
    } else {
      persistPlanUpdate(
        (plan) => ({
          schedule: plan.schedule.filter((s) => s.id !== deleteTarget.id),
        }),
        `Activity "${deleteTarget.title}" removed from run sheet.`
      );
    }
    setDeleteTarget(null);
  };

  // Schedule actions
  const handleSaveScheduleItem = (saved: ScheduleItem) => {
    if (editingScheduleItem) {
      persistPlanUpdate(
        (plan) => ({
          schedule: plan.schedule.map((s) => (s.id === saved.id ? saved : s)),
        }),
        `Activity "${saved.title}" updated.`
      );
    } else {
      persistPlanUpdate(
        (plan) => ({
          schedule: [...plan.schedule, saved],
        }),
        `Activity "${saved.title}" added to run sheet.`
      );
    }
    setEditingScheduleItem(null);
  };

  // Starter generation handler
  const handleGenerateStarterMilestones = (mode: "replace" | "append") => {
    const starter = generateStarterMilestones(eventDate, eventType);
    if (mode === "replace") {
      persistPlanUpdate(
        () => ({ milestones: starter }),
        `Generated ${starter.length} starter milestones for your ${eventType}.`
      );
    } else {
      persistPlanUpdate(
        (plan) => ({ milestones: [...plan.milestones, ...starter] }),
        `Appended ${starter.length} starter milestones.`
      );
    }
    setStarterDuplicatePrompt(null);
  };

  const handleGenerateStarterSchedule = (mode: "replace" | "append") => {
    const starter = generateStarterSchedule(eventType);
    if (mode === "replace") {
      persistPlanUpdate(
        () => ({ schedule: starter }),
        `Generated day-of run sheet activities for your ${eventType}.`
      );
    } else {
      persistPlanUpdate(
        (plan) => ({ schedule: [...plan.schedule, ...starter] }),
        `Appended starter day-of activities.`
      );
    }
    setStarterDuplicatePrompt(null);
  };

  // Create quick custom celebration plan if no plan exists
  const handleCreateQuickPlan = () => {
    const defaultDate = formatIsoDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
    const newPlanId = `plan-custom-${Date.now().toString(36)}`;
    const starterMilestones = generateStarterMilestones(defaultDate, "wedding");
    const starterSchedule = generateStarterSchedule("wedding");

    const newPlan: EventPlan = {
      id: newPlanId,
      eventDetails: {
        name: "My Upcoming Celebration",
        eventType: "wedding",
        eventDate: defaultDate,
        location: "Main Venue",
        guestCount: 50,
        totalBudget: 15000,
        currency: "USD",
        theme: "Classic Elegance",
        culturalPreferences: [],
        dietaryRequirements: [],
        planningPriorities: ["Venue", "Schedule"],
        additionalInstructions: "",
      },
      overview: {
        summary: "Custom timeline plan initialized for milestone tracking and day-of execution.",
        personalizedIdeas: ["Personalized milestone tracking"],
      },
      budget: {
        categories: [
          {
            id: "cat-general",
            name: "General Planning",
            allocatedAmount: 15000,
            items: [],
          },
        ],
        contingencyRate: 0.1,
        calculation: {
          currency: "USD",
          totalBudget: 15000,
          categorySubtotal: 0,
          contingencyRate: 0.1,
          contingencyAmount: 1500,
          totalEstimatedCost: 1500,
          remainingBudget: 13500,
          isOverBudget: false,
          overBudgetAmount: 0,
          categoryBreakdown: [],
          warnings: [],
        },
      },
      milestones: starterMilestones,
      schedule: starterSchedule,
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
    setNotification("New celebration timeline created with recommended starter milestones!");
  };

  if (!isClient) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4 text-center">
        <div className="inline-block p-4 rounded-full bg-[color:var(--accent-primary-light)] text-[color:var(--accent-primary)] mb-4 animate-pulse">
          <CalendarClock size={32} />
        </div>
        <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Loading Timeline Planner...</h1>
      </div>
    );
  }

  // If no saved celebrations exist at all
  if (savedPlans.length === 0) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 pb-16">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[color:var(--text-primary)] mb-2">
            Timeline Planner
          </h1>
          <p className="text-sm text-[color:var(--text-secondary)]">
            Schedule preparation milestones, track task completion, and organize your minute-by-minute event-day run sheet.
          </p>
        </div>

        <EmptyState
          icon={CalendarClock}
          title="No Celebrations Planned Yet"
          description="Create your celebration with the AI Event Architect to auto-generate a tailored timeline, or start a custom timeline directly."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/events/new">
                <Button variant="primary" icon={Sparkles}>
                  Plan a Celebration with AI
                </Button>
              </Link>
              <Button variant="outline" icon={Plus} onClick={handleCreateQuickPlan}>
                Start Quick Timeline
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
              Timeline Planner
            </h1>
            <Badge variant="primary" size="sm">
              Live Tracker
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-[color:var(--text-secondary)]">
            Schedule preparation deliverables, catch overdue milestones, and maintain a synchronous day-of run sheet.
          </p>
        </div>

        {/* Event Selector Dropdown */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <label htmlFor="event-plan-select" className="text-xs font-semibold uppercase tracking-wider text-[color:var(--text-secondary)] whitespace-nowrap">
            Active Event:
          </label>
          <select
            id="event-plan-select"
            value={activePlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            className="h-10 px-3 text-sm font-medium bg-[color:var(--bg-card)] text-[color:var(--text-primary)] border border-[color:var(--border)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)] transition-colors"
          >
            {savedPlans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.eventDetails.name} ({p.eventDetails.eventType})
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
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[color:var(--text-secondary)]">
                <span className="inline-flex items-center gap-1">
                  <Calendar size={14} className="text-[color:var(--accent-primary)]" aria-hidden="true" />
                  <span>Target Date: <strong>{currentPlan.eventDetails.eventDate || "TBD"}</strong></span>
                </span>
                {currentPlan.eventDetails.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={14} className="text-[color:var(--accent-primary)]" aria-hidden="true" />
                    <span>{currentPlan.eventDetails.location}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Users size={14} className="text-[color:var(--accent-primary)]" aria-hidden="true" />
                  <span>{currentPlan.eventDetails.guestCount} Guests</span>
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

      {/* ─── Summary KPI Metrics Grid ───────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Milestones */}
        <Card className="p-4 sm:p-5">
          <span className="text-xs font-medium text-[color:var(--text-secondary)] block mb-1">
            Total Milestones
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-[color:var(--text-primary)]">
            {metrics.total}
          </div>
          <span className="text-xs text-[color:var(--text-muted)] mt-1 block">
            Across {availableCategories.length || 1} categories
          </span>
        </Card>

        {/* Completed */}
        <Card className="p-4 sm:p-5">
          <span className="text-xs font-medium text-[color:var(--text-secondary)] block mb-1">
            Completed Tasks
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-[color:var(--success)]">
            {metrics.completed}
          </div>
          <span className="text-xs text-[color:var(--text-muted)] mt-1 block">
            {metrics.completionPercentage}% of total completed
          </span>
        </Card>

        {/* Pending & In Progress */}
        <Card className="p-4 sm:p-5">
          <span className="text-xs font-medium text-[color:var(--text-secondary)] block mb-1">
            Active Tasks
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-[color:var(--accent-primary)]">
            {metrics.pending + metrics.inProgress}
          </div>
          <span className="text-xs text-[color:var(--text-muted)] mt-1 block">
            {metrics.inProgress} in progress · {metrics.pending} pending
          </span>
        </Card>

        {/* Overdue */}
        <Card
          className={[
            "p-4 sm:p-5 border transition-colors",
            metrics.overdue > 0
              ? "border-[color:var(--error)]/50 bg-[color:var(--error-light)]/20"
              : "border-[color:var(--border)]",
          ].join(" ")}
        >
          <span className="text-xs font-medium text-[color:var(--text-secondary)] block mb-1">
            Overdue Tasks
          </span>
          <div
            className={[
              "text-2xl sm:text-3xl font-bold",
              metrics.overdue > 0 ? "text-[color:var(--error)]" : "text-[color:var(--text-primary)]",
            ].join(" ")}
          >
            {metrics.overdue}
          </div>
          <span className="text-xs text-[color:var(--text-muted)] mt-1 block">
            {metrics.overdue > 0 ? "Requires prompt attention" : "All deliverables on schedule"}
          </span>
        </Card>
      </div>

      {/* Progress Bar */}
      <div className="bg-[color:var(--bg-card)] p-4 sm:p-5 rounded-[var(--radius-lg)] border border-[color:var(--border)]">
        <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-[color:var(--text-primary)] mb-2">
          <span>Overall Preparation Timeline Progress</span>
          <span>{metrics.completionPercentage}% Complete</span>
        </div>
        <Progress value={metrics.completionPercentage} aria-label="Preparation timeline progress" />
      </div>

      {/* ─── Tabs Navigation ─────────────────────────────────────── */}
      <div className="flex border-b border-[color:var(--border)] gap-8">
        <button
          type="button"
          onClick={() => setActiveTab("milestones")}
          className={[
            "pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2",
            activeTab === "milestones"
              ? "border-[color:var(--accent-primary)] text-[color:var(--accent-primary)]"
              : "border-transparent text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]",
          ].join(" ")}
        >
          <span>Preparation Milestones</span>
          <Badge size="sm" variant={activeTab === "milestones" ? "primary" : "default"}>
            {milestones.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("schedule")}
          className={[
            "pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2",
            activeTab === "schedule"
              ? "border-[color:var(--accent-primary)] text-[color:var(--accent-primary)]"
              : "border-transparent text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]",
          ].join(" ")}
        >
          <span>Day-of Run Sheet</span>
          <Badge size="sm" variant={activeTab === "schedule" ? "primary" : "default"}>
            {schedule.length}
          </Badge>
        </button>
      </div>

      {/* ─── TAB 1: PREPARATION MILESTONES ───────────────────────── */}
      {activeTab === "milestones" && (
        <div className="space-y-6">
          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                icon={Plus}
                onClick={() => {
                  setEditingMilestone(null);
                  setIsMilestoneModalOpen(true);
                }}
              >
                Add Milestone
              </Button>

              <Button
                variant="outline"
                icon={RefreshCw}
                onClick={() => {
                  if (milestones.length > 0) {
                    setStarterDuplicatePrompt("milestones");
                  } else {
                    handleGenerateStarterMilestones("replace");
                  }
                }}
              >
                Generate Starter Timeline
              </Button>
            </div>

            {/* Quick Status Pill Bar */}
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter milestones by status">
              {[
                { id: "all", label: "All", count: metrics.total },
                { id: "pending", label: "Pending", count: metrics.pending },
                { id: "in_progress", label: "In Progress", count: metrics.inProgress },
                { id: "completed", label: "Completed", count: metrics.completed },
                { id: "overdue", label: "Overdue", count: metrics.overdue },
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
                        ? pill.id === "overdue"
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
          </div>

          {/* Duplicate Prevention Alert Banner */}
          {starterDuplicatePrompt === "milestones" && (
            <div
              role="alert"
              className="p-4 rounded-[var(--radius-md)] bg-[color:var(--warning-light)] border border-[color:var(--warning)] text-[color:var(--text-primary)] space-y-3"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-[color:var(--warning)] shrink-0 mt-0.5" />
                <div className="text-sm">
                  <strong>Milestones Already Exist</strong>
                  <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">
                    This celebration already has {milestones.length} milestone(s). Generating starter deliverables will duplicate or replace them.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 pl-7">
                <Button size="sm" variant="outline" onClick={() => setStarterDuplicatePrompt(null)}>
                  Cancel
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleGenerateStarterMilestones("append")}>
                  Append Starter Deliverables
                </Button>
                <Button size="sm" variant="primary" onClick={() => handleGenerateStarterMilestones("replace")}>
                  Replace All Existing
                </Button>
              </div>
            </div>
          )}

          {/* Filter & Sort Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[color:var(--bg-card)] rounded-[var(--radius-md)] border border-[color:var(--border)] text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-[color:var(--text-secondary)]">
                <Filter size={14} aria-hidden="true" />
                <span>Category:</span>
              </div>
              <select
                aria-label="Filter by milestone category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-8 px-2 text-xs bg-[color:var(--bg-card)] text-[color:var(--text-primary)] border border-[color:var(--border)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-1 focus:ring-[color:var(--border-focus)]"
              >
                <option value="all">All Categories ({milestones.length})</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[color:var(--text-secondary)]">
                <ArrowUpDown size={14} aria-hidden="true" />
                <span>Sort By:</span>
              </div>
              <select
                aria-label="Sort milestones by"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "date-asc" | "date-desc" | "priority" | "status")
                }
                className="h-8 px-2 text-xs bg-[color:var(--bg-card)] text-[color:var(--text-primary)] border border-[color:var(--border)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-1 focus:ring-[color:var(--border-focus)]"
              >
                <option value="date-asc">Due Date: Earliest First</option>
                <option value="date-desc">Due Date: Latest First</option>
                <option value="priority">Priority: Highest First</option>
                <option value="status">Status: Pending First</option>
              </select>
            </div>
          </div>

          {/* ─── Chronological Milestone Timeline ────────────────── */}
          {filteredMilestones.length === 0 ? (
            <div className="p-8 text-center bg-[color:var(--bg-card)] rounded-[var(--radius-lg)] border border-[color:var(--border)]">
              <p className="text-sm font-medium text-[color:var(--text-secondary)] mb-3">
                No milestones match your selected filter criteria.
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
            <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-[color:var(--border)]">
              {filteredMilestones.map((m) => {
                const isCompleted = m.completed || m.status === "completed";
                const isOverdue = isClient ? isMilestoneOverdue(m.targetDate, isCompleted) : false;
                const actualDaysBefore =
                  isValidCalendarDate(m.targetDate) && isValidCalendarDate(eventDate)
                    ? daysBetween(m.targetDate, eventDate)
                    : m.daysBeforeEvent;

                return (
                  <div key={m.id} className="relative group">
                    {/* Timeline Node Dot */}
                    <div
                      className={[
                        "absolute -left-6 sm:-left-8 top-4.5 w-3 h-3 rounded-full border-2 transition-colors",
                        isCompleted
                          ? "bg-[color:var(--success)] border-[color:var(--success)]"
                          : isOverdue
                          ? "bg-[color:var(--error)] border-[color:var(--error)]"
                          : "bg-[color:var(--bg-page)] border-[color:var(--accent-primary)]",
                      ].join(" ")}
                      aria-hidden="true"
                    />

                    {/* Milestone Card */}
                    <Card
                      className={[
                        "p-4 sm:p-5 transition-all border",
                        isCompleted
                          ? "bg-[color:var(--success-light)]/15 border-[color:var(--success)]/40 opacity-80"
                          : isOverdue
                          ? "border-[color:var(--error)]/60 bg-[color:var(--error-light)]/10 shadow-xs"
                          : "bg-[color:var(--bg-card)] border-[color:var(--border)] hover:border-[color:var(--border-strong)]",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Complete Checkbox Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(m.id)}
                            aria-label={`Mark milestone "${m.title}" as ${
                              isCompleted ? "pending" : "completed"
                            }`}
                            className="mt-0.5 text-[color:var(--accent-primary)] hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)] rounded-full shrink-0"
                          >
                            {isCompleted ? (
                              <CheckCircle2 size={22} className="text-[color:var(--success)]" />
                            ) : (
                              <Circle size={22} className="text-[color:var(--text-secondary)]" />
                            )}
                          </button>

                          {/* Content */}
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3
                                className={[
                                  "font-bold text-sm sm:text-base text-[color:var(--text-primary)]",
                                  isCompleted ? "line-through text-[color:var(--text-muted)]" : "",
                                ].join(" ")}
                              >
                                {m.title}
                              </h3>

                              {/* Priority Badge */}
                              <Badge
                                size="sm"
                                variant={
                                  m.priority === "high"
                                    ? "rose"
                                    : m.priority === "medium"
                                    ? "gold"
                                    : "default"
                                }
                              >
                                {m.priority || "medium"}
                              </Badge>

                              {/* Category Chip */}
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[color:var(--bg-subtle)] text-[color:var(--text-secondary)] font-medium">
                                {m.category}
                              </span>

                              {/* Overdue Badge */}
                              {isOverdue && (
                                <Badge size="sm" variant="outline" className="!text-[color:var(--error)] !border-[color:var(--error)] font-bold">
                                  Overdue
                                </Badge>
                              )}
                            </div>

                            {/* Description */}
                            {m.description && (
                              <p className="text-xs sm:text-sm text-[color:var(--text-secondary)]">
                                {m.description}
                              </p>
                            )}

                            {/* Date & Time Meta */}
                            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-[color:var(--text-muted)]">
                              <span className="inline-flex items-center gap-1 font-medium text-[color:var(--text-primary)]">
                                <Calendar size={13} className="text-[color:var(--accent-primary)]" aria-hidden="true" />
                                <span>Due: {m.targetDate}</span>
                              </span>

                              <span>·</span>

                              <span>
                                {actualDaysBefore === 0
                                  ? "Day of Celebration"
                                  : `${actualDaysBefore} day${actualDaysBefore === 1 ? "" : "s"} before event`}
                              </span>

                              {m.time && (
                                <>
                                  <span>·</span>
                                  <span className="inline-flex items-center gap-1">
                                    <Clock size={13} aria-hidden="true" />
                                    <span>{m.time}</span>
                                  </span>
                                </>
                              )}

                              <span>·</span>

                              <span className="capitalize">
                                Status: <strong>{m.status || (isCompleted ? "completed" : "pending")}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMilestone(m);
                              setIsMilestoneModalOpen(true);
                            }}
                            aria-label={`Edit milestone "${m.title}"`}
                            className="p-1.5 rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)] transition-colors"
                          >
                            <Edit2 size={16} aria-hidden="true" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                type: "milestone",
                                id: m.id,
                                title: m.title,
                              })
                            }
                            aria-label={`Delete milestone "${m.title}"`}
                            className="p-1.5 rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:text-[color:var(--error)] hover:bg-[color:var(--error-light)] focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)] transition-colors"
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: DAY-OF RUN SHEET ─────────────────────────────── */}
      {activeTab === "schedule" && (
        <div className="space-y-6">
          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                icon={Plus}
                onClick={() => {
                  setEditingScheduleItem(null);
                  setIsScheduleModalOpen(true);
                }}
              >
                Add Activity
              </Button>

              <Button
                variant="outline"
                icon={RefreshCw}
                onClick={() => {
                  if (schedule.length > 0) {
                    setStarterDuplicatePrompt("schedule");
                  } else {
                    handleGenerateStarterSchedule("replace");
                  }
                }}
              >
                Generate Starter Run Sheet
              </Button>
            </div>

            <div className="text-xs text-[color:var(--text-secondary)]">
              Total Duration: <strong>{scheduleValidation.totalDurationMinutes} minutes</strong> ({schedule.length} activities)
            </div>
          </div>

          {/* Duplicate Prevention Alert Banner */}
          {starterDuplicatePrompt === "schedule" && (
            <div
              role="alert"
              className="p-4 rounded-[var(--radius-md)] bg-[color:var(--warning-light)] border border-[color:var(--warning)] text-[color:var(--text-primary)] space-y-3"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-[color:var(--warning)] shrink-0 mt-0.5" />
                <div className="text-sm">
                  <strong>Run Sheet Activities Already Exist</strong>
                  <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">
                    This run sheet already has {schedule.length} item(s).
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 pl-7">
                <Button size="sm" variant="outline" onClick={() => setStarterDuplicatePrompt(null)}>
                  Cancel
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleGenerateStarterSchedule("append")}>
                  Append Starter Activities
                </Button>
                <Button size="sm" variant="primary" onClick={() => handleGenerateStarterSchedule("replace")}>
                  Replace All Existing
                </Button>
              </div>
            </div>
          )}

          {/* Validation Warnings (Overlaps or Errors) */}
          {(!scheduleValidation.valid || scheduleValidation.warnings.length > 0) && (
            <div className="space-y-2">
              {scheduleValidation.errors.map((err, i) => (
                <div
                  key={i}
                  role="alert"
                  className="flex items-start gap-2 p-3 rounded-[var(--radius-sm)] bg-[color:var(--error-light)] border border-[color:var(--error)] text-xs text-[color:var(--error)]"
                >
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{err}</span>
                </div>
              ))}
              {scheduleValidation.warnings.map((warn, i) => (
                <div
                  key={i}
                  role="status"
                  className="flex items-start gap-2 p-3 rounded-[var(--radius-sm)] bg-[color:var(--warning-light)] border border-[color:var(--warning)] text-xs text-[color:var(--warning)]"
                >
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          )}

          {/* Schedule List */}
          {schedule.length === 0 ? (
            <div className="p-8 text-center bg-[color:var(--bg-card)] rounded-[var(--radius-lg)] border border-[color:var(--border)]">
              <Clock size={32} className="mx-auto text-[color:var(--text-muted)] mb-2" aria-hidden="true" />
              <p className="text-sm font-medium text-[color:var(--text-secondary)] mb-3">
                No event-day schedule items created yet.
              </p>
              <Button
                size="sm"
                variant="primary"
                icon={Sparkles}
                onClick={() => handleGenerateStarterSchedule("replace")}
              >
                Generate Day-Of Run Sheet
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduleValidation.sortedSchedule.map((item, idx) => (
                <Card
                  key={item.id}
                  className="p-4 sm:p-5 bg-[color:var(--bg-card)] border border-[color:var(--border)] hover:border-[color:var(--border-strong)] transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Time block badge */}
                      <div className="shrink-0 text-center px-3 py-2 rounded-[var(--radius-sm)] bg-[color:var(--bg-subtle)] border border-[color:var(--border)]">
                        <div className="text-xs font-bold text-[color:var(--accent-primary)] whitespace-nowrap">
                          {item.startTime} – {item.endTime}
                        </div>
                        <div className="text-[10px] text-[color:var(--text-muted)] mt-0.5 font-medium">
                          Step {idx + 1}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="space-y-1 flex-1 min-w-0">
                        <h3 className="font-bold text-sm sm:text-base text-[color:var(--text-primary)]">
                          {item.title}
                        </h3>
                        {item.description && (
                          <p className="text-xs sm:text-sm text-[color:var(--text-secondary)]">
                            {item.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-[color:var(--text-muted)]">
                          {item.location && (
                            <span className="inline-flex items-center gap-1 font-medium text-[color:var(--text-secondary)]">
                              <MapPin size={13} className="text-[color:var(--accent-primary)]" aria-hidden="true" />
                              <span>{item.location}</span>
                            </span>
                          )}
                          {item.responsibleRole && (
                            <span className="inline-flex items-center gap-1">
                              <Users size={13} aria-hidden="true" />
                              <span>Lead: <strong>{item.responsibleRole}</strong></span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 self-end sm:self-start shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingScheduleItem(item);
                          setIsScheduleModalOpen(true);
                        }}
                        aria-label={`Edit schedule activity "${item.title}"`}
                        className="p-1.5 rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)] transition-colors"
                      >
                        <Edit2 size={16} aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({
                            type: "schedule",
                            id: item.id,
                            title: item.title,
                          })
                        }
                        aria-label={`Delete schedule activity "${item.title}"`}
                        className="p-1.5 rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:text-[color:var(--error)] hover:bg-[color:var(--error-light)] focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)] transition-colors"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── MODALS & DIALOGS ────────────────────────────────────── */}
      <MilestoneModal
        isOpen={isMilestoneModalOpen}
        onClose={() => {
          setIsMilestoneModalOpen(false);
          setEditingMilestone(null);
        }}
        onSave={handleSaveMilestone}
        initialMilestone={editingMilestone}
        eventDate={eventDate}
      />

      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setEditingScheduleItem(null);
        }}
        onSave={handleSaveScheduleItem}
        initialItem={editingScheduleItem}
      />

      <DeleteConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title={deleteTarget?.type === "milestone" ? "Delete Milestone" : "Remove Activity"}
        message={
          deleteTarget?.type === "milestone"
            ? `Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`
            : `Are you sure you want to remove "${deleteTarget?.title}" from the day-of run sheet?`
        }
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
