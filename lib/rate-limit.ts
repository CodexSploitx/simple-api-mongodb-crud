interface RateLimitTracker {
  count: number;
  expiresAt: number;
}

const trackers: Record<string, RateLimitTracker> = {};

/**
 * Checks if the IP has exceeded the rate limit.
 * @param ip The IP address to check.
 * @param limit Max requests allowed in the window.
 * @param windowMs Time window in milliseconds.
 * @throws Error if rate limit exceeded.
 */
export function checkRateLimit(ip: string, limit: number = 5, windowMs: number = 60000) {
  const now = Date.now();
  const tracker = trackers[ip];

  // Clean up expired tracker or create new one
  if (!tracker || tracker.expiresAt < now) {
    trackers[ip] = { count: 1, expiresAt: now + windowMs };
    return;
  }

  if (tracker.count >= limit) {
    throw new Error("Too many requests, please try again later.");
  }

  tracker.count++;
}
