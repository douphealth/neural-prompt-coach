import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import type { DimensionScore } from '@/lib/promptAnalyzer';

function getBarColor(score: number) {
  if (score >= 80) return 'bg-primary';
  if (score >= 60) return 'bg-warning';
  if (score >= 40) return 'bg-accent';
  return 'bg-destructive';
}

export default function DimensionBreakdown({ dimensions }: { dimensions: DimensionScore[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-display font-semibold text-foreground">Detailed Breakdown</h3>
      {dimensions.map((d, i) => (
        <motion.div
          key={d.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="space-y-1.5"
        >
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">{d.emoji} {d.label}</span>
            <span className="font-mono text-muted-foreground">{d.score}/100</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${getBarColor(d.score)}`}
              initial={{ width: 0 }}
              animate={{ width: `${d.score}%` }}
              transition={{ delay: 0.2 + i * 0.05, duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{d.feedback}</p>
          {d.checks && d.checks.length > 0 && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none text-primary/80 hover:text-primary">Why this score</summary>
              <ul className="mt-1.5 space-y-1 pl-1">
                {d.checks.map((c) => (
                  <li key={c.label} className="flex items-start gap-1.5">
                    {c.passed ? (
                      <Check className="w-3.5 h-3.5 mt-px shrink-0 text-primary" aria-label="passed" />
                    ) : (
                      <X className="w-3.5 h-3.5 mt-px shrink-0 text-muted-foreground/50" aria-label="not met" />
                    )}
                    <span className={c.passed ? 'text-foreground/90' : ''}>
                      {c.label}{' '}
                      <span className="font-mono">({c.points > 0 ? '+' : ''}{c.points})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </motion.div>
      ))}
    </div>
  );
}
