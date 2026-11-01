import { describe, it, expect } from "vitest";
import {
  calculateTimelineMetrics,
  filterAndSortMilestones,
  generateStarterMilestones,
  generateStarterSchedule,
  hasExistingMilestones,
  STARTER_MILESTONE_TEMPLATES,
} from "@/features/timeline/starter";
import {
  milestoneFormSchema,
  scheduleItemFormSchema,
  timelineMilestoneSchema,
} from "@/lib/schemas/timeline";
import { addDaysToIsoDate, daysBetween, isMilestoneOverdue } from "@/lib/utils/date";
import type { TimelineMilestone } from "@/types/event";

describe("Timeline Schemas Validation", () => {
  it("validates a complete valid milestone", () => {
    const valid = {
      id: "m-1",
      title: "Confirm Catering Menu",
      description: "Tasting session with banquet chef",
      targetDate: "2027-04-15",
      daysBeforeEvent: 61,
      category: "Catering",
      completed: false,
      time: "14:00",
      priority: "high" as const,
      status: "pending" as const,
    };

    const result = timelineMilestoneSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("applies sensible defaults for priority, description, and status", () => {
    const minimal = {
      id: "m-min",
      title: "Order Party Favors",
      targetDate: "2027-05-01",
      daysBeforeEvent: 45,
      category: "Favors",
    };

    const result = timelineMilestoneSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe("medium");
      expect(result.data.description).toBe("");
      expect(result.data.completed).toBe(false);
    }
  });

  it("rejects milestone with invalid calendar date or empty title", () => {
    const emptyTitle = {
      id: "m-bad",
      title: "   ",
      targetDate: "2027-05-01",
      daysBeforeEvent: 45,
      category: "Favors",
    };
    expect(timelineMilestoneSchema.safeParse(emptyTitle).success).toBe(false);

    const badDate = {
      id: "m-bad-date",
      title: "Floral Tasting",
      targetDate: "2027-02-31", // invalid date
      daysBeforeEvent: 45,
      category: "Decor",
    };
    expect(timelineMilestoneSchema.safeParse(badDate).success).toBe(false);
  });

  it("validates milestoneFormSchema and rejects invalid time strings", () => {
    const validForm = {
      title: "Soundcheck",
      description: "Microphone checks",
      targetDate: "2027-06-15",
      time: "09:30",
      category: "Audio",
      priority: "high" as const,
      status: "in_progress" as const,
    };
    expect(milestoneFormSchema.safeParse(validForm).success).toBe(true);

    const badTime = {
      ...validForm,
      time: "25:99",
    };
    expect(milestoneFormSchema.safeParse(badTime).success).toBe(false);
  });

  it("validates scheduleItemFormSchema and enforces non-reversed intervals", () => {
    const validSchedule = {
      title: "Cocktail Reception",
      startTime: "16:00",
      endTime: "17:30",
      description: "Passed hors d'oeuvres",
      location: "Terrace Garden",
    };
    expect(scheduleItemFormSchema.safeParse(validSchedule).success).toBe(true);

    const reversedSchedule = {
      ...validSchedule,
      startTime: "18:00",
      endTime: "17:00",
    };
    const result = scheduleItemFormSchema.safeParse(reversedSchedule);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("strictly after start time");
    }
  });
});

describe("Date Utilities & Overdue Boundary Cases", () => {
  const referenceDate = new Date("2027-06-01T12:00:00Z");

  it("adds and subtracts whole calendar days reliably", () => {
    expect(addDaysToIsoDate("2027-06-15", -14)).toBe("2027-06-01");
    expect(addDaysToIsoDate("2027-06-01", 14)).toBe("2027-06-15");
    expect(addDaysToIsoDate("2027-03-01", -1)).toBe("2027-02-28"); // Non-leap year
    expect(addDaysToIsoDate("2028-03-01", -1)).toBe("2028-02-29"); // Leap year
  });

  it("accurately detects overdue tasks relative to calendar today", () => {
    // Reference date: 2027-06-01
    // Task due yesterday: 2027-05-31 -> Overdue if not completed
    expect(isMilestoneOverdue("2027-05-31", false, referenceDate)).toBe(true);
    expect(isMilestoneOverdue("2027-05-31", "pending", referenceDate)).toBe(true);
    expect(isMilestoneOverdue("2027-05-31", "in_progress", referenceDate)).toBe(true);

    // If completed, never overdue even if targetDate is in past
    expect(isMilestoneOverdue("2027-05-31", true, referenceDate)).toBe(false);
    expect(isMilestoneOverdue("2027-05-31", "completed", referenceDate)).toBe(false);

    // Boundary: Due today (2027-06-01) -> NOT overdue
    expect(isMilestoneOverdue("2027-06-01", false, referenceDate)).toBe(false);

    // Due in future (2027-06-02) -> NOT overdue
    expect(isMilestoneOverdue("2027-06-02", false, referenceDate)).toBe(false);

    // Invalid targetDate string returns false
    expect(isMilestoneOverdue("invalid-date", false, referenceDate)).toBe(false);
  });
});

describe("Starter Milestone Generation & Duplicate Prevention", () => {
  const eventDate = "2027-06-15";

  it("generates wedding starter milestones with targetDate on or before eventDate", () => {
    const starter = generateStarterMilestones(eventDate, "wedding");
    expect(starter.length).toBe(STARTER_MILESTONE_TEMPLATES.wedding.length);

    for (const m of starter) {
      expect(m.targetDate <= eventDate).toBe(true);
      expect(m.daysBeforeEvent).toBeGreaterThanOrEqual(0);
      expect(daysBetween(m.targetDate, eventDate)).toBe(m.daysBeforeEvent);
      expect(m.completed).toBe(false);
      expect(m.status).toBe("pending");
    }

    // Earliest milestone is 180 days before
    expect(starter[0].daysBeforeEvent).toBe(180);
    // Last milestone is day of event
    expect(starter[starter.length - 1].daysBeforeEvent).toBe(0);
    expect(starter[starter.length - 1].targetDate).toBe(eventDate);
  });

  it("generates birthday starter milestones", () => {
    const starter = generateStarterMilestones(eventDate, "birthday");
    expect(starter.length).toBe(STARTER_MILESTONE_TEMPLATES.birthday.length);
    expect(starter[0].category).toBe("Venue & Concept");
  });

  it("generates community starter milestones and run sheet", () => {
    const starter = generateStarterMilestones(eventDate, "community");
    expect(starter.length).toBe(STARTER_MILESTONE_TEMPLATES.community.length);
    expect(starter[0].category).toBe("Permits & Governance");

    const schedule = generateStarterSchedule("community");
    expect(schedule.length).toBeGreaterThan(0);
    expect(schedule[0].startTime).toBe("07:30");
  });

  it("hasExistingMilestones returns true only when milestones array is non-empty", () => {
    expect(hasExistingMilestones([])).toBe(false);
    expect(hasExistingMilestones(undefined)).toBe(false);

    const mock: TimelineMilestone = {
      id: "m-1",
      title: "Sample",
      description: "",
      targetDate: "2027-06-15",
      daysBeforeEvent: 0,
      category: "General",
      completed: false,
    };
    expect(hasExistingMilestones([mock])).toBe(true);
  });
});

describe("Timeline Metrics Calculation", () => {
  const ref = new Date("2027-06-01T12:00:00Z");

  const sampleMilestones: TimelineMilestone[] = [
    {
      id: "m1",
      title: "Overdue Task",
      description: "",
      targetDate: "2027-05-15", // past relative to 2027-06-01
      daysBeforeEvent: 31,
      category: "Venue",
      completed: false,
      status: "pending",
    },
    {
      id: "m2",
      title: "Completed Past Task",
      description: "",
      targetDate: "2027-05-20",
      daysBeforeEvent: 26,
      category: "Catering",
      completed: true,
      status: "completed",
    },
    {
      id: "m3",
      title: "In Progress Upcoming Task",
      description: "",
      targetDate: "2027-06-05",
      daysBeforeEvent: 10,
      category: "Logistics",
      completed: false,
      status: "in_progress",
    },
    {
      id: "m4",
      title: "Pending Future Task",
      description: "",
      targetDate: "2027-06-15",
      daysBeforeEvent: 0,
      category: "Day-Of",
      completed: false,
      status: "pending",
    },
  ];

  it("calculates accurate milestone metrics including overdue count", () => {
    const metrics = calculateTimelineMetrics(sampleMilestones, ref);

    expect(metrics.total).toBe(4);
    expect(metrics.completed).toBe(1);
    expect(metrics.inProgress).toBe(1);
    expect(metrics.pending).toBe(2);
    expect(metrics.overdue).toBe(1); // Only m1 is overdue
    expect(metrics.completionPercentage).toBe(25); // 1 out of 4 = 25%
  });

  it("handles empty milestone collections gracefully", () => {
    const emptyMetrics = calculateTimelineMetrics([]);
    expect(emptyMetrics.total).toBe(0);
    expect(emptyMetrics.completed).toBe(0);
    expect(emptyMetrics.overdue).toBe(0);
    expect(emptyMetrics.completionPercentage).toBe(0);
  });
});

describe("Filter and Sort Milestones", () => {
  const ref = new Date("2027-06-01T12:00:00Z");

  const list: TimelineMilestone[] = [
    {
      id: "1",
      title: "B Milestone",
      description: "",
      targetDate: "2027-05-10",
      daysBeforeEvent: 36,
      category: "Venue",
      priority: "low",
      completed: false,
      status: "pending",
    },
    {
      id: "2",
      title: "A Milestone",
      description: "",
      targetDate: "2027-06-10",
      daysBeforeEvent: 5,
      category: "Catering",
      priority: "high",
      completed: true,
      status: "completed",
    },
    {
      id: "3",
      title: "C Milestone",
      description: "",
      targetDate: "2027-05-25",
      daysBeforeEvent: 21,
      category: "Venue",
      priority: "medium",
      completed: false,
      status: "in_progress",
    },
  ];

  it("filters by status correctly", () => {
    const pending = filterAndSortMilestones(list, { status: "pending", referenceDate: ref });
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe("1");

    const inProgress = filterAndSortMilestones(list, { status: "in_progress", referenceDate: ref });
    expect(inProgress).toHaveLength(1);
    expect(inProgress[0].id).toBe("3");

    const completed = filterAndSortMilestones(list, { status: "completed", referenceDate: ref });
    expect(completed).toHaveLength(1);
    expect(completed[0].id).toBe("2");

    const overdue = filterAndSortMilestones(list, { status: "overdue", referenceDate: ref });
    // ID 1 and 3 are in the past (< 2027-06-01) and not completed
    expect(overdue).toHaveLength(2);
  });

  it("filters by category", () => {
    const venueOnly = filterAndSortMilestones(list, { category: "Venue" });
    expect(venueOnly).toHaveLength(2);
  });

  it("sorts by date-asc, date-desc, and priority", () => {
    const asc = filterAndSortMilestones(list, { sortBy: "date-asc" });
    expect(asc[0].targetDate).toBe("2027-05-10");
    expect(asc[2].targetDate).toBe("2027-06-10");

    const desc = filterAndSortMilestones(list, { sortBy: "date-desc" });
    expect(desc[0].targetDate).toBe("2027-06-10");
    expect(desc[2].targetDate).toBe("2027-05-10");

    const byPriority = filterAndSortMilestones(list, { sortBy: "priority" });
    expect(byPriority[0].priority).toBe("high");
    expect(byPriority[1].priority).toBe("medium");
    expect(byPriority[2].priority).toBe("low");
  });
});

