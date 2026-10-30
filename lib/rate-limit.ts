/**
 * In-memory sliding window rate limiter for API endpoints (SEC-08).
 * Protects sensitive endpoints (Gemini AI assistant, sync, auth) against abuse, brute-force and DoS.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes to prevent memory leak
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < 120000);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 300000);
}

export interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds (default: 60,000 = 1 minute)
  max?: number;      // Max allowed requests within window (default: 30)
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

/**
 * Checks whether an identifier (e.g. IP, user ID or compound key) has exceeded the rate limit.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const windowMs = options.windowMs ?? 60000;
  const max = options.max ?? 30;
  const now = Date.now();

  let record = rateLimitStore.get(identifier);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(identifier, record);
  }

  // Filter timestamps within current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= max) {
    const oldest = record.timestamps[0];
    const resetMs = Math.max(0, windowMs - (now - oldest));
    return {
      success: false,
      limit: max,
      remaining: 0,
      resetMs,
    };
  }

  // Record this hit
  record.timestamps.push(now);

  return {
    success: true,
    limit: max,
    remaining: Math.max(0, max - record.timestamps.length),
    resetMs: windowMs,
  };
}
