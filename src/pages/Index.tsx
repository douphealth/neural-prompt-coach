import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ArrowDown } from 'lucide-react';
import { analyzePrompt, type AnalysisResult } from '@/lib/promptAnalyzer';
import ScoreGauge from '@/components/ScoreGauge';
import RadarChart from '@/components/RadarChart';
import DimensionBreakdown from '@/components/DimensionBreakdown';
import AnnotationList from '@/components/AnnotationList';
import PromptRewrite from '@/components/PromptRewrite';
import ModelMatchIndicator from '@/components/ModelMatchIndicator';
import BlueprintSection from '@/components/BlueprintSection';
import TemplateLibrary from '@/components/TemplateLibrary';
import PremiumTeaser from '@/components/PremiumTeaser';
import ShareableScoreCard from '@/components/ShareableScoreCard';
import { usePremium } from '@/hooks/usePremium';

const FREE_DAILY_LIMIT = 3;

export default function Index() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { isPremium, isLoading: isPremiumLoading, handleUpgrade } = usePremium();

  const handleAnalyze = () => {
    if (!prompt.trim() || (!isPremium && analysisCount >= FREE_DAILY_LIMIT)) return;
    setIsAnalyzing(true);
    // Simulate brief processing delay for UX
    setTimeout(() => {
      const analysis = analyzePrompt(prompt.trim());
      setResult(analysis);
      setAnalysisCount(c => c + 1);
      setIsAnalyzing(false);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, 800);
  };

  const handleTryTemplate = (templatePrompt: string) => {
    setPrompt(templatePrompt);
    setResult(null);
    inputRef.current?.scrollIntoView({ behavior: 'smooth' });
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container max-w-6xl flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-foreground">PromptGrade<span className="text-primary">™</span></span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {isPremium ? (
              <span className="text-primary font-mono text-xs font-semibold">✦ Premium</span>
            ) : (
              <>
                <span className="text-muted-foreground font-mono text-xs">
                  {FREE_DAILY_LIMIT - analysisCount} free analyses left
                </span>
                <button
                  onClick={handleUpgrade}
                  disabled={isPremiumLoading}
                  className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isPremiumLoading ? 'Loading...' : 'Go Premium'}
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        </div>

        <div className="container max-w-3xl text-center relative z-10 px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground leading-tight mb-4">
              How efficient is <br />
              <span className="text-gradient-primary">your AI prompt?</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
              Paste any prompt. Get an instant efficiency score, detailed analysis, and an optimized rewrite — for free.
            </p>
          </motion.div>

          {/* Input Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-1 glow-primary"
          >
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Paste your AI prompt here..."
              rows={5}
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground p-4 resize-none focus:outline-none font-mono text-sm"
            />
            <div className="flex items-center justify-between px-4 py-2 border-t border-border/50">
              <span className="text-xs text-muted-foreground font-mono">
                {prompt.split(/\s+/).filter(Boolean).length} words
              </span>
              <button
                onClick={handleAnalyze}
                disabled={!prompt.trim() || isAnalyzing || (!isPremium && analysisCount >= FREE_DAILY_LIMIT)}
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-display font-semibold flex items-center gap-2 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isAnalyzing ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Zap className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {isAnalyzing ? 'Analyzing...' : 'Analyze My Prompt'}
              </button>
            </div>
          </motion.div>

          {!result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 flex items-center justify-center gap-2 text-muted-foreground text-sm"
            >
              <ArrowDown className="w-4 h-4 animate-bounce" />
              <span>Or explore our template library below</span>
            </motion.div>
          )}
        </div>
      </section>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.section
            ref={resultsRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="container max-w-5xl px-4 pb-20"
          >
            {/* Score + Verdict */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <h2 className="text-2xl font-display font-bold text-foreground mb-6">Your Prompt Efficiency Score™</h2>
              <ScoreGauge score={result.overallScore} grade={result.grade} />
              <p className="text-muted-foreground mt-6 text-lg max-w-lg mx-auto">{result.verdict}</p>
            </motion.div>

            {/* Radar + Breakdown */}
            <div className="grid lg:grid-cols-2 gap-8 mb-12">
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-display font-semibold text-foreground mb-4">Strengths & Weaknesses</h3>
                <RadarChart dimensions={result.dimensions} />
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <DimensionBreakdown dimensions={result.dimensions} />
              </div>
            </div>

            {/* Annotations */}
            <div className="bg-card border border-border rounded-xl p-6 mb-8">
              <AnnotationList annotations={result.annotations} />
            </div>

            {/* Rewrite */}
            <div className="bg-card border border-border rounded-xl p-6 mb-8">
              <PromptRewrite
                original={prompt}
                rewrite={result.rewrite}
                originalScore={result.overallScore}
                rewriteScore={Math.min(result.overallScore + 35, 95)}
              />
            </div>

            {/* Shareable Score Card */}
            <div className="bg-card border border-border rounded-xl p-6 mb-8">
              <ShareableScoreCard result={result} />
            </div>

            {/* Model Match */}
            <div className="bg-card border border-border rounded-xl p-6 mb-8">
              <ModelMatchIndicator matches={result.modelMatches} />
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Blueprint */}
      <div className="container max-w-5xl px-4">
        <BlueprintSection />
      </div>

      {/* Templates */}
      <div className="container max-w-6xl px-4">
        <TemplateLibrary onTryTemplate={handleTryTemplate} />
      </div>

      {/* Premium Teaser */}
      <div className="container max-w-6xl px-4">
        <PremiumTeaser />
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-8">
        <div className="container max-w-5xl px-4 text-center">
          <p className="text-muted-foreground text-sm">
            <span className="font-display font-bold text-foreground">PromptGrade™</span> by{' '}
            <a href="https://efficientgptprompts.com" className="text-primary hover:underline">EfficientGPTPrompts.com</a>
          </p>
          <p className="text-xs text-muted-foreground mt-2">© {new Date().getFullYear()} All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
