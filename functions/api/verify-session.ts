// POST /api/verify-session { sessionId }
// Called by /payment-success after Stripe redirects back. Confirms with Stripe that the
// Checkout Session is a paid, unrefunded purchase of the PromptGrade Payment Link, then
// returns a signed license. The browser is never trusted to say it paid.
import { isConfigured, type Env } from '../_lib/env';
import { json, originAllowed, rateLimit, readJson } from '../_lib/http';
import { signLicense } from '../_lib/license';
import { verifySession } from '../_lib/stripe';

interface Ctx {
  request: Request;
  env: Env;
}

export async function onRequestPost({ request, env }: Ctx): Promise<Response> {
  if (!originAllowed(request, env)) return json({ ok: false, error: 'forbidden' }, 403);
  if (!(await rateLimit(request, env, 'verify', 20, 600))) return json({ ok: false, error: 'rate_limited' });
  if (!isConfigured(env)) return json({ ok: false, error: 'not_configured' });

  const body = await readJson<{ sessionId?: unknown }>(request);
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : '';
  const result = await verifySession(env, sessionId);

  if (result.reason === 'stripe_unavailable') return json({ ok: false, error: 'stripe_unavailable' });
  if (result.reason !== 'ok' || !result.purchase) return json({ ok: false, error: result.reason });

  const p = result.purchase;
  return json({
    ok: true,
    license: await signLicense(env.LICENSE_SIGNING_SECRET as string, p.sessionId),
    order: {
      reference: p.paymentIntentId || p.sessionId,
      receiptNumber: p.receiptNumber,
      receiptUrl: p.receiptUrl,
      email: p.email,
      amountTotal: p.amountTotal,
      currency: p.currency,
      created: p.created,
    },
  });
}

export const onRequest = () => json({ ok: false, error: 'method_not_allowed' }, 405, { allow: 'POST' });
