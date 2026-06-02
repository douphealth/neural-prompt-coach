import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ArrowDown, History, Sparkles, GraduationCap, LayoutGrid, BarChart3, Lock, CheckCircle, HelpCircle, Download, FileText } from 'lucide-react';
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
import HistorySidebar, { type HistoryItem } from '@/components/HistorySidebar';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import PromptChainsBuilder from '@/components/PromptChainsBuilder';
import MasterclassSection from '@/components/MasterclassSection';
import BlueprintTypingAssistant from '@/components/BlueprintTypingAssistant';
import BlueprintCapture from '@/components/BlueprintCapture';
import { usePremium } from '@/hooks/usePremium';
import { toast } from '@/hooks/use-toast';

const FREE_DAILY_LIMIT = 5;

type TabId = 'scanner' | 'chains' | 'library' | 'masterclass' | 'analytics';

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabId>('scanner');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isBlueprintOpen, setIsBlueprintOpen] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { isPremium, isLoading: isPremiumLoading, handleUpgrade, handleDowngrade } = usePremium();

  // Reset page layout on load if needed
  useEffect(() => {
    // Read count from local storage
    const count = localStorage.getItem('promptgrade_count');
    if (count) {
      setAnalysisCount(Number(count));
    }
  }, []);

  const handleAnalyze = () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    
    if (!isPremium && analysisCount >= FREE_DAILY_LIMIT) {
      toast({
        title: 'Daily Limit Reached',
        description: 'Upgrade to Premium for unlimited analyses, multi-model rewrites, and developer workbench tools.',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    // Simulate brief scanning latency for UX
    setTimeout(() => {
      const analysis = analyzePrompt(trimmed);
      setResult(analysis);
      
      const newCount = analysisCount + 1;
      setAnalysisCount(newCount);
      localStorage.setItem('promptgrade_count', String(newCount));

      // Append to localStorage prompt scan history
      try {
        const historyLogs = localStorage.getItem('promptgrade_history');
        const parsedLogs = historyLogs ? JSON.parse(historyLogs) : [];
        const newItem: HistoryItem = {
          id: String(Date.now()),
          prompt: trimmed,
          timestamp: Date.now(),
          result: analysis
        };
        localStorage.setItem('promptgrade_history', JSON.stringify([newItem, ...parsedLogs].slice(0, 50)));
        setRefreshTrigger(prev => prev + 1); // refresh history components
      } catch (e) {
        console.error('History persistence failure', e);
      }

      setIsAnalyzing(false);
      
      toast({
        title: 'Prompt Scan Completed',
        description: `Your prompt scored ${analysis.overallScore}/100 (${analysis.grade}). Check your full breakdown below!`
      });

      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, 1000);
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
    setResult(item.result);
    setActiveTab('scanner');
    toast({
      title: 'Historical Scan Restored',
      description: 'Loaded selected snapshot directly into active prompt scan.'
    });
  };

  // Rendering standardLockedScreen for non-premium tabs
  const renderLockedScreen = (title: string, desc: string, icon: any) => {
    const IconComp = icon;
    return (
      <div className="py-16 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-xl w-full glass-card rounded-2xl p-8 text-center relative overflow-hidden shadow-xl"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent" />
          <div className="absolute inset-0 bg-primary/[0.01] pointer-events-none" />

          <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-6 h-6 text-primary animate-pulse" />
          </div>

          <h2 className="text-2xl font-display font-bold text-foreground mb-3 flex items-center justify-center gap-2">
            <IconComp className="w-6 h-6 text-primary" /> {title}
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
            {desc} Unlock these SOTA features today with our lifetime premium package. One payment, yours forever.
          </p>

          <button
            onClick={handleUpgrade}
            disabled={isPremiumLoading}
            className="bg-primary text-primary-foreground font-display font-bold text-sm px-8 py-3.5 rounded-xl glow-primary-strong hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPremiumLoading ? 'Connecting...' : 'Unlock Premium Access — $7.99'}
          </button>
          <p className="text-[10px] text-muted-foreground/75 mt-3">Lifetime Access • Safe Checkout • Multi-Model Capabilities Unlocked</p>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Visual background grids & shapes */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800d_1px,transparent_1px),linear-gradient(to_bottom,#8080800d_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />

      {/* Nav */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container max-w-6xl flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary fill-current" />
            <span className="font-display font-bold text-foreground tracking-wide">
              PromptGrade<span className="text-primary font-bold">™</span>
            </span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            {/* History Trigger Button */}
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all flex items-center gap-1 text-xs font-mono font-medium"
              title="Open History Archives"
            >
              <History className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">Archives</span>
            </button>

            <span className="h-4 w-px bg-border/80 hidden sm:inline" />

            {isPremium ? (
              <div className="flex items-center gap-2">
                <span className="text-primary font-mono text-xs font-semibold bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  ✦ Premium Workspace
                </span>
                {/* Reset Option in sandbox for review */}
                <button
                  onClick={handleDowngrade}
                  className="text-[10px] text-muted-foreground/60 hover:text-destructive transition-colors font-mono underline"
                  title="Sandbox reset for test"
                >
                  Reset Free
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground font-mono text-xs hidden sm:inline">
                  {Math.max(0, FREE_DAILY_LIMIT - analysisCount)} / {FREE_DAILY_LIMIT} daily scans left
                </span>
                <button
                  onClick={handleUpgrade}
                  disabled={isPremiumLoading}
                  className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-xs font-bold font-display hover:opacity-90 shadow-sm shadow-primary/15 transition-all disabled:opacity-50"
                >
                  {isPremiumLoading ? 'Loading...' : 'Go Premium'}
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Primary Tab Workspace Controller */}
      <div className="border-b border-border/40 bg-secondary/20 py-2 sticky top-14 z-40 backdrop-blur-sm">
        <div className="container max-w-6xl px-4 overflow-x-auto flex gap-1.5 scrollbar-none font-display">
          {[
            { id: 'scanner', label: 'Scanner & Coach', icon: Zap, premium: false },
            { id: 'chains', label: 'Prompt Chains', icon: LayoutGrid, premium: true },
            { id: 'library', label: 'Template Library', icon: LayoutGrid, premium: false },
            { id: 'masterclass', label: 'Masterclass Course', icon: GraduationCap, premium: true },
            { id: 'analytics', label: 'Workspace Analytics', icon: BarChart3, premium: true },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const IconComp = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all border ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary/20 font-bold shadow-sm'
                    : 'bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/40'
                }`}
              >
                <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                {tab.label}
                {tab.premium && !isPremium && (
                  <span className="text-[9px] bg-primary/10 border border-primary/20 text-primary px-1 py-0.2 rounded font-bold scale-90">
                    Pro
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Body Layout */}
      <main className="container max-w-6xl px-4 py-8 relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'scanner' && (
            <motion.div
              key="scanner-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-12"
            >
              {/* Hero Input Prompt Area */}
              <section className="max-w-3xl mx-auto text-center space-y-8 pt-8">
                <div className="space-y-3">
                  <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground leading-tight">
                    Double Your AI Performance with <br />
                    <span className="text-gradient-primary">Dynamic Prompt Engineering</span>
                  </h1>
                  <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
                    Scanning clarity, context, formatting, and constraints. Get an instant efficiency scan, line annotations, and model-optimized rewrites.
                  </p>
                </div>

                {/* Main Scan Textarea Box + Real-time Typing Assistant */}
                <div className="space-y-4">
                  <div className="glass-card rounded-2xl p-1 glow-primary/5 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/30 via-primary/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />

                    <textarea
                      ref={inputRef}
                      value={prompt}
                      onChange={e => setPrompt(e.target.value)}
                      placeholder="Paste your prompt here (e.g. 'Write a blog post about marketing...')"
                      rows={6}
                      className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 p-5 resize-none focus:outline-none font-mono text-xs sm:text-sm leading-relaxed"
                    />

                    <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-secondary/10">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                        <span>{prompt.split(/\s+/).filter(Boolean).length} words</span>
                        <span>•</span>
                        <span>{prompt.length} chars</span>
                      </div>

                      <button
                        onClick={handleAnalyze}
                        disabled={!prompt.trim() || isAnalyzing}
                        className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-display font-bold text-sm flex items-center gap-2 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-primary/15"
                      >
                        {isAnalyzing ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            >
                              <Zap className="w-4 h-4" />
                            </motion.div>
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 fill-current" />
                            Scan Prompt
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Real-time Assistant panel */}
                  <BlueprintTypingAssistant prompt={prompt} />
                </div>

                {!result && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center justify-center gap-2 text-muted-foreground text-xs font-mono"
                  >
                    <ArrowDown className="w-3.5 h-3.5 animate-bounce text-primary" />
                    <span>Or load an optimized framework template below</span>
                  </motion.div>
                )}
              </section>

              {/* Scan Results Layout */}
              <AnimatePresence>
                {result && (
                  <motion.section
                    ref={resultsRef}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-12 border-t border-border/50 pt-16 max-w-5xl mx-auto"
                  >
                    {/* Score + Grade Gauge */}
                    <div className="text-center space-y-4">
                      <h2 className="text-2xl font-display font-bold text-foreground">Scanned Efficiency Results</h2>
                      <ScoreGauge score={result.overallScore} grade={result.grade} />
                      <p className="text-muted-foreground mt-4 text-base sm:text-lg max-w-md mx-auto font-sans leading-relaxed">
                        {result.verdict}
                      </p>
                    </div>

                    {/* Chart breakdowns */}
                    <div className="grid lg:grid-cols-2 gap-8">
                      <div className="glass-card rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-display font-bold text-foreground mb-4 uppercase tracking-wider">Strengths Radial Chart</h3>
                        <RadarChart dimensions={result.dimensions} />
                      </div>
                      <div className="glass-card rounded-2xl p-6 shadow-sm">
                        <DimensionBreakdown dimensions={result.dimensions} />
                      </div>
                    </div>

                    {/* Detailed Annotations */}
                    <div className="glass-card rounded-2xl p-6 shadow-sm">
                      <AnnotationList annotations={result.annotations} />
                    </div>

                    {/* Rewrite & Playground */}
                    <div className="glass-card rounded-2xl p-6 shadow-sm">
                      <PromptRewrite
                        original={prompt}
                        rewrite={result.rewrite}
                        originalScore={result.overallScore}
                        rewriteScore={Math.min(result.overallScore + 32, 96)}
                        modelRewrites={result.modelRewrites}
                      />
                    </div>

                    {/* Share score */}
                    <div className="glass-card rounded-2xl p-6 shadow-sm">
                      <ShareableScoreCard result={result} />
                    </div>

                    {/* Compatibility */}
                    <div className="glass-card rounded-2xl p-6 shadow-sm">
                      <ModelMatchIndicator matches={result.modelMatches} />
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>

              {/* Blueprint section */}
              <div className="border-t border-border/40 pt-8">
                <BlueprintSection />
              </div>
            </motion.div>
          )}

          {activeTab === 'chains' && (
            <motion.div
              key="chains-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              {isPremium ? (
                <PromptChainsBuilder />
              ) : (
                renderLockedScreen(
                  'Visual Prompt Chains Builder',
                  'Design multi-agent, sequential workflow pipelines where outputs dynamically cascade into succeeding steps. Build software, copy funnels, or strategic papers without model fragmentation.',
                  LayoutGrid
                )
              )}
            </motion.div>
          )}

          {activeTab === 'library' && (
            <motion.div
              key="library-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <TemplateLibrary onTryTemplate={handleTryTemplate} />
            </motion.div>
          )}

          {activeTab === 'masterclass' && (
            <motion.div
              key="masterclass-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              {isPremium ? (
                <MasterclassSection onTryTemplate={handleTryTemplate} />
              ) : (
                renderLockedScreen(
                  'Prompt Engineering Masterclass',
                  'Study the 12 elite structural guidelines (ReAct, Chain of Thought, XML isolation, few-shot structures) with copyable megaprompt layouts, before-vs-after outputs, and pro engineering alerts.',
                  GraduationCap
                )
              )}
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              {isPremium ? (
                <AnalyticsDashboard triggerRefresh={refreshTrigger} />
              ) : (
                renderLockedScreen(
                  'Workspace Growth Analytics',
                  'Monitor your scan improvements with interactive Recharts score trend area plots, radar footprint breakdowns, text volume charts, and dynamic diagnostic alerts tailored to your prompt weaknesses.',
                  BarChart3
                )
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Premium Teaser on main Scanner page for free tier */}
        {!isPremium && activeTab === 'scanner' && (
          <div className="border-t border-border/40 mt-12">
            <PremiumTeaser />
          </div>
        )}
      </main>

      {/* History Sidebar Slide-Out Drawer */}
      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectHistory={handleSelectHistory}
        triggerRefresh={refreshTrigger}
      />

      {/* Footer */}
      <footer className="border-t border-border/60 py-10 mt-16 bg-secondary/10">
        <div className="container max-w-5xl px-4 text-center space-y-4">
          <p className="text-muted-foreground text-xs sm:text-sm">
            <span className="font-display font-bold text-foreground">PromptGrade™ Workbench</span> by{' '}
            <a href="https://efficientgptprompts.com" className="text-primary hover:underline font-semibold">EfficientGPTPrompts.com</a>
          </p>
          <div className="flex items-center justify-center gap-4 text-[10px] font-mono text-muted-foreground/60">
            <span>Enterprise Grade v2.4.0</span>
            <span>•</span>
            <span>Secure SSL Execution</span>
            <span>•</span>
            <span>Client-Side Scan Storage</span>
          </div>
          <p className="text-[10px] text-muted-foreground/45">© {new Date().getFullYear()} All rights reserved. Registered trademark of EfficientGPTPrompts.</p>
        </div>
      </footer>
    </div>
  );
}
