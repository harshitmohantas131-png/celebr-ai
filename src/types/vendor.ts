/**
 * Vendor and Checklist Domain Models for CelebrAI.
 * Pure TypeScript definitions for vendor tracking, bookings, and checklists.
 */

export const VENDOR_CATEGORIES = [
  "venue",
  "catering",
  "photography",
  "decor",
  "entertainment",
  "attire",
  "transport",
  "accommodation",
  "invitations",
  "staffing",
  "miscellaneous",
] as const;

export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];

export const BOOKING_STATUSES = [
  "shortlisted",
  "contacted",
  "booked",
  "cancelled",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export interface VendorTask {
  id: string;
  title: string;
  description?: string;
  dueDate?: string; // ISO 8601 calendar date: YYYY-MM-DD
  completed: boolean;
  notes?: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: VendorCategory;
  contactName?: string;
  phone?: string;
  email?: string;
  website?: string;
  cost?: number; // Quoted or agreed cost (e.g. 5000 in major units)
  bookingStatus: BookingStatus;
  notes?: string;
  checklist: VendorTask[];
  budgetLineItemId?: string; // Stable reference to associated BudgetLineItem
  createdAt?: string; // ISO 8601 timestamp
  updatedAt?: string; // ISO 8601 timestamp
}

export interface VendorProgress {
  totalVendors: number;
  bookedVendors: number;
  shortlistedVendors: number;
  contactedVendors: number;
  cancelledVendors: number;
  totalTasks: number;
  completedTasks: number;
  outstandingTasks: number;
  overdueTasks: number;
  overallCompletionRate: number; // 0 to 100
  totalAgreedCost: number; // Sum of cost across non-cancelled vendors
}

export interface VendorCategoryInfo {
  id: VendorCategory;
  name: string;
  description: string;
  defaultBudgetId: string;
}

export const VENDOR_CATEGORY_DEFINITIONS: VendorCategoryInfo[] = [
  { id: "venue", name: "Venue & Rentals", description: "Ballrooms, grounds, banquet halls, tents, chairs", defaultBudgetId: "cat-venue" },
  { id: "catering", name: "Catering & Bar", description: "Buffets, plated dinner, appetizers, bar, mixology", defaultBudgetId: "cat-catering" },
  { id: "photography", name: "Photography & Video", description: "Lead shooter, videography, drone capture, photobooth", defaultBudgetId: "cat-photography" },
  { id: "decor", name: "Décor & Florals", description: "Flower arrangements, centerpieces, backdrops, lighting", defaultBudgetId: "cat-decor" },
  { id: "entertainment", name: "Music & Entertainment", description: "DJs, live bands, sound engineering, MCs, stage shows", defaultBudgetId: "cat-entertainment" },
  { id: "attire", name: "Attire & Beauty", description: "Bridal outfits, tuxedo rental, tailoring, makeup, hair", defaultBudgetId: "cat-attire" },
  { id: "transport", name: "Transport & Logistics", description: "Guest shuttles, limousine, vintage car, equipment transit", defaultBudgetId: "cat-transport" },
  { id: "accommodation", name: "Accommodation", description: "Hotel room blocks, bridal suite, guest lodging", defaultBudgetId: "cat-accommodation" },
  { id: "invitations", name: "Invitations & Stationery", description: "Save the dates, print invites, stamps, signage, menus", defaultBudgetId: "cat-invitations" },
  { id: "staffing", name: "Staffing & Coordination", description: "Day-of coordinator, event hosts, security, cleanup crew", defaultBudgetId: "cat-staffing" },
  { id: "miscellaneous", name: "Miscellaneous & Favors", description: "Gifts, favors, tips, licenses, insurance", defaultBudgetId: "cat-miscellaneous" },
];
