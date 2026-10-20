import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, AlertTriangle, Loader2, ArrowLeft } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyPremiumPurchase } from "@/hooks/usePremium";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sid = params.get("session_id") ?? "";
  const [state, setState] = useState<"checking" | "verified" | "unverified">("checking");

  useEffect(() => {
    let active = true;
    if (!sid) { setState("unverified"); return; }
    void verifyPremiumPurchase(sid).then(valid => {
      if (!active) return;
      if (valid) {
        localStorage.setItem("promptgrade_session_id", sid);
        setState("verified");
      } else {
        setState("unverified");
      }
    }).catch(() => { if (active) setState("unverified"); });
    return () => { active = false; };
  }, [sid]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md w-full text-center">
        <div className="bg-card border border-border rounded-xl p-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            {state === "checking" ? <Loader2 className="w-8 h-8 animate-spin text-primary" /> :
              state === "verified" ? <CheckCircle className="w-8 h-8 text-primary" /> :
              <AlertTriangle className="w-8 h-8 text-amber-500" />}
          </div>
          <h1 className="text-2xl font-display font-bold mb-3">
            {state === "checking" ? "Checking your payment…" : state === "verified" ? "Payment verified" : "Unable to verify payment"}
          </h1>
          <p className="text-muted-foreground mb-6">
            {state === "verified"
              ? "Your Stripe payment was verified. Premium is available in this browser while your purchase remains valid."
              : state === "checking"
                ? "Securely confirming your purchase with Stripe."
                : "Your premium access has not been activated. If you paid, please contact support with your Stripe receipt; do not pay again yet."}
          </p>
          <Link to="/" className="inline-flex gap-2 items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg">
            <ArrowLeft className="w-4 h-4" /> Back to PromptGrade
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
