import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Copy, Sparkles } from 'lucide-react';
import { scorePrompt, type ModelRewrite } from '@/lib/promptAnalyzer';

interface PromptRewriteProps {
  original: string;
  rewrite: string;
  originalScore: number;
  /** Measured score of `rewrite`. Older history items may not have it; it is then measured here. */
  rewriteScore?: number;
  modelRewrites?: ModelRewrite[];
}

export default function PromptRewrite({
  original,
  rewrite,
  originalScore,
  rewriteScore,
  modelRewrites = [],
}: PromptRewriteProps) {
  const [copied, setCopied] = useState(false);

  const rewritesList = useMemo<ModelRewrite[]>(
    () => (modelRewrites.length > 0 ? modelRewrites : [{ model: 'general', name: 'Structured rewrite', focus: 'Role, task, format and constraints.', rewrite }]),
    [modelRewrites, rewrite],
  );
  const [activeModel, setActiveModel] = useState<string>(rewritesList[0].model);
  const currentRewrite = rewritesList.find((r) => r.model === activeModel) || rewritesList[0];

  // Every rewrite shown is scored with the same engine as the original; no estimated numbers.
  const currentScore = useMemo(
    () =>
      currentRewrite.rewrite === rewrite && typeof rewriteScore === 'number'
        ? rewriteScore
        : scorePrompt(currentRewrite.rewrite).overallScore,
    [currentRewrite, rewrite, rewriteScore],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentRewrite.rewrite);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h3 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Suggested rewrites
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Templates built from your prompt, styled for different model families. Replace the [PLACEHOLDERS] with your details.
          </p>
        </div>

        <div className="flex flex-wrap bg-secondary/80 p-1 rounded-lg border border-border/80 text-xs font-mono" role="tablist" aria-label="Rewrite style">
          {rewritesList.map((r) => (
            <button
              key={r.model}
              role="tab"
              aria-selected={activeModel === r.model}
              onClick={() => setActiveModel(r.model)}
              className={`px-3 py-1.5 rounded-md transition-all font-semibold ${
                activeModel === r.model ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r.name.replace(/ rewrite$/i, '').replace(/ \(.*\)$/, '')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 relative flex flex-col min-h-[260px]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h4 className="text-xs font-mono font-bold text-destructive/80 tracking-wider uppercase">Your prompt</h4>
            <span className="bg-destructive/10 border border-destructive/20 text-destructive text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
              Score {originalScore}/100
            </span>
          </div>
          <div className="flex-1 overflow-auto max-h-[300px] text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed break-words">
            {original || 'Empty prompt. Type a prompt or load a template.'}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeModel}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border border-primary/20 bg-primary/5 p-5 relative flex flex-col min-h-[260px] shadow-sm"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="text-xs font-mono font-bold text-primary/80 tracking-wider uppercase">{currentRewrite.name}</h4>
              <div className="flex items-center gap-2">
                <span className="bg-primary/10 border border-primary/20 text-primary text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  Score {currentScore}/100
                </span>
                <button
                  onClick={handleCopy}
                  className="text-muted-foreground hover:text-primary transition-colors p-1 bg-secondary rounded-md border border-border"
                  title="Copy rewrite"
                  aria-label="Copy rewrite"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground/80 font-mono mb-4">Focus: {currentRewrite.focus}</p>
            <div className="flex-1 overflow-auto max-h-[300px] text-foreground whitespace-pre-wrap font-mono text-xs bg-black/40 border border-border/50 rounded-lg p-4 leading-relaxed break-words">
              {currentRewrite.rewrite}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="text-xs text-muted-foreground">
        Both scores come from the same checklist. A higher score means the rewrite covers more of the checklist; it is not a
        measurement of the AI&apos;s answer. PromptGrade does not run your prompt on any AI model.
        {currentScore <= originalScore && ' Your prompt already covers more of the checklist than this generic template.'}
      </p>
    </div>
  );
}
