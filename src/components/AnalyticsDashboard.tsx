import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar } from 'recharts';
import { LineChart, Sparkles, TrendingUp, AlertTriangle, CheckCircle, BarChart3, Zap, GraduationCap } from 'lucide-react';
import type { HistoryItem } from './HistorySidebar';

interface AnalyticsDashboardProps {
  triggerRefresh: number;
}

export default function AnalyticsDashboard({ triggerRefresh }: AnalyticsDashboardProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history from localStorage
  const loadHistory = () => {
    try {
      const stored = localStorage.getItem('promptgrade_history');
      if (stored) {
        setHistory(JSON.parse(stored).reverse()); // Chronological order
      } else {
        setHistory([]);
      }
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [triggerRefresh]);

  if (history.length === 0) {
    return (
      <div className="py-16 text-center border border-dashed border-border/80 rounded-xl space-y-3">
        <BarChart3 className="w-8 h-8 text-muted-foreground/30 mx-auto animate-pulse" />
        <h4 className="font-display font-bold text-foreground text-sm">Analytics Engine Offline</h4>
        <p className="text-xs text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
          We need data! Run at least 2 prompt scans in the Scanner tab to activate your progress dashboard charts.
        </p>
      </div>
    );
  }

  // Calculate high-level stats
  const totalScans = history.length;
  const avgScore = Math.round(history.reduce((sum, item) => sum + item.result.overallScore, 0) / totalScans);
  
  const scores = history.map(item => item.result.overallScore);
  const highestScore = Math.max(...scores);
  
  const grades = history.map(item => item.result.grade);
  // Get highest grade by ranking (A+ -> F)
  const gradeRankings = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];
  const highestGrade = grades.reduce((best, current) => {
    const bestIdx = gradeRankings.indexOf(best);
    const currIdx = gradeRankings.indexOf(current);
    if (bestIdx === -1) return current;
    if (currIdx === -1) return best;
    return currIdx < bestIdx ? current : best;
  }, 'F');

  // Trend data for AreaChart
  const trendData = history.map((item, idx) => ({
    name: `Scan ${idx + 1}`,
    score: item.result.overallScore,
    date: new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }));

  // Aggregate dimension scores across all history
  const dimensionKeys = [
    { key: 'clarity', label: 'Clarity', emoji: '🎯' },
    { key: 'structure', label: 'Structure', emoji: '📐' },
    { key: 'specificity', label: 'Specificity', emoji: '🔍' },
    { key: 'tokenEfficiency', label: 'Token Efficiency', emoji: '⚡' },
    { key: 'reasoning', label: 'Reasoning', emoji: '🧠' },
    { key: 'outputControl', label: 'Output Control', emoji: '🎨' },
    { key: 'edgeCases', label: 'Edge Case', emoji: '🛡️' },
    { key: 'reusability', label: 'Reusability', emoji: '🔄' },
  ];

  const dimensionAverages = dimensionKeys.map(dim => {
    let sum = 0;
    history.forEach(item => {
      const match = item.result.dimensions.find(d => d.key === dim.key);
      if (match) sum += match.score;
    });
    return {
      subject: `${dim.emoji} ${dim.label}`,
      score: Math.round(sum / totalScans),
      fullMark: 100
    };
  });

  // Calculate weakest dimension
  const weakestDimension = [...dimensionAverages].sort((a, b) => a.score - b.score)[0];

  // Calculate length distributions for BarChart
  const lengthData = history.map((item, idx) => ({
    name: `S${idx + 1}`,
    words: item.prompt.split(/\s+/).filter(Boolean).length
  }));

  // Diagnosis recommendation
  const getWeaknessDiagnostic = (subject: string) => {
    const rawName = subject.split(' ').slice(1).join(' ').toLowerCase();
    if (rawName.includes('reasoning')) {
      return 'Your models are operating on autopilot. Inject "think step by step" or reasoning scaffolds to prompt deep thinking.';
    }
    if (rawName.includes('specificity')) {
      return 'Vague instructions detected. Provide more context, strict quantities, and granular expectations in your scans.';
    }
    if (rawName.includes('structure')) {
      return 'Structure prompts into clear sections. Use headings, bullet lists, or a Role → Context → Instructions flow.';
    }
    if (rawName.includes('edge')) {
      return 'Missing guardrails! Add strict negative constraints detailing what the AI should explicitly AVOID.';
    }
    if (rawName.includes('control')) {
      return 'Unregulated outputs. Specify exact formatting guidelines (e.g. JSON schema, table, word count caps).';
    }
    return 'Refactor variables and replace static terms with placeholders to increase template reusability.';
  };

  return (
    <div className="py-6 space-y-6">
      
      {/* Top Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Scans Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border/80 rounded-xl p-4.5 flex flex-col justify-between shadow-sm relative overflow-hidden group"
        >
          <div className="absolute top-0 left-0 h-1 w-full bg-primary" />
          <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">Total Prompt Scans</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-display font-bold text-foreground">{totalScans}</span>
            <span className="text-xs text-primary font-bold font-mono">scanned</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">Active prompts logged into workspace archives.</p>
        </motion.div>

        {/* Avg Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card border border-border/80 rounded-xl p-4.5 flex flex-col justify-between shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 h-1 w-full bg-accent" />
          <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">Average Workspace PES™</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-display font-bold text-accent">{avgScore}</span>
            <span className="text-xs text-accent font-bold font-mono">/100</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">Mean average efficiency level across all runs.</p>
        </motion.div>

        {/* Highest Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border/80 rounded-xl p-4.5 flex flex-col justify-between shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 h-1 w-full bg-primary" />
          <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">Peak Efficiency Target</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-display font-bold text-primary">{highestScore}</span>
            <span className="text-xs text-primary font-bold font-mono">Grade: {highestGrade}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">Highest scanned score achieved inside active dashboard.</p>
        </motion.div>

        {/* Weakest Dimension Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border/80 rounded-xl p-4.5 flex flex-col justify-between shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 h-1 w-full bg-warning" />
          <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">Primary System Weakness</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-base font-display font-bold text-warning truncate max-w-[150px]">{weakestDimension ? weakestDimension.subject : 'N/A'}</span>
            <span className="text-xs text-warning font-bold font-mono">Score: {weakestDimension ? weakestDimension.score : 0}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">Scored lowest across prompt blueprints.</p>
        </motion.div>
      </div>

      {/* Main Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Score Trend (AreaChart) */}
        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h4 className="font-display font-bold text-foreground text-sm flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-primary" /> Prompt Efficiency Score Trend
            </h4>
            <p className="text-xs text-muted-foreground">Scans improvement trajectory timeline.</p>
          </div>

          <div className="w-full h-[260px] font-mono text-[10px]">
            <ResponsiveContainer>
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(150, 80%, 50%)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="hsl(150, 80%, 50%)" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 15%)" />
                <XAxis dataKey="name" stroke="hsl(210, 20%, 50%)" />
                <YAxis domain={[0, 100]} stroke="hsl(210, 20%, 50%)" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(220, 18%, 10%)', borderColor: 'hsl(220, 15%, 20%)', color: '#fff' }}
                />
                <Area type="monotone" dataKey="score" stroke="hsl(150, 80%, 50%)" strokeWidth={2.5} fillOpacity={1} fill="url(#scoreColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dimension Breakdown Averages (RadarChart) */}
        <div className="bg-card border border-border/80 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h4 className="font-display font-bold text-foreground text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" /> Aggregate Blueprint Coverage Map
            </h4>
            <p className="text-xs text-muted-foreground">Averages across 8 architectural prompt dimensions.</p>
          </div>

          <div className="w-full h-[260px] font-mono text-[10px]">
            <ResponsiveContainer>
              <RadarChart data={dimensionAverages} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="hsl(220, 15%, 15%)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(210, 20%, 70%)', fontSize: 9 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(210, 20%, 50%)', fontSize: 8 }} />
                <Radar name="Averages" dataKey="score" stroke="hsl(180, 70%, 45%)" fill="hsl(180, 70%, 45%)" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Dynamic Recommendation diagnostic block */}
      {weakestDimension && (
        <div className="bg-secondary/30 border border-border/80 rounded-xl p-4 flex gap-3.5 relative overflow-hidden">
          <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-warning" />
          <div className="w-9 h-9 rounded-xl bg-warning/10 border border-warning/20 text-warning flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4.5 h-4.5" />
          </div>
          <div>
            <h5 className="text-xs font-mono font-bold text-foreground flex items-center gap-2">
              ENGINE OPTIMIZATION DIAGNOSTIC: Improve {weakestDimension.subject.split(' ').slice(1).join(' ')}
            </h5>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-sans">
              {getWeaknessDiagnostic(weakestDimension.subject)} Use the **Prompt Engineering Masterclass** to review structured frameworks and templates.
            </p>
          </div>
        </div>
      )}

      {/* Length metrics Row */}
      <div className="bg-card border border-border/80 rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <h4 className="font-display font-bold text-foreground text-sm flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-primary" /> Input Volume Footprint
          </h4>
          <p className="text-xs text-muted-foreground">Word counts registered across consecutive runs.</p>
        </div>

        <div className="w-full h-[200px] font-mono text-[10px]">
          <ResponsiveContainer>
            <BarChart data={lengthData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 15%)" />
              <XAxis dataKey="name" stroke="hsl(210, 20%, 50%)" />
              <YAxis stroke="hsl(210, 20%, 50%)" />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(220, 18%, 10%)', borderColor: 'hsl(220, 15%, 20%)', color: '#fff' }} />
              <Bar dataKey="words" fill="hsl(150, 80%, 50%)" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
