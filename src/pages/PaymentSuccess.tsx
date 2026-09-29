import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, Loader2, Zap, ArrowLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePremium } from '@/hooks/usePremium';

type VerificationState = 'checking' | 'verified' | 'failed';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { verifySession } = usePremium();
  const [state, setState] = useState<VerificationState>('checking');

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      if (!sessionId) {
        if (!cancelled) setState('failed');
        return;
      }

      const ok = await verifySession(sessionId);
      if (!cancelled) setState(ok ? 'verified' : 'failed');
    };

    void verify();
    return () => {
      cancelled = true;
    };
  }, [sessionId, verifySession]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        <div className="bg-card border border-border rounded-xl p-8">
          {state === 'checking' && (
            <>
              <Loader2 className="w-12 h-12 text-primary mx-auto mb-5 animate-spin" />
              <h1 className="text-2xl font-display font-bold text-foreground mb-2">Verifying payment</h1>
              <p className="text-muted-foreground">Confirming your Stripe Checkout session before unlocking Premium.</p>
            </>
          )}

          {state === 'verified' && (
            <>
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground mb-2">Premium unlocked</h1>
              <p className="text-muted-foreground mb-6">
                Your payment was verified. Premium features are active on this device.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium mb-6">
                <Zap className="w-4 h-4" />
                <span>Verified paid access</span>
              </div>
              <Link
                to="/"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-display font-semibold hover:opacity-90 transition-opacity"
              >
                <ArrowLeft className="w-4 h-4" />
                Open Premium Workspace
              </Link>
            </>
          )}

          {state === 'failed' && (
            <>
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground mb-2">Payment not verified</h1>
              <p className="text-muted-foreground mb-6">
                Premium was not unlocked because this checkout session could not be verified as paid.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 border border-border px-6 py-3 rounded-lg font-display font-semibold hover:bg-secondary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to PromptGrade
              </Link>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
