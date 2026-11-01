/**
 * CelebrAI Domain Models — Event, Budget, Timeline, and Planning Entities.
 * Pure, strongly typed definitions shared across frontend, API, and tests.
 */

import type { Vendor } from "./vendor";
export * from "./vendor";

export type EventType = "wedding" | "birthday" | "community";

export type Currency = "USD" | "INR";

export interface EventDetails {
  name: string;
  eventType: EventType;
  eventDate: string; // ISO 8601 calendar date: YYYY-MM-DD
  location: string;
  guestCount: number;
  totalBudget: number;
  currency: Currency;
  theme: string;
  culturalPreferences: string[];
  dietaryRequirements: string[];
  planningPriorities: string[];
  additionalInstructions: string;
}

export type CreateEventInput = Partial<
  Omit<EventDetails, "name" | "eventType" | "eventDate" | "guestCount" | "totalBudget" | "currency">
> & {
  name: string;
  eventType: EventType;
  eventDate: string;
  guestCount: number;
  totalBudget: number;
  currency?: Currency;
  location?: string;
  theme?: string;
  culturalPreferences?: string[];
  dietaryRequirements?: string[];
  planningPriorities?: string[];
  additionalInstructions?: string;
};

export interface EventOverview {
  summary: string;
  personalizedIdeas: string[];
  themeConcept?: string;
  colorPalette?: string[];
}

export type BudgetPriority = "high" | "medium" | "low";
export type PaymentStatus = "unpaid" | "partially_paid" | "paid";

export interface BudgetLineItem {
  id: string;
  name: string;
  estimatedCost: number; // In major currency units (e.g. 500 for $500.00)
  priority: BudgetPriority;
  categoryId: string;
  notes?: string;
  currency?: Currency;
  actualCost?: number; // Optional until actual cost is known
  paymentStatus?: PaymentStatus; // Defaults to "unpaid"
  vendorName?: string;
  dueDate?: string; // ISO 8601 calendar date: YYYY-MM-DD
}

export interface BudgetCategory {
  id: string;
  name: string;
  allocatedAmount?: number;
  items: BudgetLineItem[];
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  subtotal: number;
  percentageOfTotal: number;
  itemCount: number;
}

export interface BudgetCalculationResult {
  currency: Currency;
  totalBudget: number;
  categorySubtotal: number;
  contingencyRate: number; // e.g., 0.10 for 10%
  contingencyAmount: number;
  totalEstimatedCost: number;
  remainingBudget: number;
  isOverBudget: boolean;
  overBudgetAmount: number;
  categoryBreakdown: CategoryBreakdown[];
  warnings: string[];
}

export interface CalculateBudgetInput {
  totalBudget: number;
  currency?: Currency;
  categories: BudgetCategory[];
  contingencyRate?: number; // default 0.10 (10%)
  fixedContingencyAmount?: number;
}

export type MilestoneStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type MilestonePriority = "high" | "medium" | "low";

export interface TimelineMilestone {
  id: string;
  title: string;
  description: string;
  targetDate: string; // ISO 8601 calendar date: YYYY-MM-DD
  daysBeforeEvent: number; // Non-negative integer (0 = day of event)
  category: string;
  completed: boolean;
  time?: string; // Optional HH:mm format (24-hour)
  priority?: MilestonePriority;
  status?: MilestoneStatus;
}

export interface ScheduleItem {
  id: string;
  title: string;
  startTime: string; // HH:mm format (24-hour)
  endTime: string; // HH:mm format (24-hour)
  description: string;
  location?: string;
  responsibleRole?: string;
}

export type ChecklistStatus = "pending" | "in_progress" | "completed" | "cancelled";

export type ChecklistPriority = "high" | "medium" | "low";

export interface ChecklistTask {
  id: string;
  title: string;
  category: string;
  status: ChecklistStatus;
  priority: ChecklistPriority;
  dueDate?: string; // ISO 8601 calendar date: YYYY-MM-DD
  notes?: string;
}

export interface ChecklistProgress {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  cancelled: number;
  completionRate: number; // 0 to 100
  isComplete: boolean;
  byPriority: Record<ChecklistPriority, { total: number; completed: number }>;
  byCategory: Record<string, { total: number; completed: number }>;
}

export interface PlanMetadata {
  createdAt: string; // ISO 8601 timestamp
  version: number;
  currency: Currency;
  eventType: EventType;
}

export type PlanSection = "overview" | "budget" | "timeline" | "schedule" | "checklist";

export interface RefinementRequest {
  instructions: string;
  targetSection?: PlanSection;
}

export interface EventPlan {
  id: string;
  eventDetails: EventDetails;
  overview: EventOverview;
  budget: {
    categories: BudgetCategory[];
    contingencyRate: number;
    calculation: BudgetCalculationResult;
  };
  milestones: TimelineMilestone[];
  schedule: ScheduleItem[];
  checklist: ChecklistTask[];
  vendors?: Vendor[];
  metadata: PlanMetadata;
}

