/**
 * Vendor Checklist and Task Management Utilities for CelebrAI.
 * Pure functions for task validation, progress calculation, and status tracking.
 */

import { CHECKLIST_PRIORITIES, CHECKLIST_STATUSES } from "@/lib/constants/limits";
import { isValidCalendarDate } from "@/lib/utils/date";
import type {
  ChecklistPriority,
  ChecklistProgress,
  ChecklistStatus,
  ChecklistTask,
} from "@/types/event";

/**
 * Type guard to check if an unknown value is a valid ChecklistStatus.
 */
export function isValidTaskStatus(status: unknown): status is ChecklistStatus {
  return typeof status === "string" && CHECKLIST_STATUSES.includes(status as ChecklistStatus);
}

/**
 * Type guard to check if an unknown value is a valid ChecklistPriority.
 */
export function isValidTaskPriority(priority: unknown): priority is ChecklistPriority {
  return (
    typeof priority === "string" && CHECKLIST_PRIORITIES.includes(priority as ChecklistPriority)
  );
}

export interface ChecklistValidationResult {
  valid: boolean;
  errors: string[];
  validatedTasks: ChecklistTask[];
}

/**
 * Validates an array of checklist tasks against schema and domain rules.
 */
export function validateChecklistTasks(tasks: unknown[]): ChecklistValidationResult {
  if (!Array.isArray(tasks)) {
    return {
      valid: false,
      errors: ["Checklist tasks must be provided as an array."],
      validatedTasks: [],
    };
  }

  const taskErrors: string[] = [];
  const validItems: ChecklistTask[] = [];

  tasks.forEach((task, index) => {
    if (!task || typeof task !== "object") {
      taskErrors.push(`Task at index ${index} must be an object.`);
      return;
    }

    const t = task as Record<string, unknown>;
    let itemHasError = false;

    if (!t.id || typeof t.id !== "string") {
      taskErrors.push(`Task at index ${index} is missing a valid string id.`);
      itemHasError = true;
    }

    if (!t.title || typeof t.title !== "string" || !t.title.trim()) {
      taskErrors.push(`Task at index ${index} is missing a valid title.`);
      itemHasError = true;
    }

    if (!t.category || typeof t.category !== "string" || !t.category.trim()) {
      taskErrors.push(`Task at index ${index} is missing a valid category.`);
      itemHasError = true;
    }

    if (!isValidTaskStatus(t.status)) {
      taskErrors.push(
        `Task "${t.title || index}" has invalid status "${t.status}". Expected one of: ${CHECKLIST_STATUSES.join(", ")}.`
      );
      itemHasError = true;
    }

    if (!isValidTaskPriority(t.priority)) {
      taskErrors.push(
        `Task "${t.title || index}" has invalid priority "${t.priority}". Expected one of: ${CHECKLIST_PRIORITIES.join(", ")}.`
      );
      itemHasError = true;
    }

    if (t.dueDate !== undefined && t.dueDate !== null && t.dueDate !== "") {
      if (typeof t.dueDate !== "string" || !isValidCalendarDate(t.dueDate)) {
        taskErrors.push(
          `Task "${t.title || index}" has invalid dueDate "${t.dueDate}". Expected YYYY-MM-DD.`
        );
        itemHasError = true;
      }
    }

    if (!itemHasError) {
      validItems.push(t as unknown as ChecklistTask);
    }
  });

  const isValid = taskErrors.length === 0;

  return {
    valid: isValid,
    errors: taskErrors,
    validatedTasks: isValid ? validItems : [],
  };
}

/**
 * Pure function to calculate progress metrics for a vendor checklist.
 * Returns totals, status counts, completion rate (0-100), and breakdowns by priority and category.
 */
export function calculateChecklistProgress(tasks: ChecklistTask[]): ChecklistProgress {
  const total = tasks.length;
  let completed = 0;
  let inProgress = 0;
  let pending = 0;
  let cancelled = 0;

  const byPriority: Record<ChecklistPriority, { total: number; completed: number }> = {
    high: { total: 0, completed: 0 },
    medium: { total: 0, completed: 0 },
    low: { total: 0, completed: 0 },
  };

  const byCategory: Record<string, { total: number; completed: number }> = {};

  for (const task of tasks) {
    // Status counts
    if (task.status === "completed") {
      completed++;
    } else if (task.status === "in_progress") {
      inProgress++;
    } else if (task.status === "cancelled") {
      cancelled++;
    } else {
      pending++;
    }

    // Priority breakdown
    if (isValidTaskPriority(task.priority)) {
      byPriority[task.priority].total++;
      if (task.status === "completed") {
        byPriority[task.priority].completed++;
      }
    }

    // Category breakdown
    const categoryKey = task.category || "General";
    if (!byCategory[categoryKey]) {
      byCategory[categoryKey] = { total: 0, completed: 0 };
    }
    byCategory[categoryKey].total++;
    if (task.status === "completed") {
      byCategory[categoryKey].completed++;
    }
  }

  // Completion rate percentage (rounded to whole number, 0 when total is 0)
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
  const isComplete = total > 0 && completed === total;

  return {
    total,
    completed,
    inProgress,
    pending,
    cancelled,
    completionRate,
    isComplete,
    byPriority,
    byCategory,
  };
}

/**
 * Filter tasks by status.
 */
export function filterTasksByStatus(
  tasks: ChecklistTask[],
  status: ChecklistStatus
): ChecklistTask[] {
  return tasks.filter((t) => t.status === status);
}

/**
 * Filter tasks by priority.
 */
export function filterTasksByPriority(
  tasks: ChecklistTask[],
  priority: ChecklistPriority
): ChecklistTask[] {
  return tasks.filter((t) => t.priority === priority);
}

/**
 * Filter tasks by category.
 */
export function filterTasksByCategory(
  tasks: ChecklistTask[],
  category: string
): ChecklistTask[] {
  return tasks.filter((t) => t.category.toLowerCase() === category.toLowerCase());
}
