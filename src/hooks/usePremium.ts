import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { getState, startCheckout, subscribe, syncEntitlement } from '@/lib/premium';

let synced = false;

export function usePremium() {
  const state = useSyncExternalStore(subscribe, getState, getState);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (synced) return;
    synced = true;
    void syncEntitlement();
  }, []);

  const handleUpgrade = useCallback(() => {
    setIsLoading(true);
    startCheckout();
    // If navigation is blocked or slow, release the button after a moment.
    setTimeout(() => setIsLoading(false), 4000);
  }, []);

  return {
    isPremium: state.status !== 'free',
    status: state.status,
    isChecking: state.checking,
    isLoading,
    handleUpgrade,
  };
}
