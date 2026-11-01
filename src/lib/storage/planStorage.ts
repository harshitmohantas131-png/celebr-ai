/**
 * Local-first Client-side Persistence Service for CelebrAI Event Plans.
 *
 * Uses browser localStorage with versioning, schema validation on read,
 * graceful error handling for quota/private browsing issues, and hydration safety.
 *
 * NOTE: Plans stored through this service exist only within the current browser
 * profile and are not synchronized across devices or remote databases.
 */

import { eventPlanSchema } from "@/lib/schemas/plan";
import type { EventPlan } from "@/types/event";

export const STORAGE_KEY = "celebr_ai_saved_plans_v1";
export const STORAGE_VERSION = 1;
export const PLANS_UPDATED_EVENT = "celebr_ai_plans_updated";

export interface StoredPlanRecord {
  version: number;
  updatedAt: string;
  plan: EventPlan;
}

const EMPTY_PLANS_ARRAY: EventPlan[] = [];
let lastRawJson: string | null | undefined = undefined;
let cachedPlans: EventPlan[] = EMPTY_PLANS_ARRAY;

function notifySubscribers() {
  lastRawJson = undefined;
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent(PLANS_UPDATED_EVENT));
    } catch {
      // Ignore in environments where CustomEvent fails
    }
  }
}

export const planStorage = {
  /**
   * Subscribes to changes in saved plans (supports React useSyncExternalStore).
   */
  subscribe(callback: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    const handleUpdate = () => {
      lastRawJson = undefined;
      callback();
    };
    window.addEventListener(PLANS_UPDATED_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(PLANS_UPDATED_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  },

  /**
   * Checks whether localStorage is supported and accessible in the current browser.
   */
  isAvailable(): boolean {
    if (typeof window === "undefined") return false;
    try {
      const testKey = "__celebr_ai_test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Retrieves all valid saved plans ordered by last-updated descending.
   * Malformed or corrupt entries are filtered out safely without throwing.
   * Memoized by raw localStorage string content for referential stability in React.
   */
  getAll(): EventPlan[] {
    if (!this.isAvailable()) return EMPTY_PLANS_ARRAY;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === lastRawJson) {
        return cachedPlans;
      }

      lastRawJson = raw;

      if (!raw) {
        cachedPlans = EMPTY_PLANS_ARRAY;
        return cachedPlans;
      }

      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        cachedPlans = EMPTY_PLANS_ARRAY;
        return cachedPlans;
      }

      const validPlans: EventPlan[] = [];
      for (const item of parsed) {
        if (!item || typeof item !== "object") continue;
        const candidate = "plan" in item ? item.plan : item;
        const result = eventPlanSchema.safeParse(candidate);
        if (result.success) {
          validPlans.push(result.data as EventPlan);
        }
      }

      cachedPlans = validPlans;
      return cachedPlans;
    } catch {
      lastRawJson = undefined;
      cachedPlans = EMPTY_PLANS_ARRAY;
      return cachedPlans;
    }
  },

  /**
   * Finds a saved plan by its unique ID.
   */
  getById(id: string): EventPlan | null {
    if (!id || !this.isAvailable()) return null;
    const all = this.getAll();
    return all.find((p) => p.id === id) || null;
  },

  /**
   * Saves or overwrites an event plan in local storage.
   * Restored plans are verified against the schema before saving.
   */
  save(plan: EventPlan): boolean {
    if (!this.isAvailable()) return false;

    const validation = eventPlanSchema.safeParse(plan);
    if (!validation.success) {
      return false;
    }

    try {
      const existing = this.getAll();
      const filtered = existing.filter((p) => p.id !== plan.id);

      const record: StoredPlanRecord = {
        version: STORAGE_VERSION,
        updatedAt: new Date().toISOString(),
        plan,
      };

      const records: StoredPlanRecord[] = [
        record,
        ...filtered.map((p) => ({
          version: STORAGE_VERSION,
          updatedAt: p.metadata.createdAt || new Date().toISOString(),
          plan: p,
        })),
      ];

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      notifySubscribers();
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Renames an existing saved plan.
   */
  rename(id: string, newName: string): boolean {
    const trimmed = newName.trim();
    if (!trimmed) return false;

    const plan = this.getById(id);
    if (!plan) return false;

    const updatedPlan: EventPlan = {
      ...plan,
      eventDetails: {
        ...plan.eventDetails,
        name: trimmed,
      },
    };

    return this.save(updatedPlan);
  },

  /**
   * Deletes a plan from local storage.
   */
  delete(id: string): boolean {
    if (!id || !this.isAvailable()) return false;

    try {
      const existing = this.getAll();
      const filtered = existing.filter((p) => p.id !== id);

      const records: StoredPlanRecord[] = filtered.map((p) => ({
        version: STORAGE_VERSION,
        updatedAt: p.metadata.createdAt || new Date().toISOString(),
        plan: p,
      }));

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      notifySubscribers();
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Clears all saved plans.
   */
  clear(): void {
    if (!this.isAvailable()) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      notifySubscribers();
    } catch {
      // Ignore
    }
  },
};
