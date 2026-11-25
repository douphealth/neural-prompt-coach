// Read-only Stripe lookups used to verify PromptGrade Premium purchases.
// Only GET requests are made; nothing in Stripe is created or changed.
import type { Env } from './env';

export type VerifyReason =
  | 'ok'
  | 'not_found'
  | 'not_paid'
  | 'wrong_product'
  | 'refunded'
  | 'invalid'
  | 'stripe_unavailable';

export interface Purchase {
  sessionId: string;
  paymentIntentId: string | null;
  email: string | null;
  amountTotal: number | null;
  currency: string | null;
  created: number;
  receiptUrl: string | null;
  receiptNumber: string | null;
}

export interface VerifyResult {
  reason: VerifyReason;
  purchase?: Purchase;
}

interface StripeCharge {
  refunded?: boolean;
  amount?: number;
  amount_refunded?: number;
  receipt_url?: string | null;
  receipt_number?: string | null;
}

interface StripeSession {
  id: string;
  object: 'checkout.session';
  status?: string;
  mode?: string;
  payment_status?: string;
  payment_link?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  created: number;
  customer_details?: { email?: string | null } | null;
  payment_intent?: string | { id: string; latest_charge?: string | StripeCharge | null } | null;
}

export const SESSION_ID_RE = /^cs_(live|test)_[A-Za-z0-9]{10,200}$/;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Stripe JSON, validated by the callers
type StripeJson = any;

async function stripeGet(env: Env, path: string, params: [string, string][] = []): Promise<{ status: number; body: StripeJson }> {
  const qs = params.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  const res = await fetch(`https://api.stripe.com/v1/${path}${qs ? `?${qs}` : ''}`, {
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'stripe-version': '2024-06-20' },
  });
  let body: StripeJson = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

/** Judges one Checkout Session (with payment_intent.latest_charge expanded). */
export function judgeSession(env: Env, s: StripeSession): VerifyResult {
  const pi = typeof s.payment_intent === 'object' && s.payment_intent ? s.payment_intent : null;
  const charge = pi && typeof pi.latest_charge === 'object' && pi.latest_charge ? pi.latest_charge : null;
  const purchase: Purchase = {
    sessionId: s.id,
    paymentIntentId: pi ? pi.id : typeof s.payment_intent === 'string' ? s.payment_intent : null,
    email: s.customer_details?.email ?? null,
    amountTotal: s.amount_total ?? null,
    currency: s.currency ?? null,
    created: s.created,
    receiptUrl: charge?.receipt_url ?? null,
    receiptNumber: charge?.receipt_number ?? null,
  };

  if (s.payment_link !== env.PROMPTGRADE_PAYMENT_LINK_ID || s.mode !== 'payment') return { reason: 'wrong_product' };
  if (s.status !== 'complete' || s.payment_status !== 'paid') return { reason: 'not_paid' };
  if (charge && (charge.refunded || (charge.amount && charge.amount_refunded && charge.amount_refunded >= charge.amount))) {
    return { reason: 'refunded' };
  }
  return { reason: 'ok', purchase };
}

export async function verifySession(env: Env, sessionId: string): Promise<VerifyResult> {
  if (!SESSION_ID_RE.test(sessionId)) return { reason: 'invalid' };
  try {
    const { status, body } = await stripeGet(env, `checkout/sessions/${sessionId}`, [['expand[]', 'payment_intent.latest_charge']]);
    if (status === 404) return { reason: 'not_found' };
    if (status !== 200 || body?.object !== 'checkout.session') return { reason: 'stripe_unavailable' };
    return judgeSession(env, body as StripeSession);
  } catch {
    return { reason: 'stripe_unavailable' };
  }
}

/** Normalises what a buyer pastes as proof of purchase. */
export function normaliseProof(raw: string): { kind: 'session' | 'payment_intent' | 'receipt'; value: string } | null {
  const v = raw.trim().replace(/^#/, '').replace(/^receipt\s*#?\s*/i, '');
  if (SESSION_ID_RE.test(v)) return { kind: 'session', value: v };
  if (/^pi_[A-Za-z0-9]{10,100}$/.test(v)) return { kind: 'payment_intent', value: v };
  if (/^\d{4}-\d{4}$/.test(v)) return { kind: 'receipt', value: v };
  return null;
}

/**
 * Finds a paid, unrefunded Payment Link purchase for this email whose session id,
 * PaymentIntent id or receipt number matches the proof.
 */
export async function findPurchaseByEmail(env: Env, email: string, proofRaw: string): Promise<VerifyResult> {
  const proof = normaliseProof(proofRaw);
  if (!proof) return { reason: 'invalid' };
  const emails = Array.from(new Set([email.trim(), email.trim().toLowerCase()]));
  try {
    for (const e of emails) {
      // Stripe rejects `payment_link` and `customer_details` in the same list query
      // ("You may only specify one of these parameters"), so filter by email here;
      // judgeSession() then rejects sessions from any other Payment Link.
      const { status, body } = await stripeGet(env, 'checkout/sessions', [
        ['customer_details[email]', e],
        ['status', 'complete'],
        ['limit', '100'],
        ['expand[]', 'data.payment_intent.latest_charge'],
      ]);
      if (status !== 200 || !Array.isArray(body?.data)) return { reason: 'stripe_unavailable' };
      for (const s of body.data as StripeSession[]) {
        const judged = judgeSession(env, s);
        const p = judged.purchase;
        if (judged.reason !== 'ok' || !p) continue;
        const matches =
          (proof.kind === 'session' && p.sessionId === proof.value) ||
          (proof.kind === 'payment_intent' && p.paymentIntentId === proof.value) ||
          (proof.kind === 'receipt' && p.receiptNumber === proof.value);
        if (matches) return judged;
      }
    }
    return { reason: 'not_found' };
  } catch {
    return { reason: 'stripe_unavailable' };
  }
}
