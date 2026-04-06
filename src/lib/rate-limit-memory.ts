/**
 * Simple in-memory rate limiter for Layer 1
 * Suitable for basic brute-force protection, though a distributed store like Redis is better for multi-instance deployments.
 */

interface RateLimitInfo {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitInfo>();

/**
 * Validates if the action identified by "key" has exceeded "limit" within "windowMs"
 */
export function checkRateLimitMemory(key: string, limit: number, windowMs: number): { success: boolean; resetAt: number } {
  const now = Date.now();
  let info = store.get(key);

  if (!info || now > info.resetAt) {
    info = { count: 0, resetAt: now + windowMs };
  }

  info.count++;
  store.set(key, info);

  return {
    success: info.count <= limit,
    resetAt: info.resetAt
  };
}

/**
 * Periodically cleanup stale entries
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, info] of Array.from(store.entries())) {
    if (now > info.resetAt) {
      store.delete(key);
    }
  }
}, 60 * 1000).unref(); // Run every minute, unref to not block process exit
