import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { restorePurchase, type ApiError } from '@/lib/premium';
import { toast } from '@/hooks/use-toast';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
const CONTACT_URL = 'https://efficientgptprompts.com/contact/';

const MESSAGES: Partial<Record<ApiError, string>> = {
  no_match: "We couldn't match that email and order reference. Check both, or contact us and we'll sort it out.",
  invalid: 'Enter the email you paid with and a receipt number (like 1234-5678) or an order reference (pi_… or cs_…).',
  rate_limited: 'Too many attempts. Please wait 10 minutes and try again.',
  challenge_failed: 'The security check failed. Please try again.',
  not_configured: 'Purchase restore is not available on this deployment yet. Your purchase is safe; please contact us.',
  stripe_unavailable: "We couldn't reach the payment provider. Please try again in a few minutes.",
  network: 'Network error. Check your connection and try again.',
};

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (t: string) => void; 'expired-callback'?: () => void }) => string;
      reset: (id?: string) => void;
    };
  }
}

function useTurnstile(open: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState<string | undefined>();
  const widgetId = useRef<string>();

  useEffect(() => {
    if (!open || !TURNSTILE_SITE_KEY) return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !ref.current || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: setToken,
        'expired-callback': () => setToken(undefined),
      });
    };
    if (window.turnstile) {
      setTimeout(render, 0);
    } else if (!document.getElementById('cf-turnstile-script')) {
      const s = document.createElement('script');
      s.id = 'cf-turnstile-script';
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = render;
      document.head.appendChild(s);
    }
    return () => {
      cancelled = true;
      widgetId.current = undefined;
    };
  }, [open]);

  return { ref, token, required: Boolean(TURNSTILE_SITE_KEY) };
}

export default function RestorePurchaseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [email, setEmail] = useState('');
  const [proof, setProof] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const turnstile = useTurnstile(open);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await restorePurchase(email.trim(), proof.trim(), turnstile.token);
    setBusy(false);
    if (!('error' in r)) {
      toast({ title: 'Premium restored', description: 'Premium is now unlocked in this browser.' });
      onOpenChange(false);
    } else {
      setError(MESSAGES[(r as { error: ApiError }).error] || "Something went wrong. Please try again or contact us.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Restore your Premium purchase</DialogTitle>
          <DialogDescription>
            Bought Premium on another device or browser? Enter the email you used at checkout and one order detail.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm">
            <span className="text-foreground font-medium">Checkout email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <label className="block text-sm">
            <span className="text-foreground font-medium">Receipt number or order reference</span>
            <input
              type="text"
              required
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              placeholder="1234-5678 or pi_…"
              className="mt-1 w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              The receipt number is in the Stripe receipt email. The order reference is shown on the page you saw after paying.
            </span>
          </label>
          {turnstile.required && <div ref={turnstile.ref} className="min-h-[65px]" />}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || (turnstile.required && !turnstile.token)}
            className="w-full bg-primary text-primary-foreground font-display font-bold text-sm px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Checking…' : 'Restore Premium'}
          </button>
          <p className="text-xs text-muted-foreground text-center">
            Can&apos;t find your receipt?{' '}
            <a href={CONTACT_URL} className="text-primary underline" target="_blank" rel="noopener">
              Contact us
            </a>{' '}
            with your checkout email.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
