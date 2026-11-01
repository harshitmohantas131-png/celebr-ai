import { describe, it, expect } from "vitest";
import {
  validatePreparationMilestones,
  validateScheduleItem,
  validateSchedule,
} from "@/features/timeline";
import {
  calculateChecklistProgress,
  isValidTaskPriority,
  isValidTaskStatus,
  validateChecklistTasks,
  filterTasksByStatus,
  filterTasksByPriority,
  filterTasksByCategory,
} from "@/features/vendors";
import type { ChecklistTask, ScheduleItem, TimelineMilestone } from "@/types/event";

describe("Timeline & Preparation Milestones", () => {
  const eventDate = "2027-06-15";

  const validMilestones: TimelineMilestone[] = [
    {
      id: "m1",
      title: "Reserve Venue & Caterer",
      description: "Secure the vineyard hall deposit",
      targetDate: "2026-12-15",
      daysBeforeEvent: 182,
      category: "Venue",
      completed: true,
    },
    {
      id: "m2",
      title: "Send Formal Invitations",
      description: "Mail physical invites with RSVP cards",
      targetDate: "2027-03-15",
      daysBeforeEvent: 92,
      category: "Guest Management",
      completed: false,
    },
    {
      id: "m3",
      title: "Final Rehearsal Dinner",
      description: "Walkthrough with wedding party",
      targetDate: "2027-06-14",
      daysBeforeEvent: 1,
      category: "Rehearsal",
      completed: false,
    },
  ];

  it("validates milestones scheduled on or before event date", () => {
    const result = validatePreparationMilestones(validMilestones, eventDate);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.sortedMilestones).toHaveLength(3);
    // Verifies chronological sorting
    expect(result.sortedMilestones[0].targetDate).toBe("2026-12-15");
    expect(result.sortedMilestones[2].targetDate).toBe("2027-06-14");
  });

  it("allows milestone on the exact day of the event", () => {
    const dayOfMilestone: TimelineMilestone = {
      id: "m-day-of",
      title: "Morning Venue Setup Inspection",
      description: "Check table arrangements",
      targetDate: "2027-06-15",
      daysBeforeEvent: 0,
      category: "Logistics",
      completed: false,
    };

    const result = validatePreparationMilestones([dayOfMilestone], eventDate);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects milestone scheduled after the event date", () => {
    const postEventMilestone: TimelineMilestone = {
      id: "m-post",
      title: "Post-Event Brunch",
      description: "Next day gathering",
      targetDate: "2027-06-16", // 1 day AFTER event
      daysBeforeEvent: 0,
      category: "Hospitality",
      completed: false,
    };

    const result = validatePreparationMilestones([postEventMilestone], eventDate);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("cannot be after the event date");
  });

  it("rejects milestone with invalid calendar date", () => {
    const invalidDateMilestone: TimelineMilestone = {
      id: "m-inv",
      title: "Floral Tasting",
      description: "Sample table runners",
      targetDate: "2027-02-31", // Impossible calendar date
      daysBeforeEvent: 100,
      category: "Decor",
      completed: false,
    };

    const result = validatePreparationMilestones([invalidDateMilestone], eventDate);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("invalid target date");
  });

  it("rejects invalid event date", () => {
    const result = validatePreparationMilestones(validMilestones, "invalid-event-date");
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("not a valid ISO calendar date");
  });
});

describe("Schedule Validation (Event-Day Run-of-Show)", () => {
  it("validates valid chronological schedule item", () => {
    const item: ScheduleItem = {
      id: "s1",
      title: "Guest Arrival & Welcome Drinks",
      startTime: "13:30",
      endTime: "14:15",
      description: "String quartet plays in the courtyard",
    };

    const result = validateScheduleItem(item);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.durationMinutes).toBe(45);
  });

  it("rejects reversed schedule interval (start time after end time)", () => {
    const reversedItem: ScheduleItem = {
      id: "s2",
      title: "Cocktail Hour",
      startTime: "17:00",
      endTime: "16:00", // 1 hour earlier than start
      description: "Drinks and appetizers",
    };

    const result = validateScheduleItem(reversedItem);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("reversed interval");
  });

  it("rejects zero-duration schedule interval (identical start and end)", () => {
    const zeroDurationItem: ScheduleItem = {
      id: "s3",
      title: "Cake Cutting",
      startTime: "20:00",
      endTime: "20:00",
      description: "Short photo moment",
    };

    const result = validateScheduleItem(zeroDurationItem);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("zero duration");
  });

  it("rejects malformed 24-hour time strings", () => {
    const badTimeItem: ScheduleItem = {
      id: "s4",
      title: "First Dance",
      startTime: "25:00", // Invalid hour
      endTime: "26:00",
      description: "Couple takes the floor",
    };

    const result = validateScheduleItem(badTimeItem);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("invalid start time");
  });

  it("validates whole schedule and detects overlapping intervals", () => {
    const schedule: ScheduleItem[] = [
      {
        id: "s1",
        title: "Ceremony",
        startTime: "14:00",
        endTime: "15:00",
        description: "Outdoor lawn",
      },
      {
        id: "s2",
        title: "Photo Session",
        startTime: "14:45", // Overlaps with Ceremony (14:00 - 15:00)
        endTime: "15:45",
        description: "Garden terrace",
      },
    ];

    const result = validateSchedule(schedule);
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("overlaps with");
    expect(result.totalDurationMinutes).toBe(120);
  });
});

describe("Checklist Utilities & Progress Tracking", () => {
  it("handles empty checklist correctly", () => {
    const progress = calculateChecklistProgress([]);
    expect(progress.total).toBe(0);
    expect(progress.completed).toBe(0);
    expect(progress.completionRate).toBe(0);
    expect(progress.isComplete).toBe(false);
  });

  it("calculates partial completion progress accurately", () => {
    const tasks: ChecklistTask[] = [
      { id: "1", title: "Task 1", category: "Venue", status: "completed", priority: "high" },
      { id: "2", title: "Task 2", category: "Venue", status: "completed", priority: "high" },
      { id: "3", title: "Task 3", category: "Decor", status: "in_progress", priority: "medium" },
      { id: "4", title: "Task 4", category: "Catering", status: "pending", priority: "low" },
    ];

    const progress = calculateChecklistProgress(tasks);
    expect(progress.total).toBe(4);
    expect(progress.completed).toBe(2);
    expect(progress.inProgress).toBe(1);
    expect(progress.pending).toBe(1);
    expect(progress.completionRate).toBe(50); // 2 / 4 = 50%
    expect(progress.isComplete).toBe(false);

    // Priorities
    expect(progress.byPriority.high.total).toBe(2);
    expect(progress.byPriority.high.completed).toBe(2);
    expect(progress.byPriority.medium.total).toBe(1);
    expect(progress.byPriority.medium.completed).toBe(0);

    // Categories
    expect(progress.byCategory["Venue"].total).toBe(2);
    expect(progress.byCategory["Venue"].completed).toBe(2);
    expect(progress.byCategory["Decor"].total).toBe(1);
  });

  it("handles 100% completed checklist", () => {
    const tasks: ChecklistTask[] = [
      { id: "1", title: "T1", category: "Logistics", status: "completed", priority: "high" },
      { id: "2", title: "T2", category: "Logistics", status: "completed", priority: "medium" },
    ];

    const progress = calculateChecklistProgress(tasks);
    expect(progress.completionRate).toBe(100);
    expect(progress.isComplete).toBe(true);
  });

  it("validates checklist task status and priority guards", () => {
    expect(isValidTaskStatus("pending")).toBe(true);
    expect(isValidTaskStatus("in_progress")).toBe(true);
    expect(isValidTaskStatus("completed")).toBe(true);
    expect(isValidTaskStatus("cancelled")).toBe(true);
    expect(isValidTaskStatus("unknown_status")).toBe(false);
    expect(isValidTaskStatus(123)).toBe(false);

    expect(isValidTaskPriority("high")).toBe(true);
    expect(isValidTaskPriority("medium")).toBe(true);
    expect(isValidTaskPriority("low")).toBe(true);
    expect(isValidTaskPriority("urgent")).toBe(false);
  });

  it("validates raw checklist task arrays rejecting invalid entries", () => {
    const rawTasks = [
      {
        id: "valid-1",
        title: "Book band",
        category: "Music",
        status: "pending",
        priority: "high",
      },
      {
        id: "invalid-status",
        title: "Hire DJ",
        category: "Music",
        status: "waiting_for_contract", // Invalid status
        priority: "high",
      },
      {
        id: "invalid-priority",
        title: "Buy favors",
        category: "Favors",
        status: "pending",
        priority: "critical", // Invalid priority
      },
    ];

    const result = validateChecklistTasks(rawTasks);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    expect(result.validatedTasks).toHaveLength(0);
  });

  it("filters checklist tasks correctly by status, priority, and category", () => {
    const tasks: ChecklistTask[] = [
      { id: "1", title: "Task 1", category: "Venue", status: "completed", priority: "high" },
      { id: "2", title: "Task 2", category: "Venue", status: "pending", priority: "low" },
      { id: "3", title: "Task 3", category: "Catering", status: "in_progress", priority: "high" },
    ];

    expect(filterTasksByStatus(tasks, "completed")).toHaveLength(1);
    expect(filterTasksByPriority(tasks, "high")).toHaveLength(2);
    expect(filterTasksByCategory(tasks, "venue")).toHaveLength(2);
  });
});

