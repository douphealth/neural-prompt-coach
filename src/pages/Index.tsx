import { useState, useRef, useEffect, lazy, Suspense, type ComponentType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ArrowDown, History, GraduationCap, LayoutGrid, BarChart3, Lock, FileText, Library } from 'lucide-react';
import { analyzePrompt, type AnalysisResult } from '@/lib/promptAnalyzer';
import ScoreGauge from '@/components/ScoreGauge';
import DimensionBreakdown from '@/components/DimensionBreakdown';
import AnnotationList from '@/components/AnnotationList';
import PromptRewrite from '@/components/PromptRewrite';
import ModelMatchIndicator from '@/components/ModelMatchIndicator';
import BlueprintSection from '@/components/BlueprintSection';
import PremiumTeaser from '@/components/PremiumTeaser';
import PremiumValueCard from '@/components/PremiumValueCard';
import OperatorPackCard from '@/components/OperatorPackCard';
import ScoringRubric from '@/components/ScoringRubric';
import BlueprintTypingAssistant from '@/components/BlueprintTypingAssistant';
import RestorePurchaseDialog from '@/components/RestorePurchaseDialog';
import type { HistoryItem } from '@/components/HistorySidebar';
import { usePremium } from '@/hooks/usePremium';
import { toast } from '@/hooks/use-toast';
import { FREE_DAILY_LIMIT, LEGACY_GRACE_UNTIL, PREMIUM_PRICE_LABEL, getUsageToday, recordUsage } from '@/lib/premium';

// Heavy or secondary panels load on demand to keep the first load small on mobile.
const RadarChart = lazy(() => import('@/components/RadarChart'));
const ShareableScoreCard = lazy(() => import('@/components/ShareableScoreCard'));
const TemplateLibrary = lazy(() => import('@/components/TemplateLibrary'));
const PromptChainsBuilder = lazy(() => import('@/components/PromptChainsBuilder'));
const MasterclassSection = lazy(() => import('@/components/MasterclassSection'));
const AnalyticsDashboard = lazy(() => import('@/components/AnalyticsDashboard'));
const HistorySidebar = lazy(() => import('@/components/HistorySidebar'));
const BlueprintCapture = lazy(() => import('@/components/BlueprintCapture'));
const EmailReportSection = lazy(() => import('@/components/EmailReportSection'));

// The email report and the emailed blueprint need the Supabase project, which is not
// reachable at the moment. Turn on with VITE_ENABLE_EMAIL_SERVICES=true once it is.
const EMAIL_SERVICES = import.meta.env.VITE_ENABLE_EMAIL_SERVICES === 'true';
const BLUEPRINT_URL = '/promptgrade-blueprint.pdf';

type TabId = 'scanner' | 'chains' | 'library' | 'masterclass' | 'analytics';

const TABS: { id: TabId; label: string; icon: ComponentType<{ className?: string }>; premium: boolean }[] = [
  { id: 'scanner', label: 'Scanner & Coach', icon: Zap, premium: false },
  { id: 'library', label: 'Template Library', icon: Library, premium: false },
  { id: 'chains', label: 'Prompt Chains', icon: LayoutGrid, premium: true },
  { id: 'masterclass', label: 'Masterclass', icon: GraduationCap, premium: true },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, premium: true },
];

const EGP_LINKS = [
  { href: 'https://efficientgptprompts.com/ai-prompt-library/', label: 'AI prompt library' },
  { href: 'https://efficientgptprompts.com/25-revenue-focused-ai-prompts/', label: '25 revenue-focused AI prompts' },
  { href: 'https://efficientgptprompts.com/creative-writing-prompts/', label: 'Creative writing prompts' },
  { href: 'https://efficientgptprompts.com/prompt-testing-methodology/', label: 'How we test prompts' },
  { href: 'https://efficientgptprompts.com/shop/', label: 'Shop' },
];

const LEGAL_LINKS = [
  { href: 'https://efficientgptprompts.com/terms-and-conditions/', label: 'Terms' },
  { href: 'https://efficientgptprompts.com/refund-policy/', label: 'Refund policy' },
  { href: 'https://efficientgptprompts.com/contact/', label: 'Contact' },
];

function PanelFallback() {
  return <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>;
}

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabId>('scanner');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [usedToday, setUsedToday] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isBlueprintOpen, setIsBlueprintOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { isPremium, status, isLoading: isPremiumLoading, handleUpgrade } = usePremium();

  useEffect(() => {
    setUsedToday(getUsageToday());
  }, []);

  const handleAnalyze = () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    if (!isPremium && getUsageToday() >= FREE_DAILY_LIMIT) {
      toast({
        title: 'Daily limit reached',
        description: `The free plan includes ${FREE_DAILY_LIMIT} scans a day. Premium removes the limit.`,
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    // Let the button state paint, then score (scoring itself takes a few milliseconds).
    setTimeout(() => {
      const analysis = analyzePrompt(trimmed);
      setResult(analysis);
      setUsedToday(isPremium ? getUsageToday() : recordUsage());

      try {
        const historyLogs = localStorage.getItem('promptgrade_history');
        const parsedLogs = historyLogs ? JSON.parse(historyLogs) : [];
        const newItem: HistoryItem = { id: String(Date.now()), prompt: trimmed, timestamp: Date.now(), result: analysis };
        localStorage.setItem('promptgrade_history', JSON.stringify([newItem, ...parsedLogs].slice(0, 50)));
        setRefreshTrigger((prev) => prev + 1);
      } catch {
        /* history is optional */
      }

      setIsAnalyzing(false);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, 50);
  };

  const handleTryTemplate = (templatePrompt: string) => {
    setPrompt(templatePrompt);
    setResult(null);
    setActiveTab('scanner');
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }, 100);
  };

  const handleSelectHistory = (item: HistoryItem) => {
    setPrompt(item.prompt);
    // Re-score with the current engine so old history items show current, explained scores.
    setResult(analyzePrompt(item.prompt));
    setActiveTab('scanner');
  };

  const renderLockedScreen = (title: string, desc: string, Icon: ComponentType<{ className?: string }>) => (
    <div className="py-16 flex items-center justify-center">
      <div className="max-w-xl w-full glass-card rounded-2xl p-8 text-center relative overflow-hidden shadow-xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent" />
        <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-6 h-6 text-primary" aria-hidden />
        </div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-3 flex items-center justify-center gap-2">
          <Icon className="w-6 h-6 text-primary" /> {title}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
          {desc} Part of PromptGrade Premium: one payment of {PREMIUM_PRICE_LABEL}, no subscription.
        </p>
        <button
          onClick={handleUpgrade}
          disabled={isPremiumLoading}
          className="bg-primary text-primary-foreground font-display font-bold text-sm px-8 py-3.5 rounded-xl glow-primary-strong hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPremiumLoading ? 'Opening Stripe…' : `Unlock Premium Access — ${PREMIUM_PRICE_LABEL}`}
        </button>
        <p className="text-xs text-muted-foreground mt-3">
          Secure checkout by Stripe ·{' '}
          <button onClick={() => setIsRestoreOpen(true)} className="underline hover:text-foreground">
            Already paid? Restore
          </button>
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800d_1px,transparent_1px),linear-gradient(to_bottom,#8080800d_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-[500px] max-w-full h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      {/* Nav */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50" aria-label="Main">
        <div className="container max-w-6xl flex items-center justify-between h-14 px-4">
          <a href="/" className="flex items-center gap-2" aria-label="PromptGrade home">
            <img src="/logo.png" alt="" width={32} height={32} className="w-8 h-8 rounded-lg object-contain bg-white/95 shadow-sm" />
            <span className="font-display font-bold text-foreground tracking-wide">
              PromptGrade<span className="text-primary font-bold">™</span>
            </span>
          </a>

          <div className="flex items-center gap-2 sm:gap-3 text-sm">
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all flex items-center gap-1 text-xs font-mono font-medium"
              aria-label="Open scan history"
            >
              <History className="w-4 h-4 text-primary" aria-hidden />
              <span className="hidden sm:inline">History</span>
            </button>

            {isPremium ? (
              <span className="text-primary font-mono text-xs font-semibold bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                ✦ Premium
              </span>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-muted-foreground font-mono text-xs hidden md:inline">
                  {Math.max(0, FREE_DAILY_LIMIT - usedToday)} / {FREE_DAILY_LIMIT} free scans left today
                </span>
                <button onClick={() => setIsRestoreOpen(true)} className="text-xs text-muted-foreground hover:text-foreground underline">
                  Restore
                </button>
                <button
                  onClick={handleUpgrade}
                  disabled={isPremiumLoading}
                  className="bg-primary text-primary-foreground px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold font-display hover:opacity-90 shadow-sm shadow-primary/15 transition-all disabled:opacity-50"
                >
                  Go Premium
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {status === 'legacy_grace' && (
        <div className="bg-warning/10 border-b border-warning/30 text-xs sm:text-sm text-foreground px-4 py-2 text-center">
          Premium on this browser was unlocked before purchase checks existed. Confirm your purchase to keep it after{' '}
          {new Date(`${LEGACY_GRACE_UNTIL}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.{' '}
          <button onClick={() => setIsRestoreOpen(true)} className="underline font-semibold">
            Confirm purchase
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border/40 bg-secondary/20 py-2 sticky top-14 z-40 backdrop-blur-sm">
        <div className="container max-w-6xl px-4 overflow-x-auto flex gap-1.5 scrollbar-none font-display" role="tablist" aria-label="Workspace">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const IconComp = tab.icon;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all border ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary/20 font-bold shadow-sm'
                    : 'bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/40'
                }`}
              >
                <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                {tab.label}
                {tab.premium && !isPremium && (
                  <span className="text-[9px] bg-primary/10 border border-primary/20 text-primary px-1 rounded font-bold">Pro</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <main className="container max-w-6xl px-4 py-8 relative z-10">
        {activeTab === 'scanner' && (
          <div className="space-y-12">
            <section className="max-w-3xl mx-auto text-center space-y-8 pt-6">
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground leading-tight">
                  Free AI Prompt Grader: <span className="text-gradient-primary">Score Your Prompt Out of 100</span>
                </h1>
                <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
                  Paste a prompt for ChatGPT, Claude or Gemini. PromptGrade checks it against 8 dimensions (clarity, structure,
                  specificity, output control and more), explains every point, and suggests a rewrite. It runs in your browser.
                </p>
              </div>

              <div className="space-y-4">
                <div className="glass-card rounded-2xl p-1 shadow-xl relative overflow-hidden">
                  <label htmlFor="prompt-input" className="sr-only">
                    Your prompt
                  </label>
                  <textarea
                    id="prompt-input"
                    ref={inputRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Paste your prompt here (e.g. 'Write a blog post about marketing...')"
                    rows={6}
                    className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 p-5 resize-none focus:outline-none font-mono text-sm leading-relaxed"
                  />
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-secondary/10">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                      <span>{prompt.split(/\s+/).filter(Boolean).length} words</span>
                      <span aria-hidden>•</span>
                      <span>{prompt.length} chars</span>
                    </div>
                    <button
                      onClick={handleAnalyze}
                      disabled={!prompt.trim() || isAnalyzing}
                      className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-display font-bold text-sm flex items-center gap-2 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-primary/15"
                    >
                      <Zap className="w-4 h-4 fill-current" aria-hidden />
                      {isAnalyzing ? 'Scoring…' : 'Scan Prompt'}
                    </button>
                  </div>
                </div>

                <BlueprintTypingAssistant prompt={prompt} />
              </div>

              {!result && (
                <div className="flex flex-col items-center justify-center gap-4">
                  {EMAIL_SERVICES ? (
                    <button
                      onClick={() => setIsBlueprintOpen(true)}
                      className="inline-flex items-center gap-2.5 bg-secondary/40 hover:bg-secondary/70 border border-primary/30 hover:border-primary/60 text-foreground px-5 py-2.5 rounded-xl text-xs font-display font-bold transition-all"
                    >
                      <FileText className="w-4 h-4 text-primary" aria-hidden />
                      Download the free 13-page PromptGrade Blueprint (PDF)
                    </button>
                  ) : (
                    <a
                      href={BLUEPRINT_URL}
                      download="PromptGrade-Blueprint.pdf"
                      className="inline-flex items-center gap-2.5 bg-secondary/40 hover:bg-secondary/70 border border-primary/30 hover:border-primary/60 text-foreground px-5 py-2.5 rounded-xl text-xs font-display font-bold transition-all"
                    >
                      <FileText className="w-4 h-4 text-primary" aria-hidden />
                      Download the free 13-page PromptGrade Blueprint (PDF)
                    </a>
                  )}
                  <button
                    onClick={() => setActiveTab('library')}
                    className="flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground text-xs font-mono"
                  >
                    <ArrowDown className="w-3.5 h-3.5 text-primary" aria-hidden />
                    Or start from a template in the library
                  </button>
                </div>
              )}
            </section>

            <AnimatePresence>
              {result && (
                <motion.section
                  ref={resultsRef}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-10 border-t border-border/50 pt-12 max-w-5xl mx-auto scroll-mt-28"
                  aria-labelledby="results-title"
                >
                  <div className={`grid gap-6 items-stretch ${isPremium ? '' : 'md:grid-cols-[1fr_340px]'}`}>
                    <div className="text-center space-y-4">
                      <h2 id="results-title" className="text-2xl font-display font-bold text-foreground">
                        Your prompt score
                      </h2>
                      <ScoreGauge score={result.overallScore} grade={result.grade} />
                      <p className="text-muted-foreground text-base max-w-md mx-auto leading-relaxed">{result.verdict}</p>
                      <a href="#how-scoring-works" className="text-xs text-primary underline">
                        How this score is calculated
                      </a>
                    </div>
                    {!isPremium && (
                      <PremiumValueCard
                        usedToday={usedToday}
                        onUpgrade={handleUpgrade}
                        onRestore={() => setIsRestoreOpen(true)}
                        isLoading={isPremiumLoading}
                      />
                    )}
                  </div>

                  <div className="grid lg:grid-cols-2 gap-8">
                    <div className="glass-card rounded-2xl p-6 shadow-sm">
                      <h3 className="text-sm font-display font-bold text-foreground mb-4 uppercase tracking-wider">Strengths chart</h3>
                      <Suspense fallback={<div className="h-[300px]" />}>
                        <RadarChart dimensions={result.dimensions} />
                      </Suspense>
                    </div>
                    <div className="glass-card rounded-2xl p-6 shadow-sm">
                      <DimensionBreakdown dimensions={result.dimensions} />
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl p-6 shadow-sm">
                    <AnnotationList annotations={result.annotations} />
                  </div>

                  <div className="glass-card rounded-2xl p-6 shadow-sm">
                    <PromptRewrite
                      original={prompt}
                      rewrite={result.rewrite}
                      originalScore={result.overallScore}
                      rewriteScore={result.rewriteScore}
                      modelRewrites={result.modelRewrites}
                    />
                  </div>

                  <OperatorPackCard placement="result" />

                  {EMAIL_SERVICES && (
                    <Suspense fallback={null}>
                      <EmailReportSection prompt={prompt} result={result} />
                    </Suspense>
                  )}

                  <div className="glass-card rounded-2xl p-6 shadow-sm">
                    <Suspense fallback={<PanelFallback />}>
                      <ShareableScoreCard result={result} />
                    </Suspense>
                  </div>

                  <div className="glass-card rounded-2xl p-6 shadow-sm">
                    <ModelMatchIndicator matches={result.modelMatches} />
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            <div className="border-t border-border/40 pt-4">
              <ScoringRubric />
            </div>

            <div className="border-t border-border/40 pt-4">
              <BlueprintSection />
            </div>
          </div>
        )}

        <Suspense fallback={<PanelFallback />}>
          {activeTab === 'library' && <TemplateLibrary onTryTemplate={handleTryTemplate} />}

          {activeTab === 'chains' &&
            (isPremium ? (
              <PromptChainsBuilder />
            ) : (
              renderLockedScreen(
                'Prompt Chains Builder',
                'Design multi-step workflows where the output of one prompt feeds the next. Starts with 3 ready-made pipelines.',
                LayoutGrid,
              )
            ))}

          {activeTab === 'masterclass' &&
            (isPremium ? (
              <MasterclassSection onTryTemplate={handleTryTemplate} />
            ) : (
              renderLockedScreen(
                'Prompt Engineering Masterclass',
                '12 prompt patterns (chain of thought, ReAct, few-shot, XML tags and more) with copyable examples and before-and-after prompts.',
                GraduationCap,
              )
            ))}

          {activeTab === 'analytics' &&
            (isPremium ? (
              <AnalyticsDashboard triggerRefresh={refreshTrigger} />
            ) : (
              renderLockedScreen(
                'Workspace Analytics',
                'Charts of your score history in this browser, your average per dimension, and the areas you most often miss.',
                BarChart3,
              )
            ))}
        </Suspense>

        {!isPremium && activeTab === 'scanner' && (
          <div className="border-t border-border/40 mt-12">
            <PremiumTeaser onRestore={() => setIsRestoreOpen(true)} />
          </div>
        )}
      </main>

      <Suspense fallback={null}>
        {isHistoryOpen && (
          <HistorySidebar
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            onSelectHistory={handleSelectHistory}
            triggerRefresh={refreshTrigger}
          />
        )}
        {EMAIL_SERVICES && isBlueprintOpen && <BlueprintCapture open={isBlueprintOpen} onClose={() => setIsBlueprintOpen(false)} />}
      </Suspense>

      <RestorePurchaseDialog open={isRestoreOpen} onOpenChange={setIsRestoreOpen} />

      <footer className="border-t border-border/60 py-10 mt-16 bg-secondary/10">
        <div className="container max-w-5xl px-4 space-y-6 text-center">
          <p className="text-muted-foreground text-sm">
            <span className="font-display font-bold text-foreground">PromptGrade™</span> is a free tool by{' '}
            <a href="https://efficientgptprompts.com/" className="text-primary hover:underline font-semibold">
              EfficientGPTPrompts.com
            </a>
            .{' '}
            <a href="https://efficientgptprompts.com/promptgrade/" className="text-primary hover:underline">
              About PromptGrade
            </a>
          </p>
          <nav aria-label="EfficientGPTPrompts" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
            {EGP_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
                {l.label}
              </a>
            ))}
          </nav>
          <p className="text-xs text-muted-foreground/80">
            Scoring runs in your browser; your prompts are not sent to a server. Scan history is stored only on this device.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground/70">
            {LEGAL_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-foreground hover:underline">
                {l.label}
              </a>
            ))}
            <span>© {new Date().getFullYear()} EfficientGPTPrompts</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
