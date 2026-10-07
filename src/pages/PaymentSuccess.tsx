import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

type VerificationState = 'checking' | 'verified' | 'failed';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [state, setState] = useState<VerificationState>('checking');

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      if (!sessionId) {
        setState('failed');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { session_id: sessionId },
        });

        if (error) throw error;
        if (cancelled) return;

        if (data?.verified === true) {
          localStorage.setItem('promptgrade_premium', 'true');
          localStorage.setItem('promptgrade_session_id', sessionId);
          setState('verified');
        } else {
          localStorage.removeItem('promptgrade_premium');
          localStorage.removeItem('promptgrade_session_id');
          setState('failed');
        }
      } catch (error) {
        console.error('Payment verification failed', error);
        if (!cancelled) setState('failed');
      }
    };

    void verify();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const isChecking = state === 'checking';
  const isVerified = state === 'verified';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        <div className="bg-card border border-border rounded-xl p-8 shadow-xl">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-primary/10">
            {isChecking ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            ) : isVerified ? (
              <CheckCircle className="w-8 h-8 text-primary" />
            ) : (
              <AlertCircle className="w-8 h-8 text-destructive" />
            )}
          </div>

          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            {isChecking ? 'Verifying your payment…' : isVerified ? 'Premium unlocked' : 'Payment could not be verified'}
          </h1>

          <p className="text-muted-foreground mb-6">
            {isChecking
              ? 'We are confirming your Stripe Checkout session securely.'
              : isVerified
                ? 'Your $7.99 one-time purchase is confirmed. Premium features are now enabled on this browser.'
                : 'No Premium access was granted. If Stripe charged you successfully, return to this page from the Stripe confirmation link and try again.'}
          </p>

          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-display font-semibold hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            {isVerified ? 'Open PromptGrade' : 'Return to PromptGrade'}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
