import type { ModelMatch } from '@/lib/promptAnalyzer';

const levelConfig = {
  excellent: { dot: '🟢', className: 'text-primary' },
  good: { dot: '🟡', className: 'text-warning' },
  poor: { dot: '🔴', className: 'text-destructive' },
};

export default function ModelMatchIndicator({ matches }: { matches: ModelMatch[] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-display font-semibold text-foreground">Model Match Indicator</h3>
      <div className="space-y-2">
        {matches.map((m) => {
          const config = levelConfig[m.level];
          return (
            <div key={m.model} className="flex items-center gap-3 text-sm">
              <span>{config.dot}</span>
              <span className="font-medium text-foreground min-w-[160px]">{m.model}</span>
              <span className="text-muted-foreground">{m.note}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
