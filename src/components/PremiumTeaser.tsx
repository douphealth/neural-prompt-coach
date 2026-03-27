import { motion } from 'framer-motion';
import { Lock, Zap, BookOpen, GitBranch, Infinity, History } from 'lucide-react';

const premiumFeatures = [
  { icon: Zap, title: '5 Multi-Model Rewrites', desc: 'GPT-4o, Claude, Llama-optimized versions + Maximum Efficiency & Quality rewrites' },
  { icon: BookOpen, title: '200+ Premium Templates', desc: 'Full vault across 20+ professional categories, all rated 90+ PES™' },
  { icon: BookOpen, title: 'Prompt Engineering Masterclass', desc: '12 prompt patterns, model-specific secrets, and real-world case studies' },
  { icon: GitBranch, title: 'Prompt Chains Builder', desc: 'Build multi-step prompt workflows for complex tasks' },
  { icon: Infinity, title: 'Unlimited Analyses', desc: 'No daily cap. Analyze as many prompts as you want, forever.' },
  { icon: History, title: 'Export & History', desc: 'Save, compare, and export all your analyses. Track your improvement.' },
];

export default function PremiumTeaser() {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Glow background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
          <Lock className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Premium Zone</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
          Unlock the Full Power of PromptGrade™
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          Advanced multi-model rewrites, the complete 200+ template vault, the masterclass playbook, and unlimited analyses.
          <span className="text-primary font-bold"> One payment. Yours forever.</span>
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto mb-12">
        {premiumFeatures.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="bg-gradient-card border border-border rounded-lg p-5 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <f.icon className="w-6 h-6 text-primary mb-3 relative z-10" />
            <h4 className="font-display font-semibold text-foreground mb-1 relative z-10">{f.title}</h4>
            <p className="text-sm text-muted-foreground relative z-10">{f.desc}</p>
          </motion.div>
        ))}
      </div>

      <div className="text-center">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          className="bg-primary text-primary-foreground font-display font-bold text-lg px-10 py-4 rounded-xl glow-primary-strong hover:opacity-90 transition-opacity"
        >
          Unlock Premium — $7.99 Forever
        </motion.button>
        <p className="text-xs text-muted-foreground mt-3">One-time payment • No subscription • Instant access</p>
      </div>
    </section>
  );
}
