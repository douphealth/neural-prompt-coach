// Premium entitlement on the client.
//
// Premium is granted only from a license the server signed after confirming a paid
// Stripe purchase (/api/verify-session or /api/restore). localStorage holds that license;
// it is never treated as proof on its own, and checkout errors never unlock anything.
//
// Existing buyers: before this change, /payment-success set `promptgrade_premium=true`
// (and usually `promptgrade_session_id`). Those browsers are migrated:
//   - with a stored Checkout Session id -> verified with Stripe and converted to a license;
//   - otherwise -> kept unlocked until LEGACY_GRACE_UNTIL, with a prompt to restore.

export const PAYMENT_LINK_URL: string =
  (import.meta.env.VITE_STRIPE_PAYMENT_LINK as string | undefined) || 'https://buy.stripe.com/eVq28r1Li4CI0c5bn8ejK04';
export const PREMIUM_PRICE_LABEL = '$7.99';
/** Owner-approved date after which unverifiable legacy unlocks end. */
export const LEGACY_GRACE_UNTIL = '2027-01-31';

const K = {
  license: 'promptgrade_license',
  checkedAt: 'promptgrade_license_checked_at',
  legacyFlag: 'promptgrade_premium',
  legacySession: 'promptgrade_session_id',
  legacyState: 'promptgrade_legacy_state',
  usage: 'promptgrade_usage',
  legacyCount: 'promptgrade_count',
  blueprintEmail: 'promptgrade_blueprint_email',
} as const;

export type PremiumStatus = 'free' | 'premium' | 'legacy_grace';

export interface PremiumState {
  status: PremiumStatus;
  checking: boolean;
}

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function lsSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: premium still works for this page view */
  }
}
function lsDel(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function graceActive(now = new Date()) {
  return now.getTime() < new Date(`${LEGACY_GRACE_UNTIL}T23:59:59Z`).getTime();
}

function initialStatus(): PremiumStatus {
  if (lsGet(K.license)) return 'premium';
  if (lsGet(K.legacyFlag) === 'true' && lsGet(K.legacyState) !== 'rejected' && graceActive()) return 'legacy_grace';
  return 'free';
}

let state: PremiumState = { status: typeof window === 'undefined' ? 'free' : initialStatus(), checking: false };
const listeners = new Set<() => void>();

function setState(next: Partial<PremiumState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function getState() {
  return state;
}

// Keep other open tabs in sync (e.g. checkout finished in another tab).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === K.license || e.key === K.legacyFlag) setState({ status: initialStatus() });
  });
}

export type ApiError =
  | 'not_configured'
  | 'stripe_unavailable'
  | 'rate_limited'
  | 'network'
  | 'not_found'
  | 'not_paid'
  | 'wrong_product'
  | 'refunded'
  | 'invalid'
  | 'no_match'
  | 'challenge_failed'
  | 'forbidden';

async function post<T>(path: string, body: unknown): Promise<T | { ok: false; error: ApiError }> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const type = res.headers.get('content-type') || '';
    // When the API is not deployed (e.g. a static-only host), the SPA answers with HTML.
    if (!type.includes('application/json')) return { ok: false, error: 'not_configured' };
    return (await res.json()) as T;
  } catch {
    return { ok: false, error: 'network' };
  }
}

export interface OrderInfo {
  reference: string;
  receiptNumber: string | null;
  receiptUrl: string | null;
  email: string | null;
  amountTotal: number | null;
  currency: string | null;
  created: number;
}

function storeLicense(license: string) {
  lsSet(K.license, license);
  lsSet(K.checkedAt, String(Date.now()));
  lsDel(K.legacyFlag);
  lsDel(K.legacySession);
  lsDel(K.legacyState);
  setState({ status: 'premium' });
}

export async function verifyCheckoutSession(
  sessionId: string,
): Promise<{ ok: true; order: OrderInfo } | { ok: false; error: ApiError }> {
  const r = await post<{ ok: true; license: string; order: OrderInfo }>('/api/verify-session', { sessionId });
  if ('license' in r && r.ok) {
    storeLicense(r.license);
    return { ok: true, order: r.order };
  }
  return { ok: false, error: 'error' in r ? r.error : 'network' };
}

export async function restorePurchase(
  email: string,
  proof: string,
  turnstileToken?: string,
): Promise<{ ok: true } | { ok: false; error: ApiError }> {
  const r = await post<{ ok: true; license: string }>('/api/restore', { email, proof, turnstileToken });
  if ('license' in r && r.ok) {
    storeLicense(r.license);
    return { ok: true };
  }
  return { ok: false, error: 'error' in r ? r.error : 'network' };
}

const RECHECK_MS = 24 * 60 * 60 * 1000;

/** Runs once per page load: re-validates a license daily and migrates legacy unlocks. */
export async function syncEntitlement(): Promise<void> {
  const license = lsGet(K.license);
  if (license) {
    const last = Number(lsGet(K.checkedAt) || '0');
    if (Date.now() - last < RECHECK_MS) return;
    setState({ checking: true });
    const r = await post<{ ok: true; valid: boolean }>('/api/license', { license });
    if ('valid' in r && r.ok) {
      if (r.valid) {
        lsSet(K.checkedAt, String(Date.now()));
      } else {
        lsDel(K.license);
        lsDel(K.checkedAt);
        setState({ status: 'free' });
      }
    }
    // Errors (offline, API not deployed): keep the license; try again next load.
    setState({ checking: false });
    return;
  }

  if (lsGet(K.legacyFlag) !== 'true' || lsGet(K.legacyState) === 'rejected') return;
  const sid = lsGet(K.legacySession) || '';
  if (!/^cs_(live|test)_/.test(sid)) return; // cannot verify; grace period applies
  setState({ checking: true });
  const r = await verifyCheckoutSession(sid);
  const err = 'error' in r ? r.error : null;
  if (err === 'not_paid' || err === 'refunded' || err === 'wrong_product') {
    // Stripe answered definitively that this was not a valid purchase.
    lsSet(K.legacyState, 'rejected');
    setState({ status: initialStatus() });
  }
  setState({ checking: false });
}

/** Opens the Stripe Payment Link (same tab, so Stripe returns the buyer to /payment-success). */
export function startCheckout() {
  const email = lsGet(K.blueprintEmail);
  const url = new URL(PAYMENT_LINK_URL);
  if (email) url.searchParams.set('prefilled_email', email);
  window.location.assign(url.toString());
}

// ---------------------------------------------------------------------------
// Free-tier usage: FREE_DAILY_LIMIT scans per calendar day (local time).
// ---------------------------------------------------------------------------

export const FREE_DAILY_LIMIT = 5;

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getUsageToday(): number {
  lsDel(K.legacyCount); // old counter never reset; superseded by the daily counter
  try {
    const raw = JSON.parse(lsGet(K.usage) || 'null');
    return raw && raw.date === today() && Number.isFinite(raw.count) ? raw.count : 0;
  } catch {
    return 0;
  }
}

export function recordUsage(): number {
  const count = getUsageToday() + 1;
  lsSet(K.usage, JSON.stringify({ date: today(), count }));
  return count;
}
