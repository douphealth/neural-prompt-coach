// POST /api/license { license }
// Checks a stored license: the signature must be valid, and the purchase must still be paid
// and not refunded in Stripe. If Stripe cannot be reached, a validly signed license stays
// valid (buyers are never locked out by an outage).
import { isConfigured, type Env } from '../_lib/env';
import { json, originAllowed, rateLimit, readJson } from '../_lib/http';
import { verifyLicense } from '../_lib/license';
import { verifySession } from '../_lib/stripe';

interface Ctx {
  request: Request;
  env: Env;
}

export async function onRequestPost({ request, env }: Ctx): Promise<Response> {
  if (!originAllowed(request, env)) return json({ ok: false, error: 'forbidden' }, 403);
  if (!(await rateLimit(request, env, 'license', 30, 600))) return json({ ok: false, error: 'rate_limited' });
  if (!isConfigured(env)) return json({ ok: false, error: 'not_configured' });

  const body = await readJson<{ license?: unknown }>(request);
  const payload = await verifyLicense(env.LICENSE_SIGNING_SECRET as string, body?.license);
  if (!payload) return json({ ok: true, valid: false, reason: 'bad_signature' });

  const result = await verifySession(env, payload.sid);
  if (result.reason === 'stripe_unavailable') return json({ ok: true, valid: true, rechecked: false });
  if (result.reason === 'refunded' || result.reason === 'not_paid' || result.reason === 'wrong_product' || result.reason === 'not_found') {
    return json({ ok: true, valid: false, reason: result.reason });
  }
  return json({ ok: true, valid: result.reason === 'ok', rechecked: true });
}

export const onRequest = () => json({ ok: false, error: 'method_not_allowed' }, 405, { allow: 'POST' });
