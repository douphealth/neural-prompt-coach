import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function usePremium() {
  const [isLoading, setIsLoading] = useState(false);
  const isPremium = localStorage.getItem('promptgrade_premium') === 'true';

  const handleUpgrade = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast({
        title: 'Payment Error',
        description: err.message || 'Could not start checkout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isPremium, isLoading, handleUpgrade };
}
