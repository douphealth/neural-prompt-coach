import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_APP_URL = "https://promptgrade.efficientgptprompts.com";
const DEFAULT_PRICE_ID = "price_1THnf7GCqwm95OGXXgpeoKIc";

serve(async (req) => {
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
    const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!secretKey) throw new Error("Stripe is not configured.");

    const appUrl = (Deno.env.get("APP_URL") || DEFAULT_APP_URL).replace(/\/$/, "");
    const priceId = Deno.env.get("STRIPE_PRICE_ID") || DEFAULT_PRICE_ID;

    const stripe = new Stripe(secretKey, {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_creation: "always",
      billing_address_collection: "auto",
      metadata: {
        product: "promptgrade",
        entitlement: "premium_lifetime",
      },
      payment_intent_data: {
        metadata: {
          product: "promptgrade",
          entitlement: "premium_lifetime",
        },
      },
      success_url: `${appUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?checkout=canceled`,
    });

    if (!session.url) throw new Error("Stripe did not return a Checkout URL.");

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-payment error", error);
    return new Response(JSON.stringify({ error: "Unable to start checkout." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
