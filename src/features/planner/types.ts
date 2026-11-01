import type { EventType } from "@/types/event";

export * from "@/types/event";

export interface EventTypeOption {
  id: EventType;
  title: string;
  tagline: string;
  badge: string;
  badgeVariant: "rose" | "gold" | "primary";
  features: string[];
}

export const EVENT_TYPES: EventTypeOption[] = [
  {
    id: "wedding",
    title: "Wedding",
    tagline: "Ceremonies, receptions, rehearsal dinners, and celebrations of love",
    badge: "Most Detailed",
    badgeVariant: "rose",
    features: ["Ceremony & reception schedules", "Vendor coordination checklists", "Seating & catering budget splits"],
  },
  {
    id: "birthday",
    title: "Birthday Party",
    tagline: "Milestone birthdays, surprise parties, children's celebrations, and private dinners",
    badge: "Popular",
    badgeVariant: "gold",
    features: ["Creative theme inspirations", "Entertainment & cake timelines", "Party favor & decor allocations"],
  },
  {
    id: "community",
    title: "Community Event",
    tagline: "Festivals, fundraisers, block parties, cultural gatherings, and charity galas",
    badge: "Large Scale",
    badgeVariant: "primary",
    features: ["Permit & venue milestones", "Volunteer duty shifts", "Public logistics & contingency planning"],
  },
];
