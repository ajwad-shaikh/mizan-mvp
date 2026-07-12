import { describe, expect, it } from "vitest";
import { createRateLimiter, parseRateLimitConfig } from "./rate-limit";

describe("per-IP rate limiter", () => {
  it("rejects requests over the fixed-window limit and isolates IPs", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1_000 });
    expect(limiter.consume("192.0.2.1", 0)).toBe(true);
    expect(limiter.consume("192.0.2.1", 1)).toBe(true);
    expect(limiter.consume("192.0.2.1", 2)).toBe(false);
    expect(limiter.consume("192.0.2.2", 2)).toBe(true);
    expect(limiter.consume("192.0.2.1", 1_001)).toBe(true);
  });

  it("uses safe defaults for invalid deployment configuration", () => {
    expect(parseRateLimitConfig({ MIZAN_RATE_LIMIT_PER_MINUTE: "invalid" })).toEqual({
      limit: 5,
      windowMs: 60_000,
    });
  });
});
