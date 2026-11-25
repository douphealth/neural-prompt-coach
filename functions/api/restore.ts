// POST /api/restore { email, proof, turnstileToken? }
// Restores Premium on a new device. The buyer gives the email used at checkout plus one
// proof only they have: the receipt number (from the Stripe receipt email, e.g. 1234-5678)
// or the order reference shown on the success page (pi_... or cs_...).
// The response never says whether an email exists, to avoid leaking who bought.
import { isConfigured, resolveEnv, type Env } from '../_lib/env';
import { json, originAllowed, rateLimit, readJson, turnstileOk } from '../_lib/http';
import { signLicense } from '../_lib/license';
import { findPurchaseByEmail } from '../_lib/stripe';

interface Ctx {
  request: Request;
  env: Env;
}

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

export async function onRequestPost({ request, env: rawEnv }: Ctx): Promise<Response> {
  const env = resolveEnv(rawEnv);
  if (!originAllowed(request, env)) return json({ ok: false, error: 'forbidden' }, 403);
  if (!(await rateLimit(request, env, 'restore', 5, 600))) return json({ ok: false, error: 'rate_limited' });
  if (!isConfigured(env)) return json({ ok: false, error: 'not_configured' });

  const body = await readJson<{ email?: unknown; proof?: unknown; turnstileToken?: unknown }>(request);
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const proof = typeof body?.proof === 'string' ? body.proof.trim() : '';
  if (!EMAIL_RE.test(email) || proof.length < 9 || proof.length > 210) return json({ ok: false, error: 'invalid' });
  if (!(await turnstileOk(request, env, body?.turnstileToken))) return json({ ok: false, error: 'challenge_failed' });

  const result = await findPurchaseByEmail(env, email, proof);
  if (result.reason === 'stripe_unavailable') return json({ ok: false, error: 'stripe_unavailable' });
  if (result.reason === 'invalid') return json({ ok: false, error: 'invalid' });
  if (result.reason !== 'ok' || !result.purchase) return json({ ok: false, error: 'no_match' });

  return json({ ok: true, license: await signLicense(env.LICENSE_SIGNING_SECRET as string, result.purchase.sessionId) });
}

export const onRequest = () => json({ ok: false, error: 'method_not_allowed' }, 405, { allow: 'POST' });
