import type { ModelMatch } from '@/lib/promptAnalyzer';

const levelConfig = {
  excellent: { dot: '🟢', className: 'text-primary' },
  good: { dot: '🟡', className: 'text-warning' },
  poor: { dot: '🔴', className: 'text-destructive' },
};

export default function ModelMatchIndicator({ matches }: { matches: ModelMatch[] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-display font-semibold text-foreground">Model readiness</h3>
      <p className="text-xs text-muted-foreground">A rule of thumb based on your score; PromptGrade does not run your prompt on these models.</p>
      <div className="space-y-2">
        {matches.map((m) => {
          const config = levelConfig[m.level];
          return (
            <div key={m.model} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
              <span aria-hidden>{config.dot}</span>
              <span className="font-medium text-foreground sm:min-w-[200px]">{m.model}</span>
              <span className="text-muted-foreground">{m.note}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
