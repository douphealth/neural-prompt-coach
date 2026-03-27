import { motion } from 'framer-motion';
import type { Annotation } from '@/lib/promptAnalyzer';

const typeConfig = {
  error: { icon: '🔴', className: 'border-destructive/30 bg-destructive/5' },
  warning: { icon: '⚠️', className: 'border-warning/30 bg-warning/5' },
  info: { icon: '🔵', className: 'border-info/30 bg-info/5' },
  success: { icon: '✅', className: 'border-primary/30 bg-primary/5' },
};

export default function AnnotationList({ annotations }: { annotations: Annotation[] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-display font-semibold text-foreground">Line-by-Line Annotations</h3>
      {annotations.map((a, i) => {
        const config = typeConfig[a.type];
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`rounded-lg border p-4 ${config.className}`}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg">{config.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm text-foreground font-medium">{a.text}</p>
                <p className="text-sm text-muted-foreground mt-1">💡 {a.suggestion}</p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
