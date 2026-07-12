export type RateLimitConfig = { limit: number; windowMs: number };

export function parseRateLimitConfig(env: Record<string, string | undefined>): RateLimitConfig {
  const parsed = Number(env.MIZAN_RATE_LIMIT_PER_MINUTE);
  return {
    limit: Number.isInteger(parsed) && parsed > 0 && parsed <= 1_000 ? parsed : 5,
    windowMs: 60_000,
  };
}

export function createRateLimiter(config: RateLimitConfig) {
  const buckets = new Map<string, { startedAt: number; count: number }>();
  return {
    consume(key: string, now = Date.now()): boolean {
      const normalized = key || "unknown";
      const bucket = buckets.get(normalized);
      if (!bucket || now - bucket.startedAt >= config.windowMs) {
        buckets.set(normalized, { startedAt: now, count: 1 });
        return true;
      }
      if (bucket.count >= config.limit) return false;
      bucket.count += 1;
      return true;
    },
  };
}
