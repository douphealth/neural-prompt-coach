import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Zap, ArrowLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('promptgrade_premium', 'true');
      localStorage.setItem('promptgrade_session_id', sessionId);
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        <div className="bg-card border border-border rounded-xl p-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-8 h-8 text-primary" />
          </motion.div>

          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            Welcome to Premium! 🎉
          </h1>
          <p className="text-muted-foreground mb-6">
            You now have unlimited analyses, 200+ templates, multi-model rewrites, and the full masterclass.
          </p>

          <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium mb-6">
            <Zap className="w-4 h-4" />
            <span>Premium features are now unlocked</span>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-display font-semibold hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            Start Analyzing
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
