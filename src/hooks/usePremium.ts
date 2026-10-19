import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const SESSION_KEY = "promptgrade_session_id";

/**
 * UI convenience only: real premium authorization must also be checked on every
 * server-side premium API operation. Never trust a localStorage Boolean.
 */
export async function verifyPremiumPurchase(sessionId: string): Promise<boolean> {
  if (!/^cs_(live|test)_[a-zA-Z0-9]{10,200}$/.test(sessionId)) return false;
  const { data, error } = await supabase.functions.invoke("verify-payment", {
    body: { session_id: sessionId },
  });
  if (error) return false;
  return data?.entitled === true && data?.verified === true;
}

export function usePremium() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    let active = true;
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      void verifyPremiumPurchase(savedSession).then((valid) => {
        if (active) setIsPremium(valid);
      }).catch(() => {
        if (active) setIsPremium(false);
      });
    }
    return () => { active = false; };
  }, []);

  const handleUpgrade = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment");
      if (error || !data?.url) throw new Error("Checkout is temporarily unavailable.");
      const target = new URL(data.url);
      if (target.protocol !== "https:" || target.hostname !== "checkout.stripe.com") {
        throw new Error("Unexpected payment destination.");
      }
      window.location.assign(target.href);
    } catch {
      // Security invariant: a failed checkout NEVER upgrades an account.
      toast({
        title: "Secure checkout unavailable",
        description: "Please try again later. No premium access has been granted and you have not been charged by this action.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDowngrade = useCallback(() => {
    // Clear this browser's purchase session, not the actual Stripe purchase.
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("promptgrade_premium");
    setIsPremium(false);
    toast({ title: "Session cleared", description: "Your purchase is not cancelled." });
  }, []);

  return { isPremium, isLoading, handleUpgrade, handleDowngrade };
}
