import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const PREMIUM_SESSION_KEY = 'promptgrade_session_id';
const PREMIUM_FLAG_KEY = 'promptgrade_premium';

async function verifyPremiumSession(sessionId: string) {
  const { data, error } = await supabase.functions.invoke('verify-payment', {
    body: { session_id: sessionId },
  });

  if (error) throw error;
  return data?.verified === true;
}

export function usePremium() {
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const restoreVerifiedEntitlement = async () => {
      const sessionId = localStorage.getItem(PREMIUM_SESSION_KEY);

      if (!sessionId) {
        localStorage.removeItem(PREMIUM_FLAG_KEY);
        if (!cancelled) {
          setIsPremium(false);
          setIsChecking(false);
        }
        return;
      }

      try {
        const verified = await verifyPremiumSession(sessionId);

        if (cancelled) return;

        if (verified) {
          localStorage.setItem(PREMIUM_FLAG_KEY, 'true');
          setIsPremium(true);
        } else {
          localStorage.removeItem(PREMIUM_FLAG_KEY);
          localStorage.removeItem(PREMIUM_SESSION_KEY);
          setIsPremium(false);
        }
      } catch (error) {
        console.error('Premium entitlement verification failed', error);
        if (!cancelled) {
          setIsPremium(false);
        }
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    };

    void restoreVerifiedEntitlement();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpgrade = useCallback(async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-payment');

      if (error) throw error;
      if (!data?.url || typeof data.url !== 'string') {
        throw new Error('Checkout URL was not returned.');
      }

      window.location.assign(data.url);
    } catch (error) {
      console.error('Stripe checkout initialization failed', error);
      toast({
        title: 'Checkout unavailable',
        description: 'We could not start Stripe Checkout. No payment was taken. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  }, []);

  const handleDowngrade = useCallback(() => {
    localStorage.removeItem(PREMIUM_FLAG_KEY);
    localStorage.removeItem(PREMIUM_SESSION_KEY);
    setIsPremium(false);

    toast({
      title: 'Premium access cleared on this device',
      description: 'Your verified local entitlement has been removed from this browser.',
    });
  }, []);

  return {
    isPremium,
    isLoading,
    isChecking,
    handleUpgrade,
    handleDowngrade,
  };
}
