/**
 * Bounded In-Memory Rate Limiter for CelebrAI API Endpoints.
 * Best-effort throttling designed for MVP / single-instance server runtime.
 *
 * NOTE: As an in-memory store, counters reset upon process restart and do not
 * coordinate across distributed serverless instances.
 */

import { API_LIMITS } from "@/lib/constants/limits";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

export class InMemoryRateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly maxEntries: number;

  constructor(options?: {
    maxRequests?: number;
    windowMs?: number;
    maxEntries?: number;
  }) {
    this.maxRequests = options?.maxRequests ?? API_LIMITS.RATE_LIMIT_MAX_REQUESTS;
    this.windowMs = options?.windowMs ?? API_LIMITS.RATE_LIMIT_WINDOW_MS;
    this.maxEntries = options?.maxEntries ?? API_LIMITS.RATE_LIMIT_MAX_ENTRIES;
  }

  public check(identifier: string, now: number = Date.now()): RateLimitResult {
    // Opportunistic cleanup of expired keys
    this.cleanup(now);

    const record = this.store.get(identifier);

    if (!record || now >= record.resetTime) {
      const resetTime = now + this.windowMs;

      // Bound memory by evicting oldest entry if full
      if (this.store.size >= this.maxEntries) {
        const firstKey = this.store.keys().next().value;
        if (firstKey) this.store.delete(firstKey);
      }

      this.store.set(identifier, { count: 1, resetTime });
      return {
        allowed: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        resetTime,
      };
    }

    if (record.count >= this.maxRequests) {
      return {
        allowed: false,
        limit: this.maxRequests,
        remaining: 0,
        resetTime: record.resetTime,
      };
    }

    record.count += 1;
    return {
      allowed: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - record.count,
      resetTime: record.resetTime,
    };
  }

  public cleanup(now: number = Date.now()): void {
    for (const [key, record] of this.store.entries()) {
      if (now >= record.resetTime) {
        this.store.delete(key);
      }
    }
  }

  public reset(): void {
    this.store.clear();
  }

  public size(): number {
    return this.store.size;
  }
}

/**
 * Extracts a best-effort client identifier from standard reverse-proxy headers.
 * Truncates and sanitizes the output to avoid memory poisoning attacks.
 */
export function getClientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0].trim();
    if (firstIp) return firstIp.slice(0, 45); // IPv6 max length is 45 chars
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim().slice(0, 45);
  }

  return "anonymous-client";
}

export const planApiRateLimiter = new InMemoryRateLimiter();

