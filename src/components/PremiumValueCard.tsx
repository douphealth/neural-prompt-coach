import { Check, Lock } from 'lucide-react';
import { FREE_DAILY_LIMIT, PREMIUM_PRICE_LABEL } from '@/lib/premium';

// Only features that are actually gated behind Premium in this app are listed.
const PREMIUM_ADDS = [
  `Unlimited scans (free: ${FREE_DAILY_LIMIT} a day)`,
  'Prompt Chains builder with 3 ready-made pipelines',
  'Masterclass: 12 prompt patterns with copyable examples',
  'Workspace Analytics: your score trends and weakest dimensions over time',
];
const FREE_INCLUDES = ['Overall score and grade', '8-dimension breakdown with reasons', 'Annotations and suggested rewrites'];

export default function PremiumValueCard({
  usedToday,
  onUpgrade,
  onRestore,
  isLoading,
}: {
  usedToday: number;
  onUpgrade: () => void;
  onRestore: () => void;
  isLoading: boolean;
}) {
  const left = Math.max(0, FREE_DAILY_LIMIT - usedToday);
  return (
    <div className="glass-card rounded-2xl p-5 shadow-sm text-left h-full flex flex-col">
      <p className="text-xs font-mono text-muted-foreground mb-3">
        Free plan · {left} of {FREE_DAILY_LIMIT} scans left today
      </p>
      <ul className="space-y-1.5 text-sm mb-4">
        {FREE_INCLUDES.map((f) => (
          <li key={f} className="flex gap-2 text-muted-foreground">
            <Check className="w-4 h-4 mt-0.5 shrink-0 text-primary" aria-hidden /> {f}
          </li>
        ))}
      </ul>
      <p className="text-sm font-display font-bold text-foreground mb-2">Premium adds</p>
      <ul className="space-y-1.5 text-sm mb-5">
        {PREMIUM_ADDS.map((f) => (
          <li key={f} className="flex gap-2 text-foreground/90">
            <Lock className="w-4 h-4 mt-0.5 shrink-0 text-primary" aria-hidden /> {f}
          </li>
        ))}
      </ul>
      <div className="mt-auto">
        <button
          onClick={onUpgrade}
          disabled={isLoading}
          className="w-full bg-primary text-primary-foreground font-display font-bold text-sm px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? 'Opening Stripe…' : `Unlock Premium: ${PREMIUM_PRICE_LABEL} once`}
        </button>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          One-time payment via Stripe, no subscription.{' '}
          <button onClick={onRestore} className="underline hover:text-foreground">
            Already paid? Restore
          </button>
        </p>
      </div>
    </div>
  );
}
