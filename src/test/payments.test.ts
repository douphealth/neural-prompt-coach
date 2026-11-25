// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any -- test assertions on JSON bodies */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequestPost as verifyPost } from '../../functions/api/verify-session';
import { onRequestPost as restorePost } from '../../functions/api/restore';
import { onRequestPost as licensePost } from '../../functions/api/license';
import { signLicense, verifyLicense } from '../../functions/_lib/license';
import { normaliseProof } from '../../functions/_lib/stripe';
import type { Env } from '../../functions/_lib/env';

const PLINK = 'plink_TEST123';
const SECRET = 'x'.repeat(40);
const env: Env = { STRIPE_SECRET_KEY: 'rk_test_dummy', PROMPTGRADE_PAYMENT_LINK_ID: PLINK, LICENSE_SIGNING_SECRET: SECRET };
const ORIGIN = 'https://promptgrade.efficientgptprompts.com';

function session(over: Record<string, unknown> = {}) {
  return {
    id: 'cs_test_abcdefghijklmnop',
    object: 'checkout.session',
    status: 'complete',
    mode: 'payment',
    payment_status: 'paid',
    payment_link: PLINK,
    amount_total: 799,
    currency: 'usd',
    created: 1764000000,
    customer_details: { email: 'buyer@example.com' },
    payment_intent: {
      id: 'pi_abcdefghijklmnop',
      latest_charge: { refunded: false, amount: 799, amount_refunded: 0, receipt_url: 'https://pay.stripe.com/receipts/x', receipt_number: '1234-5678' },
    },
    ...over,
  };
}

function req(path: string, body: unknown, origin: string | null = ORIGIN, ip = '203.0.113.' + Math.floor(Math.random() * 250)) {
  const headers: Record<string, string> = { 'content-type': 'application/json', 'cf-connecting-ip': ip };
  if (origin) headers.origin = origin;
  return new Request(`${ORIGIN}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
}

let stripeResponse: { status: number; body: unknown };
const fetchMock = vi.fn(async (url: string | URL | Request) => {
  const u = String(url);
  if (!u.startsWith('https://api.stripe.com/')) throw new Error('unexpected fetch ' + u);
  return new Response(JSON.stringify(stripeResponse.body), { status: stripeResponse.status, headers: { 'content-type': 'application/json' } });
});

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockClear();
  stripeResponse = { status: 200, body: session() };
});
afterEach(() => vi.unstubAllGlobals());

describe('license tokens', () => {
  it('round-trips and rejects tampering', async () => {
    const t = await signLicense(SECRET, 'cs_test_abcdefghijklmnop');
    expect((await verifyLicense(SECRET, t))?.sid).toBe('cs_test_abcdefghijklmnop');
    const [body, sig] = t.split('.');
    const forged = btoa(JSON.stringify({ v: 1, sid: 'cs_test_zzzzzzzzzzzzzz', iat: 1 })).replace(/=+$/, '');
    expect(await verifyLicense(SECRET, `${forged}.${sig}`)).toBeNull();
    expect(await verifyLicense('y'.repeat(40), t)).toBeNull();
    expect(await verifyLicense(SECRET, body)).toBeNull();
    expect(await verifyLicense(SECRET, 'true')).toBeNull();
  });
});

describe('POST /api/verify-session', () => {
  it('rejects requests from other origins', async () => {
    const r = await verifyPost({ request: req('/api/verify-session', { sessionId: 'cs_test_abcdefghijklmnop' }, 'https://evil.example'), env });
    expect(r.status).toBe(403);
  });

  it('reports not_configured when Stripe is not configured, and never unlocks', async () => {
    const r = await verifyPost({ request: req('/api/verify-session', { sessionId: 'cs_test_abcdefghijklmnop' }), env: {} });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: false, error: 'not_configured' });
  });

  it('issues a license for a paid session of the PromptGrade Payment Link', async () => {
    const r = await verifyPost({ request: req('/api/verify-session', { sessionId: 'cs_test_abcdefghijklmnop' }), env });
    const j = (await r.json()) as any;
    expect(j.ok).toBe(true);
    expect((await verifyLicense(SECRET, j.license))?.sid).toBe('cs_test_abcdefghijklmnop');
    expect(j.order).toMatchObject({ reference: 'pi_abcdefghijklmnop', receiptNumber: '1234-5678', amountTotal: 799, currency: 'usd' });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/v1/checkout/sessions/cs_test_abcdefghijklmnop');
  });

  it.each([
    ['unpaid', { payment_status: 'unpaid', status: 'open' }, 'not_paid'],
    ['another product', { payment_link: 'plink_OTHER' }, 'wrong_product'],
    ['refunded', { payment_intent: { id: 'pi_x1234567890', latest_charge: { refunded: true, amount: 799, amount_refunded: 799 } } }, 'refunded'],
  ])('refuses a %s session', async (_name, over, reason) => {
    stripeResponse = { status: 200, body: session(over) };
    const j = (await (await verifyPost({ request: req('/api/verify-session', { sessionId: 'cs_test_abcdefghijklmnop' }), env })).json()) as any;
    expect(j).toEqual({ ok: false, error: reason });
  });

  it('refuses made-up session ids without calling Stripe', async () => {
    for (const sessionId of ['sandbox_mock_ref', 'anything', '', 'cs_live_../../x']) {
      const r = await verifyPost({ request: req('/api/verify-session', { sessionId }), env });
      expect(((await r.json()) as any).ok).toBe(false);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports not_found when Stripe does not know the session', async () => {
    stripeResponse = { status: 404, body: { error: { message: 'No such checkout.session' } } };
    const j = (await (await verifyPost({ request: req('/api/verify-session', { sessionId: 'cs_test_abcdefghijklmnop' }), env })).json()) as any;
    expect(j).toEqual({ ok: false, error: 'not_found' });
  });
});

describe('POST /api/restore', () => {
  it('restores with email + receipt number', async () => {
    stripeResponse = { status: 200, body: { object: 'list', data: [session()] } };
    const j = (await (await restorePost({ request: req('/api/restore', { email: 'buyer@example.com', proof: 'Receipt #1234-5678' }), env })).json()) as any;
    expect(j.ok).toBe(true);
    const url = String(fetchMock.mock.calls[0][0]);
    // Stripe rejects payment_link + customer_details together (HTTP 400), so only the email filter is sent.
    expect(url).not.toContain('payment_link=');
    expect(url).toContain('customer_details%5Bemail%5D=buyer%40example.com');
  });

  it('does not restore a purchase made through another Payment Link', async () => {
    stripeResponse = { status: 200, body: { object: 'list', data: [session({ payment_link: 'plink_OTHER' })] } };
    const j = (await (await restorePost({ request: req('/api/restore', { email: 'buyer@example.com', proof: '1234-5678' }), env })).json()) as any;
    expect(j).toEqual({ ok: false, error: 'no_match' });
  });

  it('restores with email + order reference', async () => {
    stripeResponse = { status: 200, body: { object: 'list', data: [session()] } };
    const j = (await (await restorePost({ request: req('/api/restore', { email: 'buyer@example.com', proof: 'pi_abcdefghijklmnop' }), env })).json()) as any;
    expect(j.ok).toBe(true);
  });

  it('gives the same answer for a wrong proof and an unknown email', async () => {
    stripeResponse = { status: 200, body: { object: 'list', data: [session()] } };
    const wrong = (await (await restorePost({ request: req('/api/restore', { email: 'buyer@example.com', proof: '9999-9999' }), env })).json()) as any;
    stripeResponse = { status: 200, body: { object: 'list', data: [] } };
    const unknown = (await (await restorePost({ request: req('/api/restore', { email: 'nobody@example.com', proof: '1234-5678' }), env })).json()) as any;
    expect(wrong).toEqual({ ok: false, error: 'no_match' });
    expect(unknown).toEqual(wrong);
  });

  it('does not restore a refunded purchase', async () => {
    stripeResponse = {
      status: 200,
      body: { object: 'list', data: [session({ payment_intent: { id: 'pi_abcdefghijklmnop', latest_charge: { refunded: true, receipt_number: '1234-5678' } } })] },
    };
    const j = (await (await restorePost({ request: req('/api/restore', { email: 'buyer@example.com', proof: '1234-5678' }), env })).json()) as any;
    expect(j.ok).toBe(false);
  });

  it('rate-limits repeated attempts from one IP', async () => {
    stripeResponse = { status: 200, body: { object: 'list', data: [] } };
    const errors: string[] = [];
    for (let i = 0; i < 7; i++) {
      const r = await restorePost({ request: req('/api/restore', { email: 'a@example.com', proof: '1234-5678' }, ORIGIN, '198.51.100.7'), env });
      errors.push(((await r.json()) as any).error);
    }
    expect(errors.slice(0, 5).every((e) => e === 'no_match')).toBe(true);
    expect(errors.slice(5)).toEqual(['rate_limited', 'rate_limited']);
    expect(fetchMock).toHaveBeenCalledTimes(5); // one Stripe lookup per allowed attempt; none after the limit
  });
});

describe('POST /api/license', () => {
  it('accepts a valid license for a still-paid purchase', async () => {
    const license = await signLicense(SECRET, 'cs_test_abcdefghijklmnop');
    const j = (await (await licensePost({ request: req('/api/license', { license }), env })).json()) as any;
    expect(j).toMatchObject({ ok: true, valid: true, rechecked: true });
  });

  it('revokes a license after a refund', async () => {
    const license = await signLicense(SECRET, 'cs_test_abcdefghijklmnop');
    stripeResponse = { status: 200, body: session({ payment_intent: { id: 'pi_x1234567890', latest_charge: { refunded: true } } }) };
    const j = (await (await licensePost({ request: req('/api/license', { license }), env })).json()) as any;
    expect(j).toMatchObject({ ok: true, valid: false, reason: 'refunded' });
  });

  it('keeps a valid license when Stripe is down', async () => {
    const license = await signLicense(SECRET, 'cs_test_abcdefghijklmnop');
    stripeResponse = { status: 500, body: {} };
    const j = (await (await licensePost({ request: req('/api/license', { license }), env })).json()) as any;
    expect(j).toMatchObject({ ok: true, valid: true, rechecked: false });
  });

  it('rejects a forged license', async () => {
    const j = (await (await licensePost({ request: req('/api/license', { license: 'abc.def' }), env })).json()) as any;
    expect(j).toMatchObject({ ok: true, valid: false });
  });
});

describe('normaliseProof', () => {
  it('accepts receipt numbers and Stripe ids, rejects anything else', () => {
    expect(normaliseProof('#1234-5678')).toEqual({ kind: 'receipt', value: '1234-5678' });
    expect(normaliseProof(' Receipt #1234-5678 ')).toEqual({ kind: 'receipt', value: '1234-5678' });
    expect(normaliseProof('pi_abcdefghijklmnop')?.kind).toBe('payment_intent');
    expect(normaliseProof('cs_live_abcdefghijklmnop')?.kind).toBe('session');
    expect(normaliseProof('hello')).toBeNull();
  });
});
