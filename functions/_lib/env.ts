// Server-side configuration for the Premium purchase endpoints (Cloudflare Pages Functions).
// All secrets are Pages environment variables/secrets. Nothing here is shipped to the browser.

export interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

export interface Env {
  /** Stripe restricted key (read-only: Checkout Sessions, PaymentIntents, Charges) of the account that owns the Payment Link. */
  STRIPE_SECRET_KEY?: string;
  /** The Payment Link id (plink_...) behind https://buy.stripe.com/eVq28r1Li4CI0c5bn8ejK04. */
  PROMPTGRADE_PAYMENT_LINK_ID?: string;
  /** Random secret (32+ chars) used to sign Premium license tokens. Rotating it signs everyone out. */
  LICENSE_SIGNING_SECRET?: string;
  /** Optional comma-separated extra origins allowed to call the API (production + pages.dev are built in). */
  ALLOWED_ORIGINS?: string;
  /** Optional Cloudflare Turnstile secret; when set, /api/restore requires a valid Turnstile token. */
  TURNSTILE_SECRET_KEY?: string;
  /** Optional KV namespace for durable rate limiting (falls back to per-isolate memory). */
  RATE_LIMIT?: KVLike;
}

export function isConfigured(env: Env): boolean {
  return Boolean(
    env.STRIPE_SECRET_KEY &&
      env.PROMPTGRADE_PAYMENT_LINK_ID &&
      env.LICENSE_SIGNING_SECRET &&
      env.LICENSE_SIGNING_SECRET.length >= 32,
  );
}
