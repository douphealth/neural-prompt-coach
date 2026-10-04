import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Stripe premium security invariants", () => {
  it("requires the Stripe price to come from server-side configuration", () => {
    const checkout = source("supabase/functions/create-payment/index.ts");
    const verify = source("supabase/functions/verify-payment/index.ts");

    expect(checkout).toContain('Deno.env.get("STRIPE_PRICE_ID")');
    expect(verify).toContain('Deno.env.get("STRIPE_PRICE_ID")');
    expect(checkout).not.toMatch(/price_[A-Za-z0-9]{10,}/);
    expect(verify).not.toMatch(/price_[A-Za-z0-9]{10,}/);
  });

  it("returns and persists the Checkout Session id before redirect", () => {
    const checkout = source("supabase/functions/create-payment/index.ts");
    const premium = source("src/hooks/usePremium.ts");

    expect(checkout).toContain("sessionId: session.id");
    expect(premium).toContain("localStorage.setItem(SESSION_KEY, data.sessionId)");
    expect(premium).toContain("window.location.assign(data.url)");
  });

  it("unlocks premium only after server-side paid-session verification", () => {
    const verify = source("supabase/functions/verify-payment/index.ts");
    const premium = source("src/hooks/usePremium.ts");

    expect(verify).toContain('session.mode === "payment"');
    expect(verify).toContain('session.payment_status === "paid"');
    expect(verify).toContain('session.metadata?.product === "promptgrade"');
    expect(verify).toContain('session.metadata?.entitlement === "premium_lifetime"');
    expect(verify).toContain("purchasedExpectedPrice");
    expect(premium).toContain("data?.isPremium === true");
    expect(premium).not.toContain("promptgrade_premium', 'true");
  });

  it("verifies Stripe webhook signatures", () => {
    const webhook = source("supabase/functions/stripe-webhook/index.ts");

    expect(webhook).toContain('req.headers.get("stripe-signature")');
    expect(webhook).toContain("constructEventAsync");
    expect(webhook).toContain('Deno.env.get("STRIPE_WEBHOOK_SECRET")');
  });
});
