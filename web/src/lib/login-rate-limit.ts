const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type Attempt = { count: number; resetAt: number };
const attempts = new Map<string, Attempt>();

function clientKey(request: Request) {
  // In production, trust forwarded IP headers only when set by your hosting proxy.
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

export function loginRateLimit(request: Request) {
  const now = Date.now();
  const key = clientKey(request);
  const attempt = attempts.get(key);

  if (!attempt || attempt.resetAt <= now) {
    attempts.set(key, { count: 0, resetAt: now + WINDOW_MS });
    return { limited: false, retryAfter: 0 };
  }

  return {
    limited: attempt.count >= MAX_ATTEMPTS,
    retryAfter: Math.max(1, Math.ceil((attempt.resetAt - now) / 1000)),
  };
}

export function recordLoginFailure(request: Request) {
  const key = clientKey(request);
  const current = attempts.get(key);
  const now = Date.now();
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  current.count += 1;
}

export function clearLoginFailures(request: Request) {
  attempts.delete(clientKey(request));
}
