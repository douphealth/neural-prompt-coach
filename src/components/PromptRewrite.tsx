import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Copy, Play, RefreshCw, Terminal, Sparkles, AlertCircle } from 'lucide-react';
import type { ModelRewrite } from '@/lib/promptAnalyzer';

interface PromptRewriteProps {
  original: string;
  rewrite: string;
  originalScore: number;
  rewriteScore: number;
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
  const [activeModel, setActiveModel] = useState<'gpt-4o' | 'claude' | 'gemini' | 'llama'>('gpt-4o');
  
  // Playground state
  const [isPlaying, setIsPlaying] = useState(false);
  const [originalStream, setOriginalStream] = useState('');
  const [optimizedStream, setOptimizedStream] = useState('');
  const [currentExecuting, setCurrentExecuting] = useState<'idle' | 'original' | 'optimized' | 'both'>('idle');

  // Fallback if no modelRewrites provided
  const rewritesList = modelRewrites.length > 0 ? modelRewrites : [
    { model: 'gpt-4o', name: 'GPT-4o Optimizer', focus: 'General multi-purpose structuring.', rewrite },
    { model: 'claude', name: 'Claude Optimizer', focus: 'XML tags & deep instructions.', rewrite },
    { model: 'gemini', name: 'Gemini Optimizer', focus: 'Interactive multi-modal format.', rewrite },
    { model: 'llama', name: 'Llama Optimizer', focus: 'Dense instructions & strict constraints.', rewrite },
  ];

  const currentRewrite = rewritesList.find(r => r.model === activeModel) || rewritesList[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentRewrite.rewrite);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to extract a clean topic for simulations
  const getGuessedTopic = () => {
    const words = original.split(/\s+/);
    const topicWords = words.filter(w => w.length > 3 && !['write', 'create', 'make', 'about', 'that', 'this', 'with', 'from', 'have', 'will', 'would', 'could', 'should', 'please', 'help'].includes(w.toLowerCase()));
    return topicWords.slice(0, 3).join(' ') || 'your request';
  };

  const topic = getGuessedTopic();

  // Custom mock response text depending on the prompt
  const originalOutputText = `Here is some information about ${topic}.

${topic} is very important for many businesses and projects. If you want to do this well, you should make sure that you focus on details. First, you should define your goals. Next, try to do some research about it. Finally, write a draft and review it.

Many people think this is easy, but it requires some effort. Make sure to use good tools.

Let me know if you need anything else or if you want me to write more details!`;

  const optimizedOutputText = `# Strategic Execution Guide: ${topic.toUpperCase()}
*Generated using optimized prompt engineering principles*

## Executive Summary
This document provides a highly structured, actionable, and specific framework to execute on **${topic}**. By addressing underlying objectives, utilizing quantitative metrics, and establishing concrete constraints, we ensure a high-impact deliverable.

## 1. Core Framework & Metrology
To implement this successfully, we divide the initiative into three high-density execution pillars:
*   **Pillar A: Scope Discovery** – Quantifying current baseline parameters.
*   **Pillar B: Contextual Mapping** – Analyzing competitor friction points and target audience alignments.
*   **Pillar C: Quality Control** – Setting up strict metric-driven milestones.

| Metric / Milestone | Target KPI | Verification Method |
| :--- | :--- | :--- |
| Initial Setup | 100% Alignment | Multi-stakeholder Review |
| Execution Speed | -25% Latency | Benchmarking Suite |
| Output Quality | >94% Accuracy | Expert Evaluation Grid |

## 2. Practical Action Checklist
To achieve maximum results immediately, follow these specific steps:
1.  **Analyze constraints**: Identify critical bottlenecks early.
2.  **Deploy isolated prototypes**: Avoid monolithic releases.
3.  **Establish feedback loops**: Continuously refine criteria.

## 3. Risk Mitigation & Edge Cases
*   *Risk:* Oversimplification of details. *Mitigation:* Conduct rigorous deep dives before finalizing.
*   *Constraint Check:* The output must strictly avoid generic or high-level placeholders. All entries are backed by practical data.`;

  // Simulator streaming logic
  useEffect(() => {
    if (!isPlaying) return;

    let originalInterval: NodeJS.Timeout;
    let optimizedInterval: NodeJS.Timeout;

    setOriginalStream('');
    setOptimizedStream('');
    setCurrentExecuting('both');

    const origWords = originalOutputText.split(' ');
    const optWords = optimizedOutputText.split(' ');

    let origIdx = 0;
    let optIdx = 0;

    // Stream original (slower, generic, shorter)
    originalInterval = setInterval(() => {
      if (origIdx < origWords.length) {
        setOriginalStream(prev => prev + (origIdx === 0 ? '' : ' ') + origWords[origIdx]);
        origIdx++;
      } else {
        clearInterval(originalInterval);
        if (optIdx >= optWords.length) {
          setIsPlaying(false);
          setCurrentExecuting('idle');
        }
      }
    }, 45);

    // Stream optimized (faster, highly structured, longer)
    optimizedInterval = setInterval(() => {
      if (optIdx < optWords.length) {
        setOptimizedStream(prev => prev + (optIdx === 0 ? '' : ' ') + optWords[optIdx]);
        optIdx++;
      } else {
        clearInterval(optimizedInterval);
        if (origIdx >= origWords.length) {
          setIsPlaying(false);
          setCurrentExecuting('idle');
        }
      }
    }, 20);

    return () => {
      clearInterval(originalInterval);
      clearInterval(optimizedInterval);
    };
  }, [isPlaying]);

  const triggerSimulation = () => {
    setIsPlaying(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h3 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            SOTA Multi-Model Prompt Optimizer
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Select an LLM profile to view an engine-specific optimized prompt rewrite.
          </p>
        </div>

        {/* Model Tabs Selector */}
        <div className="flex bg-secondary/80 p-1 rounded-lg border border-border/80 text-xs font-mono">
          {rewritesList.map((r) => (
            <button
              key={r.model}
              onClick={() => setActiveModel(r.model as any)}
              className={`px-3 py-1.5 rounded-md transition-all font-semibold ${
                activeModel === r.model
                  ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r.model.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Editor Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Side: Original Prompt (Reference) */}
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 relative flex flex-col min-h-[300px]">
          <div className="absolute top-3 right-3 bg-destructive/10 border border-destructive/20 text-destructive text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
            Before — Score: {originalScore}/100
          </div>
          <h4 className="text-xs font-mono font-bold text-destructive/80 mb-3 tracking-wider uppercase">
            Original Input Prompt
          </h4>
          <div className="flex-1 overflow-auto max-h-[300px] text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
            {original || 'Empty prompt. Please type or load a template.'}
          </div>
        </div>

        {/* Right Side: Optimized Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeModel}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border border-primary/20 bg-primary/5 p-5 relative flex flex-col min-h-[300px] shadow-sm glow-primary/5"
          >
            {/* Header info */}
            <div className="absolute top-3 right-12 bg-primary/10 border border-primary/20 text-primary text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
              Optimized — Score: ~{rewriteScore}/100
            </div>
            
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 text-muted-foreground hover:text-primary transition-colors p-1 bg-secondary rounded-md border border-border"
              title="Copy Optimized Prompt"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <h4 className="text-xs font-mono font-bold text-primary/80 mb-1 tracking-wider uppercase">
              {currentRewrite.name}
            </h4>
            <p className="text-[11px] text-muted-foreground/80 font-mono mb-4">
              Focus: {currentRewrite.focus}
            </p>

            {/* Prompt Content */}
            <div className="flex-1 overflow-auto max-h-[300px] text-sm text-foreground whitespace-pre-wrap font-mono text-xs bg-black/40 border border-border/50 rounded-lg p-4 leading-relaxed select-all">
              {currentRewrite.rewrite}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Live Playground Simulator Panel */}
      <div className="mt-8 bg-gradient-to-b from-card to-card/90 border border-border/80 rounded-xl p-5 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Terminal className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="font-display font-bold text-foreground text-base flex items-center gap-1.5">
                Live Playground Simulator
                <span className="text-[10px] font-mono font-semibold bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded">
                  Interactive
                </span>
              </h4>
              <p className="text-xs text-muted-foreground">
                Compare AI outputs generated by the Original vs. the Optimized prompts in real-time.
              </p>
            </div>
          </div>

          <button
            onClick={triggerSimulation}
            disabled={isPlaying || !original.trim()}
            className="bg-primary text-primary-foreground font-display font-bold text-sm px-5 py-2.5 rounded-lg flex items-center gap-2 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-primary/15"
          >
            {isPlaying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Simulating LLM Output...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Run Prompt Simulation
              </>
            )}
          </button>
        </div>

        {/* Simulator Outputs Grid */}
        <div className="grid md:grid-cols-2 gap-5 font-mono text-xs">
          {/* Original Output terminal */}
          <div className="border border-border/80 bg-black/50 rounded-xl p-4 flex flex-col min-h-[250px] relative overflow-hidden">
            <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[9px] text-destructive/80 font-bold bg-destructive/10 border border-destructive/20 px-2 py-0.5 rounded-full">
              <AlertCircle className="w-3 h-3" /> Basic Model Yield
            </div>
            <h5 className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-3">
              Original Prompt AI Response
            </h5>
            <div className="flex-1 overflow-auto max-h-[250px] font-sans text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {originalStream || (
                <div className="h-full flex items-center justify-center text-muted-foreground/40 italic font-sans py-12">
                  Click 'Run Prompt Simulation' to trigger comparison
                </div>
              )}
              {isPlaying && currentExecuting === 'both' && originalStream.length < originalOutputText.length && (
                <span className="inline-block w-1.5 h-3.5 bg-destructive/60 animate-pulse ml-0.5">|</span>
              )}
            </div>
          </div>

          {/* Optimized Output terminal */}
          <div className="border border-primary/20 bg-black/60 rounded-xl p-4 flex flex-col min-h-[250px] relative overflow-hidden shadow-inner">
            <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[9px] text-primary font-bold bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" /> Structurally Engineered Output
            </div>
            <h5 className="text-[10px] text-primary/80 font-bold uppercase tracking-wider mb-3">
              Optimized Prompt AI Response
            </h5>
            
            <div className="flex-1 overflow-auto max-h-[250px] text-foreground leading-relaxed whitespace-pre-wrap font-sans">
              {optimizedStream ? (
                <div className="prose prose-invert prose-xs max-w-none text-white/95">
                  {/* Basic markdown parsing simulation for clean renders */}
                  {optimizedStream.split('\n').map((line, idx) => {
                    if (line.startsWith('# ')) {
                      return <h1 key={idx} className="text-sm font-bold text-primary font-display mt-2 mb-1">{line.slice(2)}</h1>;
                    }
                    if (line.startsWith('## ')) {
                      return <h2 key={idx} className="text-xs font-bold text-foreground mt-3 mb-1 border-b border-border/40 pb-0.5">{line.slice(3)}</h2>;
                    }
                    if (line.startsWith('*   ') || line.startsWith('-   ')) {
                      return <li key={idx} className="ml-3 text-white/90 list-disc">{line.slice(4)}</li>;
                    }
                    if (line.startsWith('1.  ')) {
                      return <li key={idx} className="ml-3 text-white/90 list-decimal">{line.slice(4)}</li>;
                    }
                    if (line.startsWith('|')) {
                      return <div key={idx} className="font-mono text-[10px] text-primary/70 my-0.5 bg-black/20 p-1 rounded border border-border/30">{line}</div>;
                    }
                    return <p key={idx} className="mb-2 text-white/80">{line}</p>;
                  })}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground/40 italic font-sans py-12">
                  Awaiting optimized prompt execution simulation
                </div>
              )}
              {isPlaying && currentExecuting === 'both' && optimizedStream.length < optimizedOutputText.length && (
                <span className="inline-block w-1.5 h-3.5 bg-primary/70 animate-pulse ml-0.5">|</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
