import { motion } from 'framer-motion';
import { Lock, Zap, BookOpen, GitBranch, BarChart3 } from 'lucide-react';
import { usePremium } from '@/hooks/usePremium';
import { FREE_DAILY_LIMIT, PREMIUM_PRICE_LABEL } from '@/lib/premium';

// Only features that Premium actually unlocks in this app.
const premiumFeatures = [
  { icon: Zap, title: 'Unlimited scans', desc: `No daily cap. The free plan includes ${FREE_DAILY_LIMIT} scans a day.` },
  { icon: GitBranch, title: 'Prompt Chains builder', desc: 'Build multi-step prompt workflows, starting from 3 ready-made pipelines.' },
  { icon: BookOpen, title: 'Prompt Engineering Masterclass', desc: '12 prompt patterns (chain of thought, few-shot, XML tags and more) with copyable examples.' },
  { icon: BarChart3, title: 'Workspace Analytics', desc: 'Charts of your score history and the dimensions you most often miss.' },
];

export default function PremiumTeaser({ onRestore }: { onRestore: () => void }) {
  const { isPremium, isLoading, handleUpgrade } = usePremium();

  if (isPremium) return null;

  return (
    <section className="py-16 relative overflow-hidden" aria-labelledby="premium-teaser-title">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
          <Lock className="w-4 h-4 text-primary" aria-hidden />
          <span className="text-sm font-medium text-primary">PromptGrade Premium</span>
        </div>
        <h2 id="premium-teaser-title" className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
          What Premium adds
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          Scoring, breakdowns, rewrites and the template library stay free. Premium adds the tools below.
          <span className="text-primary font-bold"> {PREMIUM_PRICE_LABEL} once, no subscription.</span>
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto mb-10">
        {premiumFeatures.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="bg-gradient-card border border-border rounded-lg p-5"
          >
            <f.icon className="w-6 h-6 text-primary mb-3" aria-hidden />
            <h3 className="font-display font-semibold text-foreground mb-1">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </div>

      <div className="text-center">
        <button
          onClick={handleUpgrade}
          disabled={isLoading}
          className="bg-primary text-primary-foreground font-display font-bold text-lg px-10 py-4 rounded-xl glow-primary-strong hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isLoading ? 'Opening Stripe…' : `Unlock Premium — ${PREMIUM_PRICE_LABEL} Forever`}
        </button>
        <p className="text-xs text-muted-foreground mt-3">
          One-time payment via Stripe · Works in this browser; restore on other devices with your receipt ·{' '}
          <button onClick={onRestore} className="underline hover:text-foreground">
            Restore purchase
          </button>
        </p>
      </div>
    </section>
  );
}
