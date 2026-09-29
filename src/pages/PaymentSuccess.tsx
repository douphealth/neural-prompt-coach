import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, Loader2, Zap, ArrowLeft } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type VerificationState = "verifying" | "verified" | "failed";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [state, setState] = useState<VerificationState>("verifying");
  const [message, setMessage] = useState("Verifying your Stripe payment securely...");

  useEffect(() => {
    let active = true;

    const verify = async () => {
      if (!sessionId) {
        if (active) {
          setState("failed");
          setMessage("No Stripe Checkout session was provided.");
        }
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { session_id: sessionId },
        });

        if (error || data?.premium !== true) {
          throw new Error("Stripe has not confirmed a paid Premium purchase.");
        }

        localStorage.setItem("promptgrade_session_id", sessionId);

        if (active) {
          setState("verified");
          setMessage("Payment confirmed. Premium access is active on this browser.");
        }
      } catch (err: unknown) {
        localStorage.removeItem("promptgrade_session_id");

        if (active) {
          setState("failed");
          setMessage(
            err instanceof Error
              ? err.message
              : "We could not verify this payment. Please retry from the app.",
          );
        }
      }
    };

    verify();

    return () => {
      active = false;
    };
  }, [sessionId]);

  const verified = state === "verified";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        <div className="bg-card border border-border rounded-xl p-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            {state === "verifying" ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            ) : verified ? (
              <CheckCircle className="w-8 h-8 text-primary" />
            ) : (
              <AlertCircle className="w-8 h-8 text-destructive" />
            )}
          </div>

          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            {state === "verifying"
              ? "Confirming Payment"
              : verified
                ? "Premium Activated"
                : "Payment Not Verified"}
          </h1>

          <p className="text-muted-foreground mb-6">{message}</p>

          {verified && (
            <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium mb-6">
              <Zap className="w-4 h-4" />
              <span>Unlimited scans and Premium workspace tools are unlocked</span>
            </div>
          )}

          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-display font-semibold hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            {verified ? "Open Premium Workspace" : "Return to PromptGrade"}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
