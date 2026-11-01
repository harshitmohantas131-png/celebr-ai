import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryRateLimiter, getClientIdentifier } from "@/lib/security/rateLimiter";

describe("InMemoryRateLimiter", () => {
  let limiter: InMemoryRateLimiter;

  beforeEach(() => {
    limiter = new InMemoryRateLimiter({
      maxRequests: 3,
      windowMs: 1000,
      maxEntries: 5,
    });
  });

  it("allows requests under the limit", () => {
    const res1 = limiter.check("client-1", 1000);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = limiter.check("client-1", 1100);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = limiter.check("client-1", 1200);
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it("blocks requests that exceed the limit within window", () => {
    limiter.check("client-1", 1000);
    limiter.check("client-1", 1100);
    limiter.check("client-1", 1200);

    const blocked = limiter.check("client-1", 1300);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetTime).toBe(2000);
  });

  it("resets counter after window expires", () => {
    limiter.check("client-1", 1000);
    limiter.check("client-1", 1100);
    limiter.check("client-1", 1200);

    // After resetTime (2000)
    const allowed = limiter.check("client-1", 2001);
    expect(allowed.allowed).toBe(true);
    expect(allowed.remaining).toBe(2);
  });

  it("bounds memory capacity by evicting oldest entry", () => {
    for (let i = 1; i <= 5; i++) {
      limiter.check(`client-${i}`, 1000);
    }
    expect(limiter.size()).toBe(5);

    // Adding 6th entry should evict oldest
    limiter.check("client-6", 1000);
    expect(limiter.size()).toBeLessThanOrEqual(5);
  });

  it("extracts client identifier from x-forwarded-for header safely", () => {
    const req = new Request("http://localhost:3000/api/plan", {
      headers: {
        "x-forwarded-for": "203.0.113.195, 70.41.3.18",
      },
    });
    expect(getClientIdentifier(req)).toBe("203.0.113.195");
  });

  it("extracts client identifier from x-real-ip header", () => {
    const req = new Request("http://localhost:3000/api/plan", {
      headers: {
        "x-real-ip": "198.51.100.4",
      },
    });
    expect(getClientIdentifier(req)).toBe("198.51.100.4");
  });

  it("falls back to anonymous-client when headers are absent", () => {
    const req = new Request("http://localhost:3000/api/plan");
    expect(getClientIdentifier(req)).toBe("anonymous-client");
  });
});

