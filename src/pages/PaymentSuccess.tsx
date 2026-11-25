import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, Loader2, ArrowLeft, ExternalLink, Copy } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyCheckoutSession, type ApiError, type OrderInfo } from '@/lib/premium';
import RestorePurchaseDialog from '@/components/RestorePurchaseDialog';
import OperatorPackCard from '@/components/OperatorPackCard';

type View =
  | { kind: 'verifying' }
  | { kind: 'success'; order: OrderInfo }
  | { kind: 'error'; error: ApiError | 'missing' };

const ERROR_COPY: Record<string, { title: string; body: string; retry?: boolean }> = {
  missing: {
    title: 'No order reference in this link',
    body: 'This page confirms a purchase using the reference Stripe adds to the link. If you already paid, restore Premium with your checkout email.',
  },
  not_paid: {
    title: 'Payment not completed',
    body: 'Stripe has not confirmed this payment yet. If you were charged, wait a minute and retry, or restore with your receipt.',
    retry: true,
  },
  not_found: { title: 'Order not found', body: "We couldn't find this checkout. If you paid, restore Premium with your checkout email and receipt." },
  invalid: { title: 'Invalid order reference', body: 'The link looks incomplete. If you paid, restore Premium with your checkout email and receipt.' },
  wrong_product: { title: 'Different product', body: 'This checkout is not a PromptGrade Premium purchase.' },
  refunded: { title: 'Purchase refunded', body: 'This purchase was refunded, so Premium is not active.' },
  not_configured: {
    title: "We can't confirm purchases on this deployment yet",
    body: 'Your payment is safe with Stripe. Premium will unlock once purchase verification is switched on; you can then restore it with your checkout email.',
    retry: true,
  },
  stripe_unavailable: { title: "We couldn't reach Stripe", body: 'Your payment is safe. Please retry in a moment.', retry: true },
  network: { title: 'Connection problem', body: 'Check your connection and retry. Your payment is safe.', retry: true },
  rate_limited: { title: 'Too many attempts', body: 'Please wait a few minutes and retry.', retry: true },
};

function formatAmount(order: OrderInfo) {
  if (order.amountTotal == null || !order.currency) return null;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency.toUpperCase() }).format(order.amountTotal / 100);
  } catch {
    return null;
  }
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id') || '';
  const [view, setView] = useState<View>(sessionId ? { kind: 'verifying' } : { kind: 'error', error: 'missing' });
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const verify = useCallback(async () => {
    if (!sessionId) return;
    setView({ kind: 'verifying' });
    const r = await verifyCheckoutSession(sessionId);
    setView('order' in r ? { kind: 'success', order: r.order } : { kind: 'error', error: 'error' in r ? r.error : 'network' });
  }, [sessionId]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Payment confirmation | PromptGrade';
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex';
    document.head.appendChild(robots);
    void verify();
    return () => {
      robots.remove();
      document.title = previousTitle;
    };
  }, [verify]);

  const copyRef = async (ref: string) => {
    try {
      await navigator.clipboard.writeText(ref);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full space-y-6">
        <div className="bg-card border border-border rounded-xl p-6 sm:p-8 text-center">
          {view.kind === 'verifying' && (
            <>
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-5" aria-hidden />
              <h1 className="text-2xl font-display font-bold text-foreground mb-2">Confirming your payment…</h1>
              <p className="text-muted-foreground">Checking with Stripe. This takes a few seconds.</p>
            </>
          )}

          {view.kind === 'success' && (
            <>
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="w-8 h-8 text-primary" aria-hidden />
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground mb-2">Premium is unlocked</h1>
              <p className="text-muted-foreground mb-6">
                Payment confirmed with Stripe. Unlimited daily scans, Prompt Chains, the Masterclass and Workspace Analytics are now
                active in this browser.
              </p>
              <dl className="text-left text-sm bg-secondary/30 border border-border rounded-lg p-4 space-y-2 mb-6">
                {formatAmount(view.order) && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Paid</dt>
                    <dd className="font-mono text-foreground">{formatAmount(view.order)} (one-time)</dd>
                  </div>
                )}
                {view.order.email && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="font-mono text-foreground break-all">{view.order.email}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4 items-center">
                  <dt className="text-muted-foreground">Order reference</dt>
                  <dd className="font-mono text-foreground text-xs break-all flex items-center gap-1.5">
                    {view.order.reference}
                    <button onClick={() => copyRef(view.order.reference)} aria-label="Copy order reference" className="text-muted-foreground hover:text-primary">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </dd>
                </div>
                {view.order.receiptNumber && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Receipt number</dt>
                    <dd className="font-mono text-foreground">{view.order.receiptNumber}</dd>
                  </div>
                )}
              </dl>
              {copied && <p className="text-xs text-primary -mt-4 mb-4">Copied</p>}
              <p className="text-xs text-muted-foreground mb-6">
                Keep the order reference: with your email it restores Premium on another device or browser.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-display font-semibold hover:opacity-90"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden />
                  Start analyzing
                </Link>
                {view.order.receiptUrl && (
                  <a
                    href={view.order.receiptUrl}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center justify-center gap-2 border border-border px-6 py-3 rounded-lg font-display font-semibold text-foreground hover:bg-secondary/50"
                  >
                    View receipt <ExternalLink className="w-4 h-4" aria-hidden />
                  </a>
                )}
              </div>
            </>
          )}

          {view.kind === 'error' && (
            <>
              <AlertTriangle className="w-10 h-10 text-warning mx-auto mb-5" aria-hidden />
              <h1 className="text-2xl font-display font-bold text-foreground mb-2">{(ERROR_COPY[view.error] || ERROR_COPY.network).title}</h1>
              <p className="text-muted-foreground mb-6">{(ERROR_COPY[view.error] || ERROR_COPY.network).body}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {(ERROR_COPY[view.error] || ERROR_COPY.network).retry && sessionId && (
                  <button onClick={verify} className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-display font-semibold hover:opacity-90">
                    Retry
                  </button>
                )}
                <button
                  onClick={() => setRestoreOpen(true)}
                  className="border border-border px-6 py-3 rounded-lg font-display font-semibold text-foreground hover:bg-secondary/50"
                >
                  Restore purchase
                </button>
                <Link to="/" className="px-6 py-3 rounded-lg font-display font-semibold text-muted-foreground hover:text-foreground">
                  Back to PromptGrade
                </Link>
              </div>
            </>
          )}
        </div>

        {view.kind === 'success' && <OperatorPackCard placement="payment-success" />}
      </div>
      <RestorePurchaseDialog open={restoreOpen} onOpenChange={setRestoreOpen} />
    </div>
  );
}
