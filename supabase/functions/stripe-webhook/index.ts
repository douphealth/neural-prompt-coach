import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!secretKey || !webhookSecret) {
    console.error("Stripe webhook secrets are not configured");
    return new Response("Webhook not configured", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing Stripe signature", { status: 400 });

  const stripe = new Stripe(secretKey, {
    apiVersion: "2025-08-27.basil",
  });

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.product === "promptgrade") {
          console.log("Verified PromptGrade payment event", {
            eventId: event.id,
            sessionId: session.id,
            paymentStatus: session.payment_status,
          });
        }
        break;
      }
      case "checkout.session.async_payment_failed":
      case "charge.refunded":
        console.log("PromptGrade payment state changed", { eventId: event.id, type: event.type });
        break;
      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("stripe-webhook verification failed", error);
    return new Response("Invalid webhook signature", { status: 400 });
  }
});
