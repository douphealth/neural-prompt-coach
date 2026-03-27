import { motion } from 'framer-motion';
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
          transition={{ delay: i * 0.08 }}
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
              transition={{ delay: 0.3 + i * 0.08, duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{d.feedback}</p>
        </motion.div>
      ))}
    </div>
  );
}
