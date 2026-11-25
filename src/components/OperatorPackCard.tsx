import { ArrowUpRight, Package } from 'lucide-react';

// Product, URL and price checked against the WooCommerce Store API on 2026-11-25
// (product 4671, EUR 49.00, purchasable). Update here if the shop changes.
const OPERATOR_PACK_URL = 'https://efficientgptprompts.com/product/ai-revenue-operator-pack-product/';
const OPERATOR_PACK_PRICE = '€49';

export default function OperatorPackCard({ placement }: { placement: 'result' | 'payment-success' }) {
  const href = `${OPERATOR_PACK_URL}?utm_source=promptgrade&utm_medium=app&utm_campaign=${placement}`;
  return (
    <aside className="glass-card rounded-2xl p-6 shadow-sm border border-border" aria-labelledby={`operator-pack-${placement}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" aria-hidden />
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">From the EfficientGPTPrompts shop</p>
            <h3 id={`operator-pack-${placement}`} className="text-base font-display font-bold text-foreground">
              AI Revenue Operator Pack <span className="text-primary">{OPERATOR_PACK_PRICE}</span>
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              {placement === 'result'
                ? 'If you write prompts for business work, this is a structured workflow system for offer positioning, landing pages, sales emails, SEO briefs, ecommerce assets, CTAs and quality control.'
                : 'A structured workflow system for offer positioning, landing pages, sales emails, SEO briefs, ecommerce assets, CTAs and quality control. Sold separately from PromptGrade Premium.'}
            </p>
          </div>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center justify-center gap-1.5 shrink-0 border border-primary/40 text-primary px-4 py-2 rounded-lg text-sm font-display font-bold hover:bg-primary/10"
        >
          See what&apos;s inside <ArrowUpRight className="w-4 h-4" aria-hidden />
        </a>
      </div>
    </aside>
  );
}
