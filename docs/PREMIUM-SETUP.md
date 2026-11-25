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

## Current setup (done 2026-11-25, owner-approved)

### Hosting topology (verified)

- `promptgrade.efficientgptprompts.com` is answered by a **proxy Worker** that serves `robots.txt` itself and forwards everything else (including `POST /api/*` with body and `Origin`) to **`promptgrade-egp.gearup-flow-master.pages.dev`**.
- So production = Pages project **`gearup-flow-master`**, branch **`promptgrade-egp`**. That project's production branch is `main` (another app), so `promptgrade-egp` uses the project's **Preview** environment variables, which are shared with other apps' preview branches.
- The custom domain is also attached to Pages project `neural-prompt-coach-fixed` (production branch `main`), but the Worker answers first. It was given the same build and secrets (generic names) as a fallback.
- The Worker is not visible to the Cloudflare tokens used here; its `robots.txt` lacks `Disallow: /api/` (low impact: the API is POST-only).

### Stripe

- Payment Link `plink_1UCvLhGCqwm95OGXICH7bhZC` (price `price_1THnf7GCqwm95OGXXgpeoKIc`, $7.99, product `prod_UGKJM4JmlBhKWs`). Its After-payment redirect was already `https://promptgrade.efficientgptprompts.com/payment-success?session_id={CHECKOUT_SESSION_ID}`; not changed.
- Product description changed to honest copy (no "200+ templates").
- No webhook needed.
- Note: Stripe rejects `payment_link` and `customer_details[email]` in the same `checkout/sessions` list query, so restore filters by email and then checks the Payment Link itself.

### Pages variables (gearup-flow-master → Settings → Variables → **Preview**)

| Name | Value |
|---|---|
| `PROMPTGRADE_STRIPE_SECRET_KEY` | Stripe restricted key "new API restrictive key (22-11-2026)". **To do:** it can also write products; replace with a key that has only Read on Checkout Sessions, PaymentIntents, Charges, then redeploy. |
| `PROMPTGRADE_PAYMENT_LINK_ID` | `plink_1UCvLhGCqwm95OGXICH7bhZC` |
| `PROMPTGRADE_LICENSE_SIGNING_SECRET` | 64 random hex chars, not stored anywhere else. Changing it signs every buyer out (they can Restore). |

The functions read the `PROMPTGRADE_*` names first and fall back to `STRIPE_SECRET_KEY` / `LICENSE_SIGNING_SECRET`. Optional: `TURNSTILE_SECRET_KEY` (+ build var `VITE_TURNSTILE_SITE_KEY`), `RATE_LIMIT` KV binding.

### Deploy

```
npm ci && npm test && npm run build
# run from the repo root so ./functions is included
npx wrangler pages deploy dist --project-name gearup-flow-master --branch promptgrade-preview-20261125   # preview
npx wrangler pages deploy dist --project-name gearup-flow-master --branch promptgrade-egp                # production (live)
```

Then purge the Cloudflare cache for host `promptgrade.efficientgptprompts.com`. Deploying needs a token with Pages edit on account `5dc0401c…`.

### Verified on live after deploy (2026-11-25)

- `/payment-success?session_id=anything` → "Invalid order reference"; a well-formed unknown `cs_live_…` → "Order not found"; Premium stays locked.
- Restore with an unknown email → "couldn't match", nothing unlocked; foreign `Origin` → 403.
- "Go Premium" → Stripe "PromptGrade™ Premium $7.99" (not paid).
- Not yet verified: the paid path. **Owner:** make one real purchase, check the success page (order reference + receipt link), Restore in a private window with email + receipt number, then refund and confirm Premium ends within a day.

### Rollback

- Code: Cloudflare Pages → gearup-flow-master → Deployments → `9b32d950` (branch promptgrade-egp, 2026-09-07) → "Retry deployment" (re-publishes the old build to the branch), then purge the host. Note the old build lets anyone unlock Premium via `/payment-success?session_id=anything`.
- Secrets can stay; without the new code they are unused.
- Stripe description: restore the old text in the Dashboard (old text is in `CHANGELOG-AGENTS.md` in the site folder).

## Email features (off)

The email report and the emailed blueprint used the Supabase project `lljhmrkbkfewuejwkkkk`, whose hostname no longer resolves (checked 2026-11-25). Both are off by default (`VITE_ENABLE_EMAIL_SERVICES` unset). The blueprint PDF downloads directly. Turn the flag on only after an email backend is restored.
