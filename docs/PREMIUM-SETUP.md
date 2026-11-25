# PromptGrade Premium: verified unlock, restore and deployment

## How it works now

1. "Unlock Premium" opens the existing Stripe Payment Link (`https://buy.stripe.com/eVq28r1Li4CI0c5bn8ejK04`, $7.99). Nothing about the link or the price changes.
2. After payment, Stripe redirects to `/payment-success?session_id={CHECKOUT_SESSION_ID}`.
3. The page calls `POST /api/verify-session` (Cloudflare Pages Function). The function asks Stripe (read-only GET) whether that Checkout Session is complete, paid, made through the PromptGrade Payment Link, and not refunded.
4. If it is, the function returns a license signed with HMAC-SHA256, plus the order reference, receipt number and Stripe receipt link. The browser stores the license; Premium unlocks.
5. Once a day the app sends the license to `POST /api/license`, which checks the signature and re-checks Stripe (refunded → Premium ends). If Stripe or the API is unreachable, a validly signed license stays valid.
6. **Restore on a new device**: "Restore" → checkout email + receipt number (from the Stripe receipt email, e.g. `1234-5678`) or the order reference shown on the success page (`pi_…`). `POST /api/restore` searches the Payment Link's paid sessions for that email and issues a license only when the proof matches. The answer is the same for "unknown email" and "wrong proof".

What no longer unlocks Premium: visiting `/payment-success?session_id=anything`, a failed checkout, or setting `localStorage.promptgrade_premium = "true"` (after the grace date below).

Abuse protection: origin allow-list (production, `*.gearup-flow-master.pages.dev`, localhost), per-IP rate limits (verify 20 / 10 min, restore 5 / 10 min, license 30 / 10 min; durable if a `RATE_LIMIT` KV namespace is bound), 2 KB body limit, strict id formats, optional Cloudflare Turnstile on restore. There is no LLM API in PromptGrade: scoring is local, deterministic code, so there is no model key or model cost to protect.

## Existing buyers

Before this change, `/payment-success` set `localStorage.promptgrade_premium = "true"` and `promptgrade_session_id`.

- If a browser has a stored `cs_…` session id, it is verified with Stripe on first load and converted to a signed license silently.
- If it can't be verified (no session id, or the API isn't configured yet), Premium **stays unlocked** until `LEGACY_GRACE_UNTIL` (`2027-01-31`, in `src/lib/premium.ts`). A banner asks the buyer to confirm with Restore.
- Only when Stripe says definitively that the session was not paid, was refunded, or is another product does the legacy unlock end.

## What the owner needs to approve and set up (nothing below has been done)

### 1. Stripe (read-only key, no change to the Payment Link if the redirect is already set)

1. Find the Payment Link id (`plink_…`) for `buy.stripe.com/eVq28r1Li4CI0c5bn8ejK04` (Dashboard → Payment Links → the PromptGrade Premium link; the id is in the URL).
2. Check the link's **After payment** setting. It must redirect to
   `https://promptgrade.efficientgptprompts.com/payment-success?session_id={CHECKOUT_SESSION_ID}`.
   If it shows Stripe's confirmation page instead, changing it is a Stripe change that needs your approval.
3. Create a **restricted key** in the same Stripe account with **Read** on: Checkout Sessions, PaymentIntents, Charges. Nothing else.
4. Optional: Settings → Customer emails → "Successful payments" on, so buyers get a receipt number they can use for Restore.

No webhook is required: entitlement is checked against Stripe directly. (A webhook could be added later for analytics; that would be a Stripe change.)

### 2. Cloudflare Pages secrets (project `gearup-flow-master`)

Set for the environment that serves the `promptgrade-egp` branch (and for Preview, to test):

| Name | Value |
|---|---|
| `STRIPE_SECRET_KEY` | the restricted key from step 1.3 (`rk_live_…`) |
| `PROMPTGRADE_PAYMENT_LINK_ID` | the `plink_…` id |
| `LICENSE_SIGNING_SECRET` | 32+ random characters (e.g. `openssl rand -hex 32`); rotating it signs everyone out |
| `TURNSTILE_SECRET_KEY` (optional) | with build var `VITE_TURNSTILE_SITE_KEY`, adds a Turnstile check to Restore |
| `RATE_LIMIT` KV binding (optional) | durable rate limiting |

```
npx wrangler pages secret put STRIPE_SECRET_KEY --project-name gearup-flow-master
npx wrangler pages secret put PROMPTGRADE_PAYMENT_LINK_ID --project-name gearup-flow-master
npx wrangler pages secret put LICENSE_SIGNING_SECRET --project-name gearup-flow-master
```

### 3. Preview, then production

```
npm ci && npm test && npm run build
# preview (not production): run from the repo root so ./functions is included
npx wrangler pages deploy dist --project-name gearup-flow-master --branch promptgrade-preview-20261125
# production (needs owner approval): the branch the Worker proxies
npx wrangler pages deploy dist --project-name gearup-flow-master --branch promptgrade-egp
```

The custom domain is served by a Worker that proxies the `promptgrade-egp` branch alias. Check that it forwards `POST /api/*` with the request body and the `Origin` header unchanged. Then purge the Cloudflare cache for `promptgrade.efficientgptprompts.com`.

### 4. Verify after production deploy

- `/payment-success?session_id=anything` → "Order not found / Invalid", Premium stays locked.
- "Unlock Premium" → Stripe shows "PromptGrade™ Premium $7.99" (do not pay).
- One real purchase (by the owner, refundable) → success page shows the order reference and receipt link; Restore works in a private window with email + receipt number; refund → Premium ends within a day.

### Rollback

- Code: redeploy the previous build to `promptgrade-egp` (Cloudflare Pages → Deployments → previous deployment → "Rollback"), or `git revert` the merge commit and redeploy.
- Secrets can stay; without the new code they are unused.

## Email features (off)

The email report and the emailed blueprint used the Supabase project `lljhmrkbkfewuejwkkkk`, whose hostname no longer resolves (checked 2026-11-25). Both are off by default (`VITE_ENABLE_EMAIL_SERVICES` unset). The blueprint PDF downloads directly. Turn the flag on only after an email backend is restored.
