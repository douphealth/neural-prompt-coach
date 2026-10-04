import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const SESSION_KEY = 'promptgrade_checkout_session_id';

export function usePremium() {
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  const verifySession = useCallback(async (sessionId: string) => {
    if (!sessionId || !sessionId.startsWith('cs_')) {
      setIsPremium(false);
      return false;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { sessionId },
      });

      if (error) throw error;

      const verified = data?.isPremium === true;
      setIsPremium(verified);

      if (verified) {
        localStorage.setItem(SESSION_KEY, sessionId);
      } else {
        localStorage.removeItem(SESSION_KEY);
      }

      return verified;
    } catch (error) {
      console.error('Premium verification failed', error);
      setIsPremium(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    void verifySession(sessionId);
  }, [verifySession]);

  const handleUpgrade = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {},
      });

      if (error) throw error;
      if (!data?.url || !data?.sessionId) {
        throw new Error('Checkout did not return a valid redirect session.');
      }

      localStorage.setItem(SESSION_KEY, data.sessionId);
      window.location.assign(data.url);
    } catch (error: unknown) {
      console.error('Checkout initialization failed', error);
      toast({
        title: 'Checkout unavailable',
        description: error instanceof Error ? error.message : 'We could not start Stripe Checkout. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  }, []);

  return { isPremium, isLoading, handleUpgrade, verifySession };
}
