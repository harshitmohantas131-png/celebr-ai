"use client";

import React, { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  Building2,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  Globe,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Filter,
  ArrowUpDown,
  CheckSquare,
  Square,
  Sparkles,
  Link as LinkIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Progress } from "@/components/ui/Progress";
import { planStorage } from "@/lib/storage/planStorage";
import { formatBudgetAmount } from "@/lib/utils";
import { formatIsoDate } from "@/lib/utils/date";
import type { EventPlan, Currency } from "@/types/event";
import {
  VENDOR_CATEGORY_DEFINITIONS,
  type BookingStatus,
  type Vendor,
  type VendorCategory,
  type VendorTask,
} from "@/types/vendor";
import {
  calculateVendorMetrics,
  createStarterVendorTasks,
  filterAndSortVendors,
  isTaskOverdue,
  type VendorSortOption,
  type VendorTaskFilter,
} from "./vendorService";
import { VendorModal } from "./VendorModal";
import { VendorTaskModal } from "./VendorTaskModal";
import { DeleteVendorDialog } from "./DeleteVendorDialog";

const EMPTY_PLANS: EventPlan[] = [];

export function VendorChecklistView() {
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
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<VendorCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [taskFilter, setTaskFilter] = useState<VendorTaskFilter>("all");
  const [sortBy, setSortBy] = useState<VendorSortOption>("name-asc");

  // Expanded vendors state (all expanded by default for discoverability)
  const [expandedVendorIds, setExpandedVendorIds] = useState<Record<string, boolean>>({});

  // Modals state
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [activeVendorForTask, setActiveVendorForTask] = useState<Vendor | null>(null);
  const [editingTask, setEditingTask] = useState<VendorTask | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingVendor, setDeletingVendor] = useState<Vendor | null>(null);

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
  const vendors = useMemo(() => currentPlan?.vendors || [], [currentPlan]);

  // Available budget line items for linking
  const availableBudgetItems = useMemo(() => {
    if (!currentPlan?.budget?.categories) return [];
    const items: { id: string; name: string; categoryName: string }[] = [];
    for (const cat of currentPlan.budget.categories) {
      for (const lineItem of cat.items) {
        items.push({
          id: lineItem.id,
          name: lineItem.name,
          categoryName: cat.name,
        });
      }
    }
    return items;
  }, [currentPlan]);

  // Overall metrics
  const metrics = useMemo(() => {
    return calculateVendorMetrics(vendors);
  }, [vendors]);

  // Filtered and sorted vendors
  const filteredVendors = useMemo(() => {
    return filterAndSortVendors(vendors, {
      searchQuery,
      category: categoryFilter,
      bookingStatus: statusFilter,
      taskFilter,
      sortBy,
    });
  }, [vendors, searchQuery, categoryFilter, statusFilter, taskFilter, sortBy]);

  // Toggle vendor expansion
  const toggleVendorExpand = (vendorId: string) => {
    setExpandedVendorIds((prev) => ({
      ...prev,
      [vendorId]: prev[vendorId] === undefined ? false : !prev[vendorId],
    }));
  };

  const isVendorExpanded = (vendorId: string) => {
    return expandedVendorIds[vendorId] !== false; // Default expanded
  };

  // Helper to persist updated vendors to current plan
  const persistVendorsUpdate = (
    updatedVendors: Vendor[],
    updatedPlanDetails?: Partial<EventPlan>,
    successMsg?: string
  ) => {
    if (!currentPlan) return;

    const updatedPlan: EventPlan = {
      ...currentPlan,
      ...updatedPlanDetails,
      vendors: updatedVendors,
    };

    planStorage.save(updatedPlan);
    if (successMsg) {
      setNotification(successMsg);
    }
  };

  // Save / Edit Vendor
  const handleSaveVendor = (savedVendor: Vendor, shouldSyncBudget = false) => {
    const exists = vendors.some((v) => v.id === savedVendor.id);
    let updatedVendors: Vendor[];

    if (exists) {
      updatedVendors = vendors.map((v) => (v.id === savedVendor.id ? savedVendor : v));
    } else {
      updatedVendors = [...vendors, savedVendor];
    }

    // If sync with budget requested and budgetLineItemId is set
    let updatedCategories = currentPlan?.budget.categories;
    if (shouldSyncBudget && savedVendor.budgetLineItemId && currentPlan?.budget?.categories) {
      updatedCategories = currentPlan.budget.categories.map((cat) => ({
        ...cat,
        items: cat.items.map((item) => {
          if (item.id === savedVendor.budgetLineItemId) {
            return {
              ...item,
              vendorName: savedVendor.name,
              actualCost: savedVendor.cost !== undefined ? savedVendor.cost : item.actualCost,
            };
          }
          return item;
        }),
      }));
    }

    const budgetUpdate = updatedCategories
      ? {
          budget: {
            ...currentPlan!.budget,
            categories: updatedCategories,
          },
        }
      : {};

    persistVendorsUpdate(
      updatedVendors,
      budgetUpdate,
      exists
        ? `Vendor "${savedVendor.name}" updated successfully.`
        : `Vendor "${savedVendor.name}" added with ${savedVendor.checklist.length} checklist deliverable(s).`
    );
  };

  // Delete Vendor
  const handleConfirmDeleteVendor = () => {
    if (!deletingVendor) return;
    const updatedVendors = vendors.filter((v) => v.id !== deletingVendor.id);
    persistVendorsUpdate(
      updatedVendors,
      undefined,
      `Vendor "${deletingVendor.name}" and associated tasks removed.`
    );
    setDeletingVendor(null);
    setIsDeleteModalOpen(false);
  };

  // Change Vendor Booking Status
  const handleStatusChange = (vendorId: string, newStatus: BookingStatus) => {
    const updatedVendors = vendors.map((v) =>
      v.id === vendorId ? { ...v, bookingStatus: newStatus, updatedAt: new Date().toISOString() } : v
    );
    persistVendorsUpdate(
      updatedVendors,
      undefined,
      `Booking status changed to "${newStatus}".`
    );
  };

  // Toggle Task Completion
  const handleToggleTask = (vendorId: string, taskId: string) => {
    const updatedVendors = vendors.map((v) => {
      if (v.id !== vendorId) return v;
      const updatedChecklist = v.checklist.map((t) => {
        if (t.id !== taskId) return t;
        return { ...t, completed: !t.completed };
      });
      return {
        ...v,
        checklist: updatedChecklist,
        updatedAt: new Date().toISOString(),
      };
    });

    persistVendorsUpdate(updatedVendors);
  };

  // Save Task (Add or Edit)
  const handleSaveTask = (savedTask: VendorTask) => {
    if (!activeVendorForTask) return;
    const vendorId = activeVendorForTask.id;

    const updatedVendors = vendors.map((v) => {
      if (v.id !== vendorId) return v;
      const taskExists = v.checklist.some((t) => t.id === savedTask.id);
      let updatedChecklist: VendorTask[];

      if (taskExists) {
        updatedChecklist = v.checklist.map((t) => (t.id === savedTask.id ? savedTask : t));
      } else {
        updatedChecklist = [...v.checklist, savedTask];
      }

      return {
        ...v,
        checklist: updatedChecklist,
        updatedAt: new Date().toISOString(),
      };
    });

    persistVendorsUpdate(
      updatedVendors,
      undefined,
      `Task "${savedTask.title}" saved for ${activeVendorForTask.name}.`
    );
    setActiveVendorForTask(null);
    setEditingTask(null);
    setIsTaskModalOpen(false);
  };

  // Delete Task
  const handleDeleteTask = (vendorId: string, taskId: string, taskTitle: string) => {
    const updatedVendors = vendors.map((v) => {
      if (v.id !== vendorId) return v;
      return {
        ...v,
        checklist: v.checklist.filter((t) => t.id !== taskId),
        updatedAt: new Date().toISOString(),
      };
    });

    persistVendorsUpdate(updatedVendors, undefined, `Task "${taskTitle}" deleted.`);
  };

  // Quick Starter Plan Creation (when zero plans exist)
  const handleCreateQuickPlan = () => {
    const defaultDate = formatIsoDate(new Date(Date.now() + 120 * 24 * 60 * 60 * 1000));
    const newPlanId = `plan-vendor-${Date.now().toString(36)}`;

    const starterVendors: Vendor[] = [
      {
        id: `ven-${Date.now().toString(36)}-1`,
        name: "Grand Ballroom & Heritage Gardens",
        category: "venue",
        bookingStatus: "booked",
        cost: 8500,
        contactName: "Julian Vance",
        phone: "+1 555-0144",
        email: "events@grandballroom.com",
        website: "https://grandballroom.example.com",
        notes: "Main reception hall and garden terrace for cocktail reception.",
        checklist: createStarterVendorTasks(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: `ven-${Date.now().toString(36)}-2`,
        name: "Artisan Culinary & Craft Cocktails",
        category: "catering",
        bookingStatus: "contacted",
        cost: 6200,
        contactName: "Chef Margot Dubois",
        phone: "+1 555-0182",
        email: "info@artisanculinary.com",
        checklist: createStarterVendorTasks(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: `ven-${Date.now().toString(36)}-3`,
        name: "Golden Hour Cinematic Photography",
        category: "photography",
        bookingStatus: "shortlisted",
        cost: 3200,
        contactName: "Kai Tanaka",
        email: "kai@goldenhourphotos.com",
        checklist: createStarterVendorTasks(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const newPlan: EventPlan = {
      id: newPlanId,
      eventDetails: {
        name: "My Upcoming Celebration",
        eventType: "wedding",
        eventDate: defaultDate,
        location: "Grand Heritage Hall",
        guestCount: 80,
        totalBudget: 35000,
        currency: "USD",
        theme: "Timeless Elegance",
        culturalPreferences: [],
        dietaryRequirements: [],
        planningPriorities: ["Venue", "Catering", "Photography"],
        additionalInstructions: "",
      },
      overview: {
        summary: "Curated celebration plan initialized with comprehensive vendor management and deliverables.",
        personalizedIdeas: ["Interactive vendor checklist with milestones"],
      },
      budget: {
        categories: [
          {
            id: "cat-venue",
            name: "Venue & Rentals",
            allocatedAmount: 10000,
            items: [
              {
                id: "bgt-item-1",
                name: "Ballroom & Garden Rental",
                estimatedCost: 8500,
                priority: "high",
                categoryId: "cat-venue",
              },
            ],
          },
        ],
        contingencyRate: 0.1,
        calculation: {
          currency: "USD",
          totalBudget: 35000,
          categorySubtotal: 8500,
          contingencyRate: 0.1,
          contingencyAmount: 850,
          totalEstimatedCost: 9350,
          remainingBudget: 25650,
          isOverBudget: false,
          overBudgetAmount: 0,
          categoryBreakdown: [],
          warnings: [],
        },
      },
      milestones: [],
      schedule: [],
      checklist: [],
      vendors: starterVendors,
      metadata: {
        createdAt: new Date().toISOString(),
        version: 1,
        currency: "USD",
        eventType: "wedding",
      },
    };

    planStorage.save(newPlan);
    setSelectedPlanId(newPlanId);
    setNotification("Celebration plan initialized with starter vendor directory and checklists!");
  };

  if (!isClient) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4 text-center">
        <div className="inline-block p-4 rounded-full bg-[color:var(--accent-primary-light)] text-[color:var(--accent-primary)] mb-4 animate-pulse">
          <Building2 size={32} />
        </div>
        <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">
          Loading Vendor Checklist...
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
            Vendor Checklist
          </h1>
          <p className="text-sm text-[color:var(--text-secondary)]">
            Manage event partners, track booking stages, monitor deliverables, and coordinate payment disbursements.
          </p>
        </div>

        <EmptyState
          icon={Building2}
          title="No Celebrations Planned Yet"
          description="Create a celebration with our AI Event Architect to auto-generate vendor suggestions, or initialize a vendor checklist directly."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/events/new">
                <Button variant="primary" icon={Sparkles}>
                  Plan a Celebration with AI
                </Button>
              </Link>
              <Button variant="outline" icon={Plus} onClick={handleCreateQuickPlan}>
                Start Quick Checklist
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
              Vendor Checklist
            </h1>
            <Badge variant="primary" size="sm">
              Deliverables Tracker
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-[color:var(--text-secondary)]">
            Coordinate contracted service providers, deliverables, deadlines, and booking statuses.
          </p>
        </div>

        {/* Event Switcher */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <label
            htmlFor="vendor-event-select"
            className="text-xs font-semibold uppercase tracking-wider text-[color:var(--text-secondary)] whitespace-nowrap"
          >
            Active Event:
          </label>
          <select
            id="vendor-event-select"
            value={activePlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            className="h-10 px-3 text-sm font-medium bg-[color:var(--bg-card)] text-[color:var(--text-primary)] border border-[color:var(--border)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-[color:var(--border-focus)] transition-colors"
          >
            {savedPlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.eventDetails.name} ({plan.eventDetails.currency})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── Event Banner ───────────────────────────────────────── */}
      {currentPlan && (
        <Card className="card-surface overflow-hidden p-4 sm:p-5 bg-[color:var(--bg-card)] border border-[color:var(--border)]">
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
                  <DollarSign size={14} className="text-[color:var(--accent-primary)]" aria-hidden="true" />
                  <span>Budget: {formatBudgetAmount(currentPlan.eventDetails.totalBudget, currency)}</span>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Total Vendors */}
        <Card className="p-3 sm:p-3.5 flex flex-col justify-between min-h-[96px]">
          <span
            className="text-[11px] sm:text-xs font-medium text-[color:var(--text-secondary)] block mb-1 truncate"
            title="Total Vendors"
          >
            Total Vendors
          </span>
          <div
            className="text-base sm:text-lg xl:text-xl font-bold tracking-tight text-[color:var(--text-primary)] tabular-nums truncate"
            title={`${metrics.totalVendors} total partners`}
          >
            {metrics.totalVendors}
          </div>
          <span
            className="text-[11px] text-[color:var(--text-muted)] mt-1 block truncate"
            title={`${metrics.shortlistedVendors} shortlisted, ${metrics.contactedVendors} contacted`}
          >
            {metrics.shortlistedVendors} shortlisted · {metrics.contactedVendors} contacted
          </span>
        </Card>

        {/* 2. Booked Vendors */}
        <Card className="p-3 sm:p-3.5 flex flex-col justify-between min-h-[96px]">
          <span
            className="text-[11px] sm:text-xs font-medium text-[color:var(--text-secondary)] block mb-1 truncate"
            title="Booked Vendors"
          >
            Booked Vendors
          </span>
          <div
            className="text-base sm:text-lg xl:text-xl font-bold tracking-tight text-[color:var(--success)] tabular-nums truncate"
            title={`${metrics.bookedVendors} confirmed contracts`}
          >
            {metrics.bookedVendors}
          </div>
          <span
            className="text-[11px] text-[color:var(--text-muted)] mt-1 block truncate"
            title={`Total committed: ${formatBudgetAmount(metrics.totalAgreedCost, currency)}`}
          >
            {formatBudgetAmount(metrics.totalAgreedCost, currency)} committed
          </span>
        </Card>

        {/* 3. Outstanding Tasks */}
        <Card className="p-3 sm:p-3.5 flex flex-col justify-between min-h-[96px]">
          <span
            className="text-[11px] sm:text-xs font-medium text-[color:var(--text-secondary)] block mb-1 truncate"
            title="Outstanding Tasks"
          >
            Outstanding Tasks
          </span>
          <div
            className="text-base sm:text-lg xl:text-xl font-bold tracking-tight text-[color:var(--accent-primary)] tabular-nums truncate"
            title={`${metrics.outstandingTasks} incomplete tasks`}
          >
            {metrics.outstandingTasks}
          </div>
          <span
            className="text-[11px] text-[color:var(--text-muted)] mt-1 block truncate"
            title={`${metrics.completedTasks} of ${metrics.totalTasks} completed (${metrics.overallCompletionRate}%)`}
          >
            {metrics.overallCompletionRate}% deliverables complete
          </span>
        </Card>

        {/* 4. Overdue Items */}
        <Card className="p-3 sm:p-3.5 flex flex-col justify-between min-h-[96px]">
          <span
            className="text-[11px] sm:text-xs font-medium text-[color:var(--text-secondary)] block mb-1 truncate"
            title="Overdue Tasks"
          >
            Overdue Tasks
          </span>
          <div
            className={[
              "text-base sm:text-lg xl:text-xl font-bold tracking-tight tabular-nums truncate",
              metrics.overdueTasks > 0 ? "text-[color:var(--error)]" : "text-[color:var(--text-primary)]",
            ].join(" ")}
            title={`${metrics.overdueTasks} overdue deliverables`}
          >
            {metrics.overdueTasks}
          </div>
          <span
            className="text-[11px] text-[color:var(--text-muted)] mt-1 block truncate"
            title={metrics.overdueTasks > 0 ? "Past scheduled deadline" : "All deliverables on schedule"}
          >
            {metrics.overdueTasks > 0 ? "Requires immediate attention" : "All deadlines on schedule"}
          </span>
        </Card>
      </div>

      {/* ─── Directory & Checklist Section ────────────────────────── */}
      <section aria-labelledby="vendor-directory-heading" className="space-y-4">
        {/* Toolbar Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2
              id="vendor-directory-heading"
              className="text-lg sm:text-xl font-bold text-[color:var(--text-primary)]"
            >
              Vendor Directory & Deliverables
            </h2>
            <p className="text-xs text-[color:var(--text-secondary)]">
              Track vendor proposals, signed contracts, deposit records, and day-of execution tasks.
            </p>
          </div>

          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              setEditingVendor(null);
              setIsVendorModalOpen(true);
            }}
          >
            Add Vendor
          </Button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-3.5 bg-[color:var(--bg-card)] rounded-[var(--radius-md)] border border-[color:var(--border)] space-y-3 text-xs">
          {/* Top row: Search input + Category & Task Selects */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]"
                aria-hidden="true"
              />
              <input
                type="text"
                aria-label="Search vendors by name or contact"
                placeholder="Search by vendor name, contact person, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-8 text-xs bg-[color:var(--bg-card)] text-[color:var(--text-primary)] border border-[color:var(--border)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-1 focus:ring-[color:var(--border-focus)] placeholder:text-[color:var(--text-muted)]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search query"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category Select */}
            <div className="flex items-center gap-1.5 text-[color:var(--text-secondary)] shrink-0">
              <Filter size={14} aria-hidden="true" />
              <span>Category:</span>
              <select
                aria-label="Filter vendors by category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as VendorCategory | "all")}
                className="h-9 px-2 text-xs bg-[color:var(--bg-card)] text-[color:var(--text-primary)] border border-[color:var(--border)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-1 focus:ring-[color:var(--border-focus)]"
              >
                <option value="all">All Categories</option>
                {VENDOR_CATEGORY_DEFINITIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Task Checklist Filter */}
            <div className="flex items-center gap-1.5 text-[color:var(--text-secondary)] shrink-0">
              <CheckSquare size={14} aria-hidden="true" />
              <span>Tasks:</span>
              <select
                aria-label="Filter by checklist status"
                value={taskFilter}
                onChange={(e) => setTaskFilter(e.target.value as VendorTaskFilter)}
                className="h-9 px-2 text-xs bg-[color:var(--bg-card)] text-[color:var(--text-primary)] border border-[color:var(--border)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-1 focus:ring-[color:var(--border-focus)]"
              >
                <option value="all">All Tasks</option>
                <option value="has_outstanding">Outstanding Tasks</option>
                <option value="has_overdue">Overdue Deadlines</option>
                <option value="all_completed">Fully Completed</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-[color:var(--text-secondary)] shrink-0">
              <ArrowUpDown size={14} aria-hidden="true" />
              <span>Sort:</span>
              <select
                aria-label="Sort vendors by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as VendorSortOption)}
                className="h-9 px-2 text-xs bg-[color:var(--bg-card)] text-[color:var(--text-primary)] border border-[color:var(--border)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-1 focus:ring-[color:var(--border-focus)]"
              >
                <option value="name-asc">Name: A to Z</option>
                <option value="name-desc">Name: Z to A</option>
                <option value="cost-desc">Cost: High to Low</option>
                <option value="cost-asc">Cost: Low to High</option>
                <option value="status">Booking Status</option>
                <option value="category">Category</option>
              </select>
            </div>
          </div>

          {/* Bottom row: Booking Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[color:var(--border)]/60">
            <span className="text-[11px] font-semibold text-[color:var(--text-muted)] mr-1">
              Booking Status:
            </span>
            {[
              { id: "all", label: "All Statuses", count: vendors.length },
              { id: "booked", label: "Booked", count: vendors.filter((v) => v.bookingStatus === "booked").length },
              { id: "contacted", label: "Contacted", count: vendors.filter((v) => v.bookingStatus === "contacted").length },
              { id: "shortlisted", label: "Shortlisted", count: vendors.filter((v) => v.bookingStatus === "shortlisted").length },
              { id: "cancelled", label: "Cancelled", count: vendors.filter((v) => v.bookingStatus === "cancelled").length },
            ].map((pill) => {
              const isSelected = statusFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setStatusFilter(pill.id as BookingStatus | "all")}
                  className={[
                    "px-2.5 py-1 text-xs font-medium rounded-full transition-colors flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)]",
                    isSelected
                      ? "bg-[color:var(--accent-primary)] text-white shadow-xs"
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

        {/* Vendor List */}
        {vendors.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No Vendors Added Yet"
            description="Build your event partner directory. Add caterers, photographers, venues, and entertainment with personalized task checklists."
            action={
              <Button
                variant="primary"
                icon={Plus}
                onClick={() => {
                  setEditingVendor(null);
                  setIsVendorModalOpen(true);
                }}
              >
                Add First Vendor
              </Button>
            }
          />
        ) : filteredVendors.length === 0 ? (
          <div className="p-8 text-center bg-[color:var(--bg-card)] rounded-[var(--radius-lg)] border border-[color:var(--border)]">
            <Building2 size={32} className="mx-auto text-[color:var(--text-muted)] mb-2" aria-hidden="true" />
            <p className="text-sm font-medium text-[color:var(--text-secondary)] mb-3">
              No vendors match your search and filter criteria.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setCategoryFilter("all");
                setStatusFilter("all");
                setTaskFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredVendors.map((vendor) => {
              const categoryDef = VENDOR_CATEGORY_DEFINITIONS.find((c) => c.id === vendor.category);
              const completedTasksCount = vendor.checklist.filter((t) => t.completed).length;
              const totalTasksCount = vendor.checklist.length;
              const completionRate =
                totalTasksCount === 0 ? 0 : Math.round((completedTasksCount / totalTasksCount) * 100);
              const hasOverdueTasks = vendor.checklist.some((t) => isTaskOverdue(t));
              const isExpanded = isVendorExpanded(vendor.id);
              const isCancelled = vendor.bookingStatus === "cancelled";

              // Find linked budget item name if associated
              const linkedItem = availableBudgetItems.find((b) => b.id === vendor.budgetLineItemId);

              return (
                <Card
                  key={vendor.id}
                  className={[
                    "overflow-hidden transition-all border",
                    isCancelled
                      ? "opacity-75 bg-[color:var(--bg-subtle)] border-[color:var(--border)]"
                      : "bg-[color:var(--bg-card)] border-[color:var(--border)] hover:border-[color:var(--border-strong)]",
                  ].join(" ")}
                >
                  {/* Card Header / Summary Row */}
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Vendor Title & Badges */}
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-base sm:text-lg text-[color:var(--text-primary)]">
                            {vendor.name}
                          </h3>

                          {/* Category Badge */}
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[color:var(--bg-subtle)] text-[color:var(--text-secondary)] font-medium border border-[color:var(--border)]">
                            {categoryDef?.name || vendor.category}
                          </span>

                          {/* Booking Status Badge */}
                          <Badge
                            size="sm"
                            variant={
                              vendor.bookingStatus === "booked"
                                ? "success"
                                : vendor.bookingStatus === "contacted"
                                ? "default"
                                : vendor.bookingStatus === "shortlisted"
                                ? "gold"
                                : "error"
                            }
                            className="font-semibold"
                          >
                            {vendor.bookingStatus.toUpperCase()}
                          </Badge>

                          {/* Overdue alert badge */}
                          {hasOverdueTasks && !isCancelled && (
                            <Badge size="sm" variant="error" className="font-bold">
                              Overdue Tasks
                            </Badge>
                          )}
                        </div>

                        {/* Contact details row */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[color:var(--text-secondary)]">
                          {vendor.contactName && (
                            <span className="inline-flex items-center gap-1">
                              <Users size={13} className="text-[color:var(--text-muted)]" aria-hidden="true" />
                              <span>Contact: <strong className="text-[color:var(--text-primary)]">{vendor.contactName}</strong></span>
                            </span>
                          )}

                          {vendor.phone && (
                            <a
                              href={`tel:${vendor.phone}`}
                              className="inline-flex items-center gap-1 hover:text-[color:var(--accent-primary)] hover:underline"
                            >
                              <Phone size={13} className="text-[color:var(--text-muted)]" aria-hidden="true" />
                              <span>{vendor.phone}</span>
                            </a>
                          )}

                          {vendor.email && (
                            <a
                              href={`mailto:${vendor.email}`}
                              className="inline-flex items-center gap-1 hover:text-[color:var(--accent-primary)] hover:underline"
                            >
                              <Mail size={13} className="text-[color:var(--text-muted)]" aria-hidden="true" />
                              <span>{vendor.email}</span>
                            </a>
                          )}

                          {vendor.website && (
                            <a
                              href={
                                vendor.website.startsWith("http://") || vendor.website.startsWith("https://")
                                  ? vendor.website
                                  : `https://${vendor.website}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[color:var(--accent-primary)] hover:underline"
                            >
                              <Globe size={13} aria-hidden="true" />
                              <span>Website</span>
                            </a>
                          )}
                        </div>

                        {/* Notes snippet */}
                        {vendor.notes && (
                          <p className="text-xs text-[color:var(--text-secondary)] line-clamp-2">
                            {vendor.notes}
                          </p>
                        )}

                        {/* Linked Budget Line Item Indicator */}
                        {linkedItem && (
                          <div className="inline-flex items-center gap-1.5 text-[11px] text-[color:var(--text-muted)] pt-0.5">
                            <LinkIcon size={12} className="text-[color:var(--accent-primary)]" />
                            <span>Linked to budget:</span>
                            <Link
                              href="/budget"
                              className="font-medium text-[color:var(--accent-primary)] hover:underline"
                            >
                              {linkedItem.categoryName} → {linkedItem.name}
                            </Link>
                          </div>
                        )}
                      </div>

                      {/* Right: Cost, Booking Status Selector & Actions */}
                      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-4 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-[color:var(--border)]/60">
                        {/* Cost Display */}
                        <div className="text-left lg:text-right">
                          <div className="text-[11px] text-[color:var(--text-muted)]">Quoted / Agreed Cost</div>
                          <div className="font-bold text-sm sm:text-base text-[color:var(--text-primary)]">
                            {vendor.cost !== undefined
                              ? formatBudgetAmount(vendor.cost, currency)
                              : "Pending quote"}
                          </div>
                        </div>

                        {/* Quick Booking Status Select */}
                        <div className="shrink-0">
                          <label htmlFor={`status-select-${vendor.id}`} className="sr-only">
                            Change booking status for {vendor.name}
                          </label>
                          <select
                            id={`status-select-${vendor.id}`}
                            value={vendor.bookingStatus}
                            onChange={(e) => handleStatusChange(vendor.id, e.target.value as BookingStatus)}
                            className="h-8 px-2 text-xs font-medium bg-[color:var(--bg-subtle)] text-[color:var(--text-primary)] border border-[color:var(--border)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-1 focus:ring-[color:var(--border-focus)] cursor-pointer"
                          >
                            <option value="shortlisted">Shortlisted</option>
                            <option value="contacted">Contacted</option>
                            <option value="booked">Booked</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingVendor(vendor);
                              setIsVendorModalOpen(true);
                            }}
                            aria-label={`Edit vendor "${vendor.name}"`}
                            className="p-1.5 rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)] transition-colors"
                          >
                            <Edit2 size={16} aria-hidden="true" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDeletingVendor(vendor);
                              setIsDeleteModalOpen(true);
                            }}
                            aria-label={`Delete vendor "${vendor.name}"`}
                            className="p-1.5 rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:text-[color:var(--error)] hover:bg-[color:var(--error-light)] focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)] transition-colors"
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleVendorExpand(vendor.id)}
                            aria-expanded={isExpanded}
                            aria-label={`${isExpanded ? "Collapse" : "Expand"} checklist for ${vendor.name}`}
                            className="p-1.5 rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)] transition-colors"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar & Deliverables Count */}
                    <div className="mt-4 pt-3 border-t border-[color:var(--border)]/60 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[color:var(--text-secondary)]">
                          Deliverables Progress:
                        </span>
                        <span className="font-semibold text-[color:var(--text-primary)]">
                          {completedTasksCount}/{totalTasksCount} tasks complete ({completionRate}%)
                        </span>
                      </div>
                      <Progress value={completionRate} aria-label={`Deliverables progress for ${vendor.name}`} />
                    </div>
                  </div>

                  {/* Expandable Checklist Section */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 bg-[color:var(--bg-subtle)]/50 border-t border-[color:var(--border)] space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-secondary)] flex items-center gap-1.5">
                          <CheckSquare size={14} className="text-[color:var(--accent-primary)]" />
                          <span>Vendor Deliverables & Action Checklist</span>
                        </h4>

                        <Button
                          size="sm"
                          variant="outline"
                          icon={Plus}
                          onClick={() => {
                            setActiveVendorForTask(vendor);
                            setEditingTask(null);
                            setIsTaskModalOpen(true);
                          }}
                        >
                          Add Task
                        </Button>
                      </div>

                      {vendor.checklist.length === 0 ? (
                        <div className="py-4 text-center text-xs text-[color:var(--text-muted)] border border-dashed border-[color:var(--border)] rounded-[var(--radius-sm)] bg-[color:var(--bg-card)]">
                          No deliverables attached yet. Click &ldquo;Add Task&rdquo; to schedule deliverables.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {vendor.checklist.map((task) => {
                            const overdue = isTaskOverdue(task);

                            return (
                              <div
                                key={task.id}
                                className={[
                                  "flex items-start justify-between gap-3 p-3 rounded-[var(--radius-sm)] border transition-all text-xs",
                                  task.completed
                                    ? "bg-[color:var(--bg-card)]/60 border-[color:var(--border)]/60 opacity-80"
                                    : overdue
                                    ? "bg-[color:var(--error-light)]/20 border-[color:var(--error)]/40"
                                    : "bg-[color:var(--bg-card)] border-[color:var(--border)] hover:border-[color:var(--border-strong)]",
                                ].join(" ")}
                              >
                                {/* Checkbox + Title */}
                                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleTask(vendor.id, task.id)}
                                    aria-label={`Mark task "${task.title}" as ${task.completed ? "pending" : "completed"}`}
                                    className="mt-0.5 text-[color:var(--text-secondary)] hover:text-[color:var(--accent-primary)] focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)] rounded-xs shrink-0"
                                  >
                                    {task.completed ? (
                                      <CheckSquare size={16} className="text-[color:var(--success)]" />
                                    ) : (
                                      <Square size={16} />
                                    )}
                                  </button>

                                  <div className="space-y-0.5 flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className={[
                                          "font-medium text-sm",
                                          task.completed
                                            ? "line-through text-[color:var(--text-muted)]"
                                            : "text-[color:var(--text-primary)]",
                                        ].join(" ")}
                                      >
                                        {task.title}
                                      </span>

                                      {/* Due Date Badge */}
                                      {task.dueDate && (
                                        <Badge
                                          size="sm"
                                          variant={
                                            task.completed ? "default" : overdue ? "error" : "outline"
                                          }
                                          className="text-[10px] font-medium"
                                        >
                                          {overdue && !task.completed && "Overdue: "}
                                          Due {task.dueDate}
                                        </Badge>
                                      )}
                                    </div>

                                    {task.description && (
                                      <p className="text-[11px] text-[color:var(--text-secondary)]">
                                        {task.description}
                                      </p>
                                    )}

                                    {task.notes && (
                                      <div className="text-[11px] text-[color:var(--text-muted)] italic">
                                        Note: {task.notes}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Task actions */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveVendorForTask(vendor);
                                      setEditingTask(task);
                                      setIsTaskModalOpen(true);
                                    }}
                                    aria-label={`Edit task "${task.title}"`}
                                    className="p-1 rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)]"
                                  >
                                    <Edit2 size={13} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTask(vendor.id, task.id, task.title)}
                                    aria-label={`Delete task "${task.title}"`}
                                    className="p-1 rounded-[var(--radius-sm)] text-[color:var(--text-secondary)] hover:text-[color:var(--error)] hover:bg-[color:var(--error-light)] focus-visible:outline-2 focus-visible:outline-[color:var(--border-focus)]"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── MODALS ─────────────────────────────────────────────── */}
      <VendorModal
        isOpen={isVendorModalOpen}
        onClose={() => {
          setIsVendorModalOpen(false);
          setEditingVendor(null);
        }}
        onSave={handleSaveVendor}
        initialVendor={editingVendor}
        currency={currency}
        availableBudgetItems={availableBudgetItems}
      />

      <VendorTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setActiveVendorForTask(null);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        initialTask={editingTask}
        vendorName={activeVendorForTask?.name || "Vendor"}
      />

      <DeleteVendorDialog
        isOpen={isDeleteModalOpen}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setDeletingVendor(null);
        }}
        onConfirm={handleConfirmDeleteVendor}
        vendorName={deletingVendor?.name || ""}
        taskCount={deletingVendor?.checklist?.length || 0}
      />
    </div>
  );
}
