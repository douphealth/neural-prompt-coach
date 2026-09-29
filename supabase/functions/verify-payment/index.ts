import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_PRICE_ID = "price_1THnf7GCqwm95OGXXgpeoKIc";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ isPremium: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!secretKey) throw new Error("Stripe is not configured.");

    const { sessionId } = await req.json();
    if (typeof sessionId !== "string" || !/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId)) {
      return new Response(JSON.stringify({ isPremium: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: "2025-08-27.basil",
    });
    const expectedPriceId = Deno.env.get("STRIPE_PRICE_ID") || DEFAULT_PRICE_ID;

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items.data.price"],
    });

    const purchasedExpectedPrice =
      session.line_items?.data?.some((item) => item.price?.id === expectedPriceId) ?? false;

    const isPremium =
      session.mode === "payment" &&
      session.payment_status === "paid" &&
      session.metadata?.product === "promptgrade" &&
      session.metadata?.entitlement === "premium_lifetime" &&
      purchasedExpectedPrice;

    return new Response(JSON.stringify({ isPremium }), {
      status: isPremium ? 200 : 402,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("verify-payment error", error);
    return new Response(JSON.stringify({ isPremium: false }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }
});
