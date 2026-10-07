import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_ORIGIN = "https://promptgrade.efficientgptprompts.com";
const ALLOWED_ORIGINS = new Set([
  DEFAULT_ORIGIN,
  "https://www.promptgrade.efficientgptprompts.com",
  "http://localhost:5173",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!secretKey) throw new Error("Stripe is not configured.");

    const stripe = new Stripe(secretKey, {
      apiVersion: "2025-08-27.basil",
    });

    const requestOrigin = req.headers.get("origin") || DEFAULT_ORIGIN;
    const origin = ALLOWED_ORIGINS.has(requestOrigin) ? requestOrigin : DEFAULT_ORIGIN;
    const priceId = Deno.env.get("STRIPE_PROMPTGRADE_PRICE_ID") || "price_1ULclVByiix0wtyT2nZtIAdW";

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=true`,
      metadata: {
        app: "promptgrade",
        entitlement: "premium_lifetime",
      },
      payment_intent_data: {
        metadata: {
          app: "promptgrade",
          entitlement: "premium_lifetime",
        },
      },
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create checkout session.";
    console.error("create-payment failed", message);

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
