import type { IncomingMessage } from "node:http";

const windowMs = 60_000;
const maxRequestsPerWindow = 120;
const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(request: IncomingMessage): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  const key = request.socket.remoteAddress ?? "local";
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  bucket.count += 1;
  if (bucket.count > maxRequestsPerWindow) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  return { ok: true };
}
