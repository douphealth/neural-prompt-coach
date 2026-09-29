import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";

const DEFAULT_APP_URL = "https://promptgrade.efficientgptprompts.com";
const DEFAULT_PREMIUM_PRICE_ID = "price_1THnf7GCqwm95OGXXgpeoKIc";

function getAppOrigin() {
  const configured = Deno.env.get("APP_URL") || DEFAULT_APP_URL;
  try {
    return new URL(configured).origin;
  } catch {
    return DEFAULT_APP_URL;
  }
}

function getCorsHeaders(req: Request) {
  const appOrigin = getAppOrigin();
  const requestOrigin = req.headers.get("origin");
  const allowedOrigins = new Set([
    appOrigin,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]);
  const allowOrigin =
    requestOrigin && allowedOrigins.has(requestOrigin) ? requestOrigin : appOrigin;

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const premiumPriceId =
      Deno.env.get("STRIPE_PREMIUM_PRICE_ID") || DEFAULT_PREMIUM_PRICE_ID;

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    const appOrigin = getAppOrigin();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: premiumPriceId,
          quantity: 1,
        },
      ],
      customer_creation: "always",
      success_url: `${appOrigin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appOrigin}/?checkout=canceled`,
      metadata: {
        product: "promptgrade_lifetime_premium",
        price_id: premiumPriceId,
      },
      payment_intent_data: {
        metadata: {
          product: "promptgrade_lifetime_premium",
          price_id: premiumPriceId,
        },
      },
    });

    if (!session.url) {
      throw new Error("Stripe did not return a Checkout URL");
    }

    return new Response(
      JSON.stringify({ id: session.id, url: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error(
      "create-payment failed",
      error instanceof Error ? error.message : String(error),
    );

    return new Response(
      JSON.stringify({ error: "Unable to start secure checkout. Please try again." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
