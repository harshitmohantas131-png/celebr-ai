/**
 * Starter Timeline & Schedule Generation for CelebrAI.
 * Generates sensible, chronological milestones and day-of run sheet items based on event type and date.
 */

import { addDaysToIsoDate, daysBetween, isMilestoneOverdue } from "@/lib/utils/date";
import type {
  EventType,
  MilestonePriority,
  ScheduleItem,
  TimelineMilestone,
} from "@/types/event";

export interface StarterMilestoneTemplate {
  daysBeforeEvent: number;
  title: string;
  description: string;
  category: string;
  priority: MilestonePriority;
}

export interface StarterScheduleTemplate {
  startTime: string;
  endTime: string;
  title: string;
  description: string;
  location?: string;
  responsibleRole?: string;
}

/**
 * Curated starter milestones tailored by celebration archetype.
 */
export const STARTER_MILESTONE_TEMPLATES: Record<EventType, StarterMilestoneTemplate[]> = {
  wedding: [
    {
      daysBeforeEvent: 180,
      title: "Secure Primary Venue & Date Confirmation",
      description: "Finalize venue contract, deposit, and secure ceremonial permissions.",
      category: "Venue & Ceremony",
      priority: "high",
    },
    {
      daysBeforeEvent: 120,
      title: "Book Lead Photographer & Caterer",
      description: "Taste sample menus, confirm dietary offerings, and reserve visual media.",
      category: "Catering & Media",
      priority: "high",
    },
    {
      daysBeforeEvent: 90,
      title: "Send Formal Invitations & Launch RSVP Registry",
      description: "Distribute invitations with dietary collection forms and deadline details.",
      category: "Guest Coordination",
      priority: "medium",
    },
    {
      daysBeforeEvent: 60,
      title: "Finalize Decor, Florals & Lighting Concepts",
      description: "Lock in floral styling, tablescapes, and ambient lighting arrangements.",
      category: "Decor & Styling",
      priority: "medium",
    },
    {
      daysBeforeEvent: 30,
      title: "Assemble Final Guest List & Seating Layout",
      description: "Tally confirmed RSVPs, dietary needs, and map out table assignments.",
      category: "Logistics",
      priority: "high",
    },
    {
      daysBeforeEvent: 14,
      title: "Conduct Final On-Site Vendor Walkthrough",
      description: "Review load-in schedules, sound check times, and venue power access.",
      category: "Logistics",
      priority: "medium",
    },
    {
      daysBeforeEvent: 7,
      title: "Finalize Event-Day Master Run Sheet",
      description: "Distribute minute-by-minute schedule to coordinators, MC, and wedding party.",
      category: "Day-Of Planning",
      priority: "high",
    },
    {
      daysBeforeEvent: 1,
      title: "Wedding Rehearsal & Emergency Kit Packout",
      description: "Walk through ceremony cues and pack emergency apparel/first-aid supplies.",
      category: "Rehearsal",
      priority: "high",
    },
    {
      daysBeforeEvent: 0,
      title: "Day-Of Wedding Coordination & Reception",
      description: "Oversee vendor arrival, ceremony kickoff, toasts, and evening celebration.",
      category: "Day-Of",
      priority: "high",
    },
  ],

  birthday: [
    {
      daysBeforeEvent: 60,
      title: "Establish Party Theme & Reserve Venue",
      description: "Define aesthetic concept, guest capacity, and book activity or dining venue.",
      category: "Venue & Concept",
      priority: "high",
    },
    {
      daysBeforeEvent: 45,
      title: "Distribute Digital Invitations & Collect RSVPs",
      description: "Send theme-styled invites and track headcount for catering requirements.",
      category: "Invitations",
      priority: "medium",
    },
    {
      daysBeforeEvent: 30,
      title: "Book Entertainment, DJ, or Performers",
      description: "Reserve live music, DJ, photobooth, or entertainer tailored to birthday host.",
      category: "Entertainment",
      priority: "medium",
    },
    {
      daysBeforeEvent: 14,
      title: "Order Custom Celebration Cake & Favors",
      description: "Finalize bakery flavor, cake message, and guest takeaway party favors.",
      category: "Catering & Favors",
      priority: "high",
    },
    {
      daysBeforeEvent: 7,
      title: "Confirm Final Headcount & Playlist",
      description: "Provide caterer with final numbers and curate playlist with birthday host's favorites.",
      category: "Coordination",
      priority: "medium",
    },
    {
      daysBeforeEvent: 1,
      title: "Pick Up Decor & Assemble Display Elements",
      description: "Collect balloon arches, signage, banners, and prepare display tables.",
      category: "Setup",
      priority: "medium",
    },
    {
      daysBeforeEvent: 0,
      title: "Host Birthday Celebration & Cake Cutting",
      description: "Welcome guests, orchestrate activities, group photos, and birthday toast.",
      category: "Day-Of",
      priority: "high",
    },
  ],

  community: [
    {
      daysBeforeEvent: 90,
      title: "Form Committee & Apply for Municipal Permits",
      description: "Obtain park/street permits, amplify sound waivers, and organize team.",
      category: "Permits & Governance",
      priority: "high",
    },
    {
      daysBeforeEvent: 60,
      title: "Reserve Public Venue & Facility Amenities",
      description: "Lock in event grounds, restrooms, parking areas, and stage infrastructure.",
      category: "Venue & Infrastructure",
      priority: "high",
    },
    {
      daysBeforeEvent: 45,
      title: "Recruit Volunteers & Launch Community Outreach",
      description: "Open volunteer registrations and publicize event via neighborhood channels.",
      category: "Publicity & Volunteers",
      priority: "medium",
    },
    {
      daysBeforeEvent: 30,
      title: "Onboard Food Trucks, Vendors & Activity Booths",
      description: "Coordinate vendor stall assignments, health permits, and power requirements.",
      category: "Vendors & Activities",
      priority: "medium",
    },
    {
      daysBeforeEvent: 14,
      title: "Review Safety, Sanitation & Signage Plan",
      description: "Confirm first-aid station, waste collection bins, and directional signs.",
      category: "Safety & Logistics",
      priority: "high",
    },
    {
      daysBeforeEvent: 7,
      title: "Publish Master Run-of-Show & Volunteer Brief",
      description: "Brief volunteer leads on shift rotations, check-in desks, and emergency protocols.",
      category: "Coordination",
      priority: "high",
    },
    {
      daysBeforeEvent: 1,
      title: "Grounds Setup, Canopy & Audio-Visual Rigging",
      description: "Erect canopies, test sound systems, position barricades, and stage tables.",
      category: "Setup",
      priority: "high",
    },
    {
      daysBeforeEvent: 0,
      title: "Community Event Kickoff & Live Operations",
      description: "Open gates, coordinate stage lineup, oversee booth rotations, and closeout.",
      category: "Day-Of",
      priority: "high",
    },
  ],
};

/**
 * Starter day-of run-of-show schedule templates.
 */
export const STARTER_SCHEDULE_TEMPLATES: Record<EventType, StarterScheduleTemplate[]> = {
  wedding: [
    {
      startTime: "09:00",
      endTime: "11:30",
      title: "Bridal Party Preparation & Hair/Makeup",
      description: "Getting ready in hospitality suite; photographer captures prep details.",
      location: "Bridal Suite",
      responsibleRole: "Lead Stylist / Maid of Honor",
    },
    {
      startTime: "11:30",
      endTime: "13:00",
      title: "First Look & Couple Portrait Session",
      description: "Private first look in garden followed by wedding party photographs.",
      location: "Vineyard Lawn",
      responsibleRole: "Lead Photographer",
    },
    {
      startTime: "13:30",
      endTime: "14:00",
      title: "Guest Arrival & Pre-Ceremony Prelude Music",
      description: "Ushers seat arriving guests; string quartet performs acoustic prelude.",
      location: "Ceremony Pavilion",
      responsibleRole: "Lead Usher / Coordinator",
    },
    {
      startTime: "14:00",
      endTime: "14:45",
      title: "Wedding Ceremony & Exchange of Vows",
      description: "Processional, vow exchange, ring presentation, and ceremonial pronouncement.",
      location: "Ceremony Pavilion",
      responsibleRole: "Officiant",
    },
    {
      startTime: "14:45",
      endTime: "16:00",
      title: "Cocktail Hour & Passed Hors d'oeuvres",
      description: "Guests enjoy signature cocktails and appetizers while family portraits wrap up.",
      location: "Terrace Garden",
      responsibleRole: "Catering Captain",
    },
    {
      startTime: "16:00",
      endTime: "18:00",
      title: "Grand Entrance & Plated Dinner Service",
      description: "Couple introduced followed by multi-course feast and heartfelt toasts.",
      location: "Grand Ballroom",
      responsibleRole: "MC & Banquet Lead",
    },
    {
      startTime: "18:00",
      endTime: "21:30",
      title: "First Dance, Cake Cutting & Dance Floor Celebration",
      description: "Opening dances, dessert station opening, and celebratory dance party.",
      location: "Ballroom Dance Floor",
      responsibleRole: "DJ / Band Leader",
    },
    {
      startTime: "21:30",
      endTime: "22:00",
      title: "Sparkler Send-Off & Guest Farewell",
      description: "Grand exit pathway lined with guests followed by transportation departure.",
      location: "Main Courtyard",
      responsibleRole: "Event Coordinator",
    },
  ],

  birthday: [
    {
      startTime: "13:00",
      endTime: "14:00",
      title: "Venue Load-in, Decor & Balloon Arch Setup",
      description: "Position decorative backdrop, arrange table displays, and set up sound.",
      location: "Party Hall",
      responsibleRole: "Party Planner / Host",
    },
    {
      startTime: "14:00",
      endTime: "14:30",
      title: "Guest Arrival & Welcome Mocktails/Drinks",
      description: "Greet arriving guests, collect gifts at reception desk, and mingle.",
      location: "Lounge Area",
      responsibleRole: "Host",
    },
    {
      startTime: "14:30",
      endTime: "15:30",
      title: "Interactive Party Games & Photo Booth Fun",
      description: "Organized group trivia, games, and photo sessions at styled backdrop.",
      location: "Activity Zone",
      responsibleRole: "MC / Game Host",
    },
    {
      startTime: "15:30",
      endTime: "16:30",
      title: "Birthday Feast & Food Station Service",
      description: "Buffet or plated dining accompanied by celebratory background music.",
      location: "Dining Hall",
      responsibleRole: "Catering Lead",
    },
    {
      startTime: "16:30",
      endTime: "17:15",
      title: "Cake Cutting Ceremony & Speeches",
      description: "Gather for birthday song, candle blowing, brief speeches, and dessert.",
      location: "Main Stage",
      responsibleRole: "Host",
    },
    {
      startTime: "17:15",
      endTime: "18:30",
      title: "Dance Floor Open & Party Celebration",
      description: "High-energy music, dancing, and celebratory mingling.",
      location: "Dance Floor",
      responsibleRole: "DJ",
    },
    {
      startTime: "18:30",
      endTime: "19:00",
      title: "Party Favors & Farewell",
      description: "Distribute custom favors, thank attendees, and wrap up celebration.",
      location: "Exit Foyer",
      responsibleRole: "Host",
    },
  ],

  community: [
    {
      startTime: "07:30",
      endTime: "09:00",
      title: "Committee Arrival, Canopy Erection & Sound Setup",
      description: "Unload equipment, set up registration tent, canopy stalls, and public address audio.",
      location: "Park Central Green",
      responsibleRole: "Logistics Lead",
    },
    {
      startTime: "09:00",
      endTime: "09:30",
      title: "Volunteer Check-In & Safety Briefing",
      description: "Distribute volunteer vests, assign station duties, and review safety protocol.",
      location: "Information Booth",
      responsibleRole: "Volunteer Coordinator",
    },
    {
      startTime: "09:30",
      endTime: "10:00",
      title: "Gates Open & Community Welcome",
      description: "Welcome neighbors, open interactive activity booths and community resource tables.",
      location: "Main Entrance",
      responsibleRole: "Welcome Committee",
    },
    {
      startTime: "10:00",
      endTime: "12:00",
      title: "Morning Demonstrations & Cultural Performances",
      description: "Stage acts showcasing local talent, cultural dances, and youth music groups.",
      location: "Main Stage",
      responsibleRole: "Stage Manager",
    },
    {
      startTime: "12:00",
      endTime: "13:30",
      title: "Community Lunch & Food Truck Fair",
      description: "Local food trucks open, communal picnic area dining, and acoustic set.",
      location: "Food Truck Promenade",
      responsibleRole: "Food Truck Liaison",
    },
    {
      startTime: "13:30",
      endTime: "15:30",
      title: "Community Games, Sports & Family Contests",
      description: "Field activities, sack races, arts & crafts workshops, and raffle draws.",
      location: "Activity Field",
      responsibleRole: "Recreation Lead",
    },
    {
      startTime: "15:30",
      endTime: "16:30",
      title: "Keynote Address, Awards & Closing Ceremony",
      description: "Acknowledge sponsors, volunteers, announce raffle winners, and close event.",
      location: "Main Stage",
      responsibleRole: "Committee Chair",
    },
    {
      startTime: "16:30",
      endTime: "18:00",
      title: "Grounds Cleanup & Equipment Teardown",
      description: "Pack up canopies, clear waste/recycling, and return park to original state.",
      location: "Park Grounds",
      responsibleRole: "All Volunteers",
    },
  ],
};

/**
 * Generates sensible starter preparation milestones tailored to the event date and archetype.
 * Ensures all targetDates occur on or before the eventDate.
 */
export function generateStarterMilestones(
  eventDate: string,
  eventType: EventType = "wedding"
): TimelineMilestone[] {
  const templates = STARTER_MILESTONE_TEMPLATES[eventType] || STARTER_MILESTONE_TEMPLATES.wedding;

  return templates.map((template, idx) => {
    const targetDate = addDaysToIsoDate(eventDate, -template.daysBeforeEvent);
    const actualDaysBefore = daysBetween(targetDate, eventDate);

    return {
      id: `ms-starter-${idx + 1}-${Date.now().toString(36)}`,
      title: template.title,
      description: template.description,
      targetDate,
      daysBeforeEvent: Math.max(0, actualDaysBefore),
      category: template.category,
      priority: template.priority,
      status: "pending",
      completed: false,
    };
  });
}

/**
 * Generates sensible starter day-of run-of-show schedule items tailored to archetype.
 */
export function generateStarterSchedule(
  eventType: EventType = "wedding"
): ScheduleItem[] {
  const templates = STARTER_SCHEDULE_TEMPLATES[eventType] || STARTER_SCHEDULE_TEMPLATES.wedding;

  return templates.map((template, idx) => ({
    id: `sch-starter-${idx + 1}-${Date.now().toString(36)}`,
    title: template.title,
    startTime: template.startTime,
    endTime: template.endTime,
    description: template.description,
    location: template.location,
    responsibleRole: template.responsibleRole,
  }));
}

/**
 * Checks whether starter milestones can be generated without overwriting existing data.
 */
export function hasExistingMilestones(milestones?: TimelineMilestone[]): boolean {
  return Boolean(milestones && milestones.length > 0);
}

export interface TimelineSummaryMetrics {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  completionPercentage: number;
}

/**
 * Calculates accurate milestone summary metrics including timezone-safe overdue tasks.
 */
export function calculateTimelineMetrics(
  milestones: TimelineMilestone[],
  referenceDate?: Date
): TimelineSummaryMetrics {
  const total = milestones.length;
  if (total === 0) {
    return {
      total: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      overdue: 0,
      completionPercentage: 0,
    };
  }

  let completed = 0;
  let inProgress = 0;
  let pending = 0;
  let overdue = 0;

  for (const m of milestones) {
    const isDone = m.completed || m.status === "completed";
    if (isDone) {
      completed += 1;
    } else {
      if (m.status === "in_progress") {
        inProgress += 1;
      } else {
        pending += 1;
      }

      if (isMilestoneOverdue(m.targetDate, isDone, referenceDate)) {
        overdue += 1;
      }
    }
  }

  const completionPercentage = Math.round((completed / total) * 100);

  return {
    total,
    completed,
    inProgress,
    pending,
    overdue,
    completionPercentage,
  };
}

export interface FilterSortOptions {
  status?: string; // "all" | "pending" | "in_progress" | "completed" | "overdue"
  category?: string; // "all" | specific category
  sortBy?: "date-asc" | "date-desc" | "priority" | "status";
  referenceDate?: Date;
}

/**
 * Pure filter and sort utility for milestone collections.
 */
export function filterAndSortMilestones(
  milestones: TimelineMilestone[],
  options: FilterSortOptions = {}
): TimelineMilestone[] {
  const { status = "all", category = "all", sortBy = "date-asc", referenceDate } = options;

  let filtered = [...milestones];

  // 1. Status Filter
  if (status !== "all") {
    filtered = filtered.filter((m) => {
      const isDone = m.completed || m.status === "completed";
      if (status === "completed") return isDone;
      if (status === "in_progress") return !isDone && m.status === "in_progress";
      if (status === "pending") return !isDone && (!m.status || m.status === "pending");
      if (status === "overdue") return isMilestoneOverdue(m.targetDate, isDone, referenceDate);
      return true;
    });
  }

  // 2. Category Filter
  if (category !== "all") {
    filtered = filtered.filter(
      (m) => m.category.toLowerCase().trim() === category.toLowerCase().trim()
    );
  }

  // 3. Sorting
  const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };

  filtered.sort((a, b) => {
    if (sortBy === "date-desc") {
      return b.targetDate.localeCompare(a.targetDate);
    }
    if (sortBy === "priority") {
      const pA = priorityOrder[a.priority || "medium"] || 2;
      const pB = priorityOrder[b.priority || "medium"] || 2;
      if (pB !== pA) return pB - pA;
      return a.targetDate.localeCompare(b.targetDate);
    }
    if (sortBy === "status") {
      const aDone = a.completed || a.status === "completed" ? 1 : 0;
      const bDone = b.completed || b.status === "completed" ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return a.targetDate.localeCompare(b.targetDate);
    }
    // Default: date-asc
    return a.targetDate.localeCompare(b.targetDate);
  });

  return filtered;
}
