import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXPECTED_PRICE_ID = Deno.env.get("STRIPE_PROMPTGRADE_PRICE_ID") || "price_1ULclVByiix0wtyT2nZtIAdW";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ verified: false, error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!secretKey) throw new Error("Stripe is not configured.");

    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body?.session_id === "string" ? body.session_id.trim() : "";

    if (!sessionId || !sessionId.startsWith("cs_")) {
      return new Response(JSON.stringify({ verified: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });

    const hasExpectedPrice = session.line_items?.data?.some(
      (item) => item.price?.id === EXPECTED_PRICE_ID && item.quantity === 1,
    );

    const verified =
      session.mode === "payment" &&
      session.payment_status === "paid" &&
      session.status === "complete" &&
      session.metadata?.app === "promptgrade" &&
      session.metadata?.entitlement === "premium_lifetime" &&
      hasExpectedPrice === true;

    return new Response(JSON.stringify({ verified }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to verify checkout session.";
    console.error("verify-payment failed", message);

    return new Response(JSON.stringify({ verified: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
