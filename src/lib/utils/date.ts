/**
 * Pure date and time utilities for event planning.
 * Deterministic, timezone-safe calendar calculations.
 */

import { EVENT_LIMITS } from "@/lib/constants/limits";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Parses an ISO date string (YYYY-MM-DD) into year, month, and day components.
 * Returns null if the format is invalid or if the date is not a real calendar date (e.g. 2026-02-31).
 */
export function parseIsoDate(
  dateString: string
): { year: number; month: number; day: number } | null {
  if (!dateString || typeof dateString !== "string" || !ISO_DATE_REGEX.test(dateString)) {
    return null;
  }

  const [yearStr, monthStr, dayStr] = dateString.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  // Verify against Date.UTC to detect rollover (e.g. Feb 30 -> Mar 2)
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

/**
 * Checks whether an input is a valid calendar date string in YYYY-MM-DD format.
 */
export function isValidCalendarDate(dateString: string): boolean {
  return parseIsoDate(dateString) !== null;
}

/**
 * Formats a Date object into an unambiguous YYYY-MM-DD string using UTC or local time.
 */
export function formatIsoDate(date: Date, useUtc = false): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error("Invalid Date instance provided to formatIsoDate");
  }

  if (useUtc) {
    return date.toISOString().split("T")[0];
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns today's date formatted as YYYY-MM-DD.
 */
export function getTodayIsoDate(referenceDate?: Date): string {
  const ref = referenceDate ?? new Date();
  return formatIsoDate(ref);
}

/**
 * Validates that an event date is today or in the future based on calendar comparison.
 * Avoids timezone off-by-one errors by comparing calendar strings directly.
 */
export function isFutureOrToday(dateString: string, referenceDate?: Date): boolean {
  if (!isValidCalendarDate(dateString)) {
    return false;
  }
  const today = getTodayIsoDate(referenceDate);
  return dateString >= today;
}

/**
 * Validates that an event date is within the maximum supported planning horizon (e.g. 10 years).
 */
export function isWithinFutureHorizon(
  dateString: string,
  maxYears: number = EVENT_LIMITS.MAX_YEARS_IN_FUTURE,
  referenceDate?: Date
): boolean {
  if (!isValidCalendarDate(dateString)) {
    return false;
  }
  const ref = referenceDate ?? new Date();
  const maxYear = ref.getFullYear() + maxYears;
  const month = String(ref.getMonth() + 1).padStart(2, "0");
  const day = String(ref.getDate()).padStart(2, "0");
  const maxDateStr = `${maxYear}-${month}-${day}`;
  return dateString <= maxDateStr;
}

/**
 * Calculates the number of whole days between two ISO date strings (endDate - startDate).
 * Returns positive if endDate is in the future relative to startDate.
 */
export function daysBetween(startDateStr: string, endDateStr: string): number {
  const start = parseIsoDate(startDateStr);
  const end = parseIsoDate(endDateStr);

  if (!start || !end) {
    throw new Error(`Invalid date string in daysBetween: "${startDateStr}" or "${endDateStr}"`);
  }

  const startUtc = Date.UTC(start.year, start.month - 1, start.day);
  const endUtc = Date.UTC(end.year, end.month - 1, end.day);
  const diffMs = endUtc - startUtc;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Adds or subtracts whole calendar days to an ISO date string (YYYY-MM-DD).
 * Deterministic and timezone-safe via Date.UTC.
 */
export function addDaysToIsoDate(isoDateStr: string, daysDelta: number): string {
  const parsed = parseIsoDate(isoDateStr);
  if (!parsed) {
    throw new Error(`Invalid ISO date string in addDaysToIsoDate: "${isoDateStr}"`);
  }
  const utcDate = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + daysDelta));
  return formatIsoDate(utcDate, true);
}

/**
 * Checks whether a milestone target date is overdue relative to today's date.
 * Completed tasks are never considered overdue.
 */
export function isMilestoneOverdue(
  targetDate: string,
  completedOrStatus: boolean | string,
  referenceDate?: Date
): boolean {
  const isDone =
    typeof completedOrStatus === "boolean"
      ? completedOrStatus
      : completedOrStatus === "completed";
  if (isDone) return false;
  if (!isValidCalendarDate(targetDate)) return false;
  const today = getTodayIsoDate(referenceDate);
  return targetDate < today;
}

/**
 * Validates a preparation milestone date against the target event date.
 * Preparation milestones must be on or before the event date.
 */
export function isMilestoneDateValidForEvent(
  milestoneDateStr: string,
  eventDateStr: string
): boolean {
  if (!isValidCalendarDate(milestoneDateStr) || !isValidCalendarDate(eventDateStr)) {
    return false;
  }
  return milestoneDateStr <= eventDateStr;
}

/**
 * Checks if a string matches 24-hour time format (HH:mm, 00:00 to 23:59).
 */
export function isValidTimeString(timeStr: string): boolean {
  if (!timeStr || typeof timeStr !== "string") {
    return false;
  }
  return TIME_24H_REGEX.test(timeStr);
}

/**
 * Converts HH:mm time string into total minutes since midnight (0 - 1439).
 * Returns null if invalid time.
 */
export function parseTimeToMinutes(timeStr: string): number | null {
  if (!isValidTimeString(timeStr)) {
    return null;
  }
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Calculates duration in minutes between two HH:mm times.
 * Returns null if times are invalid or reversed (start >= end).
 */
export function calculateTimeIntervalDuration(
  startTimeStr: string,
  endTimeStr: string
): number | null {
  const start = parseTimeToMinutes(startTimeStr);
  const end = parseTimeToMinutes(endTimeStr);

  if (start === null || end === null || end <= start) {
    return null;
  }

  return end - start;
}

