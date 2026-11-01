/**
 * Timeline and Schedule Validation Utilities for CelebrAI.
 * Pure, reusable functions for milestone scheduling and event-day run-of-show validation.
 */

import {
  calculateTimeIntervalDuration,
  daysBetween,
  isValidCalendarDate,
  isValidTimeString,
  parseTimeToMinutes,
} from "@/lib/utils/date";
import type { ScheduleItem, TimelineMilestone } from "@/types/event";

export interface MilestoneValidationResult {
  valid: boolean;
  errors: string[];
  sortedMilestones: TimelineMilestone[];
}

export interface ScheduleItemValidationResult {
  valid: boolean;
  errors: string[];
  durationMinutes: number;
}

export interface ScheduleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  totalDurationMinutes: number;
  sortedSchedule: ScheduleItem[];
}

/**
 * Validates preparation milestone dates against the target event date.
 * Enforces that milestones precede or align with the event date (no milestones after event).
 */
export function validatePreparationMilestones(
  milestones: TimelineMilestone[],
  eventDate: string
): MilestoneValidationResult {
  const errors: string[] = [];

  if (!isValidCalendarDate(eventDate)) {
    return {
      valid: false,
      errors: [`Target event date "${eventDate}" is not a valid ISO calendar date (YYYY-MM-DD).`],
      sortedMilestones: [...milestones],
    };
  }

  const validatedMilestones = milestones.map((m) => {
    if (!m.title || !m.title.trim()) {
      errors.push(`Milestone ID "${m.id}" is missing a title.`);
    }

    if (!isValidCalendarDate(m.targetDate)) {
      errors.push(`Milestone "${m.title || m.id}" has invalid target date "${m.targetDate}".`);
      return m;
    }

    // Milestone date must be on or before the event date
    if (m.targetDate > eventDate) {
      errors.push(
        `Milestone "${m.title}" target date (${m.targetDate}) cannot be after the event date (${eventDate}).`
      );
    }

    // Check daysBeforeEvent alignment
    const actualDaysBefore = daysBetween(m.targetDate, eventDate);
    if (m.daysBeforeEvent < 0) {
      errors.push(
        `Milestone "${m.title}" has invalid negative daysBeforeEvent (${m.daysBeforeEvent}).`
      );
    } else if (m.daysBeforeEvent !== actualDaysBefore) {
      // Return normalized milestone with correct daysBeforeEvent
      return {
        ...m,
        daysBeforeEvent: actualDaysBefore,
      };
    }

    return m;
  });

  // Sort milestones chronologically (earliest to latest)
  const sortedMilestones = [...validatedMilestones].sort((a, b) =>
    a.targetDate.localeCompare(b.targetDate)
  );

  return {
    valid: errors.length === 0,
    errors,
    sortedMilestones,
  };
}

/**
 * Validates an individual event-day schedule entry.
 * Checks for valid 24h format and non-reversed, non-zero intervals.
 */
export function validateScheduleItem(item: ScheduleItem): ScheduleItemValidationResult {
  const errors: string[] = [];

  if (!item.title || !item.title.trim()) {
    errors.push(`Schedule item ID "${item.id}" is missing a title.`);
  }

  const isStartValid = isValidTimeString(item.startTime);
  const isEndValid = isValidTimeString(item.endTime);

  if (!isStartValid) {
    errors.push(
      `Schedule item "${item.title || item.id}" has invalid start time "${item.startTime}". Expected HH:mm.`
    );
  }
  if (!isEndValid) {
    errors.push(
      `Schedule item "${item.title || item.id}" has invalid end time "${item.endTime}". Expected HH:mm.`
    );
  }

  if (!isStartValid || !isEndValid) {
    return { valid: false, errors, durationMinutes: 0 };
  }

  const startMinutes = parseTimeToMinutes(item.startTime)!;
  const endMinutes = parseTimeToMinutes(item.endTime)!;

  if (startMinutes === endMinutes) {
    errors.push(
      `Schedule item "${item.title}" has zero duration: start and end times are identical (${item.startTime}).`
    );
  } else if (startMinutes > endMinutes) {
    errors.push(
      `Schedule item "${item.title}" has reversed interval: start time (${item.startTime}) is after end time (${item.endTime}).`
    );
  }

  const duration = calculateTimeIntervalDuration(item.startTime, item.endTime) ?? 0;

  return {
    valid: errors.length === 0,
    errors,
    durationMinutes: duration,
  };
}

/**
 * Validates the complete event-day schedule.
 * Detects reversed intervals, missing titles, and overlapping intervals.
 */
export function validateSchedule(items: ScheduleItem[]): ScheduleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let totalDurationMinutes = 0;

  const validatedItems: ScheduleItem[] = [];

  for (const item of items) {
    const itemResult = validateScheduleItem(item);
    if (!itemResult.valid) {
      errors.push(...itemResult.errors);
    } else {
      totalDurationMinutes += itemResult.durationMinutes;
      validatedItems.push(item);
    }
  }

  // Sort schedule items by start time
  const sortedSchedule = [...validatedItems].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  // Check for overlapping intervals
  for (let i = 0; i < sortedSchedule.length - 1; i++) {
    const current = sortedSchedule[i];
    const next = sortedSchedule[i + 1];

    const currentEndMin = parseTimeToMinutes(current.endTime);
    const nextStartMin = parseTimeToMinutes(next.startTime);

    if (currentEndMin !== null && nextStartMin !== null && nextStartMin < currentEndMin) {
      warnings.push(
        `Schedule overlap: "${current.title}" (${current.startTime}–${current.endTime}) overlaps with "${next.title}" (${next.startTime}–${next.endTime}).`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    totalDurationMinutes,
    sortedSchedule,
  };
}

