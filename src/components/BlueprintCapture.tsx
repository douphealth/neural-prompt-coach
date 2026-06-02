import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Mail, Check, X, Sparkles, Loader2, FileText, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const BLUEPRINT_URL = '/promptgrade-blueprint.pdf';

interface Props {
  open: boolean;
  onClose: () => void;
  variant?: 'modal' | 'inline';
}

export default function BlueprintCapture({ open, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = async () => {
    if (!isValid || status === 'loading') return;
    setStatus('loading');
    try {
      const { data, error } = await supabase.functions.invoke('send-blueprint', {
        body: { email: email.trim(), source: 'blueprint_download' },
      });
      if (error) throw error;
      setStatus('done');
      try { localStorage.setItem('promptgrade_blueprint_email', email.trim()); } catch {}
      // Trigger PDF download immediately
      const a = document.createElement('a');
      a.href = BLUEPRINT_URL;
      a.download = 'PromptGrade-Blueprint.pdf';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast({
        title: data?.emailed === false ? 'Download started' : 'Check your inbox',
        description: data?.emailed === false
          ? 'Your PDF is downloading. Email is queued and will arrive shortly.'
          : 'PDF downloading now — we also sent a copy to your inbox.',
      });
    } catch (err: any) {
      setStatus('idle');
      toast({
        title: 'Something went wrong',
        description: err?.message ?? 'Please try again in a moment.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg glass-card rounded-2xl border border-border/60 shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-7 pt-9">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-accent font-bold">Free · 18-page PDF</div>
                  <h2 className="text-xl font-display font-bold text-foreground leading-tight">The PromptGrade Blueprint</h2>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                The exact field guide we use to score 90+ on the PES™: the 8-dimension framework, 12 copy-paste power patterns, model-specific tuning for GPT/Claude/Gemini/Llama, and a 60-second daily checklist.
              </p>

              <ul className="space-y-1.5 mb-6">
                {[
                  '12 battle-tested prompt patterns with examples',
                  'Model-specific tuning for every frontier LLM',
                  '6 before/after rewrites you can steal today',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-xs text-foreground/80">
                    <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>

              {status !== 'done' ? (
                <>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submit()}
                      disabled={status === 'loading'}
                      className="w-full bg-secondary/40 border border-border/70 rounded-xl pl-10 pr-3 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all disabled:opacity-60"
                    />
                  </div>
                  <button
                    onClick={submit}
                    disabled={!isValid || status === 'loading'}
                    className="mt-3 w-full bg-primary text-primary-foreground font-display font-bold text-sm px-5 py-3.5 rounded-xl glow-primary-strong hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {status === 'loading' ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Preparing your PDF…</>
                    ) : (
                      <><Download className="w-4 h-4" /> Email Me the Blueprint</>
                    )}
                  </button>
                  <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/70 font-mono">
                    <ShieldCheck className="w-3 h-3 text-primary/60" />
                    No spam. One email, one PDF. Unsubscribe anytime.
                  </div>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-display font-bold text-foreground mb-1">Sent. Downloading now.</h3>
                  <p className="text-xs text-muted-foreground mb-4">A copy is on its way to <span className="text-primary font-mono">{email}</span>.</p>
                  <a
                    href={BLUEPRINT_URL}
                    download
                    className="inline-flex items-center gap-2 text-xs font-display font-bold text-primary hover:text-primary-glow transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Re-download PDF
                  </a>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}