// Best-effort limit on enquiries per client (5 per 10 minutes). Memory is per server instance, so on serverless
// hosting this slows down casual abuse rather than guaranteeing a global limit; use a shared store
// (e.g. Upstash Redis) or a CAPTCHA such as Cloudflare Turnstile if spam becomes a problem.
import 'server-only';

const WINDOW_MS = 10 * 60_000;
const LIMIT = 5;
const hits = new Map<string, number[]>();

export function allowRequest(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter(t => now - t < WINDOW_MS);
  const allowed = recent.length < LIMIT;
  if (allowed) recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some(t => now - t < WINDOW_MS)) hits.delete(k);
  return allowed;
}
