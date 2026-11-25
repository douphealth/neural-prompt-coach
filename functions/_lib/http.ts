import type { Env } from './env';

const BUILT_IN_ORIGINS = ['https://promptgrade.efficientgptprompts.com'];
// Preview deployments of the Cloudflare Pages project that serves PromptGrade.
const PAGES_PREVIEW = /^https:\/\/([a-z0-9-]+\.)?gearup-flow-master\.pages\.dev$/;
const LOCALHOST = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

// Expected outcomes (not configured, no match, rate limited…) are HTTP 200 with
// { ok: false, error } so browsers don't log them as console errors. Only forbidden
// origins (403) and wrong methods (405) use error statuses.
export function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extra,
    },
  });
}

export function originAllowed(request: Request, env: Env): boolean {
  const origin = request.headers.get('origin');
  // Same-origin fetches from browsers send Origin on POST; refuse requests without it.
  if (!origin) return false;
  const extra = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return BUILT_IN_ORIGINS.includes(origin) || extra.includes(origin) || PAGES_PREVIEW.test(origin) || LOCALHOST.test(origin);
}

/** Reads a small JSON body; rejects bodies over maxBytes. */
export async function readJson<T = Record<string, unknown>>(request: Request, maxBytes = 2048): Promise<T | null> {
  const type = request.headers.get('content-type') || '';
  if (!type.includes('application/json')) return null;
  const text = await request.text();
  if (text.length > maxBytes) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? (parsed as T) : null;
  } catch {
    return null;
  }
}

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Fixed-window rate limit per client IP and route. Uses KV when bound (durable across
 * isolates), otherwise best-effort memory. Returns true when the request may proceed.
 */
export async function rateLimit(request: Request, env: Env, route: string, limit: number, windowSec: number): Promise<boolean> {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const windowId = Math.floor(Date.now() / (windowSec * 1000));
  const key = `rl:${route}:${ip}:${windowId}`;

  if (env.RATE_LIMIT) {
    try {
      const current = Number((await env.RATE_LIMIT.get(key)) || '0');
      if (current >= limit) return false;
      await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: Math.max(60, windowSec * 2) });
      return true;
    } catch {
      // fall through to memory
    }
  }

  const now = Date.now();
  const bucket = memoryBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    if (memoryBuckets.size > 5000) memoryBuckets.clear();
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}

/** Verifies a Cloudflare Turnstile token when TURNSTILE_SECRET_KEY is set; otherwise passes. */
export async function turnstileOk(request: Request, env: Env, token: unknown): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (typeof token !== 'string' || token.length < 10 || token.length > 4096) return false;
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET_KEY);
  form.append('response', token);
  const ip = request.headers.get('cf-connecting-ip');
  if (ip) form.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
