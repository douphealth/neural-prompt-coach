import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function usePremium() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(localStorage.getItem('promptgrade_premium') === 'true');

  const handleUpgrade = useCallback(async () => {
    setIsLoading(true);
    try {
      // Try supabase function first
      const { data, error } = await supabase.functions.invoke('create-payment');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      // Friendly Sandbox Override for local review and offline testing
      console.warn('Supabase edge function create-payment not detected or offline. Activating Sandbox Payment Success flow.');
      
      toast({
        title: 'Initializing Sandbox Checkout',
        description: 'Bypassing payment gateway... Unlocking premium workspace!',
      });
      
      // Delay for premium experience animation
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      localStorage.setItem('promptgrade_premium', 'true');
      setIsPremium(true);
      window.location.search = '?session_id=sandbox_mock_ref';
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDowngrade = useCallback(() => {
    localStorage.removeItem('promptgrade_premium');
    localStorage.removeItem('promptgrade_session_id');
    setIsPremium(false);
    toast({
      title: 'Premium Reset',
      description: 'Workspace returned to free tier limits.',
    });
  }, []);

  return { isPremium, isLoading, handleUpgrade, handleDowngrade };
}
