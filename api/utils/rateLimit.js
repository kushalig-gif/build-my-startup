/**
 * api/utils/rateLimit.js
 *
 * A deliberately simple, in-memory rate limiter.
 *
 * IMPORTANT LIMITATION (Vercel serverless):
 * Each serverless function invocation may run in a fresh, isolated container.
 * "Warm" invocations reuse the same container and therefore share the
 * in-memory Map below, so this DOES throttle a burst of requests hitting the
 * same warm instance — but it is NOT a global, cross-instance rate limit.
 * Under real traffic across multiple regions/instances, each instance keeps
 * its own counters, so the true global limit is higher than the configured
 * number.
 *
 * This is intentional: the brief asks for the safest *simple* fallback
 * without adding an external database. For real, guaranteed-global rate
 * limiting, use a shared store such as Upstash Redis or Vercel Edge Config
 * and swap the implementation below without changing the call sites.
 */

const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 12; // per IP, per warm instance

// Persist across warm invocations within the same lambda instance.
const store = globalThis.__buildMyStartupRateLimit || new Map();
globalThis.__buildMyStartupRateLimit = store;

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

/**
 * Returns { allowed: boolean, retryAfterSeconds?: number }
 */
function checkRateLimit(req, bucket = 'default') {
  const ip = getClientIp(req);
  const key = `${bucket}:${ip}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(key, { windowStart: now, count: 1 });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfterSeconds = Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(retryAfterSeconds, 1) };
  }

  entry.count += 1;
  return { allowed: true };
}

// Occasionally clear stale entries so the Map doesn't grow unbounded across
// a long-lived warm instance.
function sweep() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > WINDOW_MS * 5) store.delete(key);
  }
}

module.exports = { checkRateLimit, sweep };
