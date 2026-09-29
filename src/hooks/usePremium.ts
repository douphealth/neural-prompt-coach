import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const SESSION_KEY = "promptgrade_session_id";

export function usePremium() {
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  const verifySession = useCallback(async (sessionId: string) => {
    const { data, error } = await supabase.functions.invoke("verify-payment", {
      body: { session_id: sessionId },
    });

    if (error || data?.premium !== true) {
      localStorage.removeItem(SESSION_KEY);
      setIsPremium(false);
      return false;
    }

    localStorage.setItem(SESSION_KEY, sessionId);
    setIsPremium(true);
    return true;
  }, []);

  useEffect(() => {
    let active = true;

    const restore = async () => {
      const sessionId = localStorage.getItem(SESSION_KEY);
      if (!sessionId) {
        if (active) setIsLoading(false);
        return;
      }

      try {
        await verifySession(sessionId);
      } catch {
        if (active) {
          localStorage.removeItem(SESSION_KEY);
          setIsPremium(false);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    restore();

    return () => {
      active = false;
    };
  }, [verifySession]);

  const handleUpgrade = useCallback(async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: {},
      });

      if (error) throw error;
      if (!data?.url || typeof data.url !== "string") {
        throw new Error("Secure checkout URL was not returned.");
      }

      window.location.assign(data.url);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Secure checkout is temporarily unavailable. Please try again.";

      toast({
        title: "Checkout unavailable",
        description: message,
        variant: "destructive",
      });

      setIsLoading(false);
    }
  }, []);

  return {
    isPremium,
    isLoading,
    handleUpgrade,
    verifySession,
  };
}
