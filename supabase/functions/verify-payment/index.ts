import Stripe from "https://esm.sh/stripe@18.5.0";
const ORIGIN = "https://promptgrade.efficientgptprompts.com";
const headers = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST" || req.headers.get("origin") !== ORIGIN) {
    return new Response(JSON.stringify({error:"Forbidden"}),{status:403,headers});
  }
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  const expectedPrice = Deno.env.get("PROMPTGRADE_PRICE_ID");
  if (!key || !expectedPrice) return new Response(JSON.stringify({error:"Payment verification unavailable"}),{status:503,headers});
  let id: string;
  try {
    const body = await req.json();
    id = String(body?.session_id ?? "");
    if (!/^cs_(live|test)_[a-zA-Z0-9]{10,200}$/.test(id)) throw new Error("invalid");
  } catch {
    return new Response(JSON.stringify({entitled:false,verified:false}),{status:400,headers});
  }
  try {
    const client = new Stripe(key,{apiVersion:"2025-08-27.basil"});
    const session = await client.checkout.sessions.retrieve(id, {expand:["payment_intent.latest_charge"]});
    if (session.mode !== "payment" || session.status !== "complete" || session.payment_status !== "paid") {
      return new Response(JSON.stringify({entitled:false,verified:false}),{headers});
    }
    const items = await client.checkout.sessions.listLineItems(id,{limit:100});
    if (!items.data.some(item => item.price?.id === expectedPrice && item.quantity && item.quantity > 0)) {
      return new Response(JSON.stringify({entitled:false,verified:false}),{headers});
    }
    const intent = session.payment_intent;
    const charge = typeof intent === "object" && intent && "latest_charge" in intent ? intent.latest_charge : null;
    if (!charge || typeof charge !== "object" || charge.refunded || (charge.amount > 0 && charge.amount_refunded >= charge.amount) || charge.disputed) {
      return new Response(JSON.stringify({entitled:false,verified:false}),{headers});
    }
    return new Response(JSON.stringify({entitled:true,verified:true}),{headers});
  } catch {
    return new Response(JSON.stringify({error:"Verification temporarily unavailable"}),{status:503,headers});
  }
});
