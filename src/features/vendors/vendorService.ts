/**
 * Vendor Management and Checklist Service.
 * Pure business logic for vendor metrics, starter task generation, and filtering.
 */

import { isMilestoneOverdue } from "@/lib/utils/date";
import type {
  BookingStatus,
  Vendor,
  VendorCategory,
  VendorProgress,
  VendorTask,
} from "@/types/vendor";

/**
 * Creates sensible, editable starter checklist tasks for a vendor.
 * Avoids duplication by generating fresh unique IDs.
 */
export function createStarterVendorTasks(): VendorTask[] {
  const seed = Math.random().toString(36).substring(2, 7);
  const now = Date.now().toString(36);

  return [
    {
      id: `task-${now}-${seed}-1`,
      title: "Request or confirm quotation",
      description: "Receive itemized pricing proposal and review inclusions/exclusions.",
      completed: false,
    },
    {
      id: `task-${now}-${seed}-2`,
      title: "Confirm scope and deliverables",
      description: "Align on service hours, crew size, equipment, and specific milestones.",
      completed: false,
    },
    {
      id: `task-${now}-${seed}-3`,
      title: "Review and sign contract",
      description: "Check cancellation terms, overtime charges, and sign agreement.",
      completed: false,
    },
    {
      id: `task-${now}-${seed}-4`,
      title: "Record deposit payment",
      description: "Disburse agreed initial retainer deposit and save receipt.",
      completed: false,
    },
    {
      id: `task-${now}-${seed}-5`,
      title: "Confirm event-day arrival and logistics",
      description: "Share venue loading dock instructions, timing, and point-of-contact details.",
      completed: false,
    },
    {
      id: `task-${now}-${seed}-6`,
      title: "Record final payment",
      description: "Pay remaining invoice balance in accordance with contract terms.",
      completed: false,
    },
    {
      id: `task-${now}-${seed}-7`,
      title: "Confirm final deliverables",
      description: "Inspect post-event delivery (e.g. photo gallery, rental returns, equipment).",
      completed: false,
    },
  ];
}

/**
 * Checks whether an uncompleted task is overdue relative to referenceDate or today.
 */
export function isTaskOverdue(task: VendorTask, referenceDate?: Date): boolean {
  if (task.completed) return false;
  if (!task.dueDate) return false;
  return isMilestoneOverdue(task.dueDate, false, referenceDate);
}

/**
 * Computes authoritative progress and health metrics for a collection of vendors.
 */
export function calculateVendorMetrics(
  vendors: Vendor[],
  referenceDate?: Date
): VendorProgress {
  const totalVendors = vendors.length;
  let bookedVendors = 0;
  let shortlistedVendors = 0;
  let contactedVendors = 0;
  let cancelledVendors = 0;

  let totalTasks = 0;
  let completedTasks = 0;
  let outstandingTasks = 0;
  let overdueTasks = 0;
  let totalAgreedCost = 0;

  for (const v of vendors) {
    if (v.bookingStatus === "booked") bookedVendors++;
    else if (v.bookingStatus === "shortlisted") shortlistedVendors++;
    else if (v.bookingStatus === "contacted") contactedVendors++;
    else if (v.bookingStatus === "cancelled") cancelledVendors++;

    // Only count active (non-cancelled) vendors toward checklist & cost metrics
    if (v.bookingStatus !== "cancelled") {
      if (typeof v.cost === "number" && !isNaN(v.cost) && v.cost > 0) {
        totalAgreedCost += v.cost;
      }

      for (const t of v.checklist) {
        totalTasks++;
        if (t.completed) {
          completedTasks++;
        } else {
          outstandingTasks++;
          if (isTaskOverdue(t, referenceDate)) {
            overdueTasks++;
          }
        }
      }
    }
  }

  const overallCompletionRate =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return {
    totalVendors,
    bookedVendors,
    shortlistedVendors,
    contactedVendors,
    cancelledVendors,
    totalTasks,
    completedTasks,
    outstandingTasks,
    overdueTasks,
    overallCompletionRate,
    totalAgreedCost,
  };
}

export type VendorTaskFilter = "all" | "has_outstanding" | "has_overdue" | "all_completed";
export type VendorSortOption =
  | "name-asc"
  | "name-desc"
  | "cost-desc"
  | "cost-asc"
  | "status"
  | "category";

export interface VendorFilterOptions {
  searchQuery?: string;
  category?: VendorCategory | "all";
  bookingStatus?: BookingStatus | "all";
  taskFilter?: VendorTaskFilter;
  sortBy?: VendorSortOption;
}

/**
 * Filters and sorts vendors safely without mutating the original array.
 */
export function filterAndSortVendors(
  vendors: Vendor[],
  options: VendorFilterOptions,
  referenceDate?: Date
): Vendor[] {
  let list = [...vendors];

  // 1. Text search
  if (options.searchQuery && options.searchQuery.trim() !== "") {
    const q = options.searchQuery.trim().toLowerCase();
    list = list.filter((v) => {
      const matchName = v.name.toLowerCase().includes(q);
      const matchContact = v.contactName?.toLowerCase().includes(q) ?? false;
      const matchEmail = v.email?.toLowerCase().includes(q) ?? false;
      const matchPhone = v.phone?.toLowerCase().includes(q) ?? false;
      const matchNotes = v.notes?.toLowerCase().includes(q) ?? false;
      return matchName || matchContact || matchEmail || matchPhone || matchNotes;
    });
  }

  // 2. Category filter
  if (options.category && options.category !== "all") {
    list = list.filter((v) => v.category === options.category);
  }

  // 3. Booking status filter
  if (options.bookingStatus && options.bookingStatus !== "all") {
    list = list.filter((v) => v.bookingStatus === options.bookingStatus);
  }

  // 4. Task filter
  if (options.taskFilter && options.taskFilter !== "all") {
    list = list.filter((v) => {
      const incompleteCount = v.checklist.filter((t) => !t.completed).length;
      const overdueCount = v.checklist.filter((t) => isTaskOverdue(t, referenceDate)).length;

      if (options.taskFilter === "has_outstanding") {
        return incompleteCount > 0;
      }
      if (options.taskFilter === "has_overdue") {
        return overdueCount > 0;
      }
      if (options.taskFilter === "all_completed") {
        return v.checklist.length > 0 && incompleteCount === 0;
      }
      return true;
    });
  }

  // 5. Sorting
  const sort = options.sortBy || "name-asc";
  list.sort((a, b) => {
    if (sort === "name-asc") return a.name.localeCompare(b.name);
    if (sort === "name-desc") return b.name.localeCompare(a.name);
    if (sort === "cost-desc") return (b.cost || 0) - (a.cost || 0);
    if (sort === "cost-asc") return (a.cost || 0) - (b.cost || 0);
    if (sort === "category") return a.category.localeCompare(b.category);
    if (sort === "status") {
      const statusWeight: Record<BookingStatus, number> = {
        booked: 4,
        contacted: 3,
        shortlisted: 2,
        cancelled: 1,
      };
      return statusWeight[b.bookingStatus] - statusWeight[a.bookingStatus];
    }
    return 0;
  });

  return list;
}

