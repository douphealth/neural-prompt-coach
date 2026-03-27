import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy } from 'lucide-react';

export default function PromptRewrite({ original, rewrite, originalScore, rewriteScore }: {
  original: string;
  rewrite: string;
  originalScore: number;
  rewriteScore: number;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(rewrite);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-display font-semibold text-foreground">✨ Optimized Rewrite</h3>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-destructive">BEFORE — Score: {originalScore}/100</span>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{original}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="rounded-lg border border-primary/30 bg-primary/5 p-4 relative"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-primary">AFTER — Score: ~{rewriteScore}/100</span>
            <button onClick={handleCopy} className="text-muted-foreground hover:text-primary transition-colors">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap font-mono text-xs leading-relaxed">{rewrite}</p>
        </motion.div>
      </div>
    </div>
  );
}
