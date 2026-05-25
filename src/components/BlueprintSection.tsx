import { motion } from 'framer-motion';

const steps = [
  { num: 1, label: 'ROLE', desc: 'Who is the AI?', emoji: '🎭' },
  { num: 2, label: 'CONTEXT', desc: "What's the situation?", emoji: '🌍' },
  { num: 3, label: 'TASK', desc: 'What exactly to do?', emoji: '📋' },
  { num: 4, label: 'FORMAT', desc: 'How to structure output?', emoji: '📐' },
  { num: 5, label: 'TONE', desc: 'What voice/style?', emoji: '🎨' },
  { num: 6, label: 'SCOPE', desc: 'Length & boundaries?', emoji: '📏' },
  { num: 7, label: 'EXAMPLES', desc: "Show, don't just tell", emoji: '💡' },
  { num: 8, label: 'GUARD', desc: 'What to avoid?', emoji: '🛡️' },
];

export default function BlueprintSection() {
  return (
    <section className="py-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
          🏗️ The Efficient Prompt Blueprint
        </h2>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Our proprietary framework referenced in every analysis. Master these 8 elements to craft perfect prompts.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {steps.map((step, i) => (
          <motion.div
            key={step.num}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="bg-gradient-card border border-border rounded-lg p-4 hover:border-primary/40 transition-colors group"
          >
            <div className="text-2xl mb-2">{step.emoji}</div>
            <div className="text-xs font-mono text-primary mb-1">{step.num}. {step.label}</div>
            <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{step.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
