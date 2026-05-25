import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, Sparkles, HelpCircle } from 'lucide-react';

interface BlueprintTypingAssistantProps {
  prompt: string;
}

interface MetricStatus {
  key: string;
  label: string;
  emoji: string;
  detected: boolean;
  keywords: string[];
  guideline: string;
  tip: string;
}

const BLUEPRINT_METRICS: MetricStatus[] = [
  {
    key: 'role',
    label: 'Role Assignment',
    emoji: '🎭',
    detected: false,
    keywords: ['you are', 'act as', 'as a', 'your role', 'persona', 'expert', 'specialist', 'professional', 'strategist', 'consultant'],
    guideline: 'Define WHO the AI is representing to anchor its expertise.',
    tip: 'e.g. "You are an elite B2B copywriter with 10+ years experience..."'
  },
  {
    key: 'context',
    label: 'Background Context',
    emoji: '🌍',
    detected: false,
    keywords: ['context', 'background', 'situation', 'industry', 'company', 'problem', 'target', 'business', 'domain', 'scenario'],
    guideline: 'Explain the background setting, business model, or current dilemma.',
    tip: 'e.g. "Context: We are launching a new visual design SaaS app targeting designers..."'
  },
  {
    key: 'task',
    label: 'Core Task',
    emoji: '📋',
    detected: false,
    keywords: ['write', 'create', 'make', 'analyze', 'evaluate', 'generate', 'draft', 'design', 'compile', 'review'],
    guideline: 'Define exactly what core action the AI must execute.',
    tip: 'e.g. "Your task is to draft a comprehensive competitive analysis report..."'
  },
  {
    key: 'format',
    label: 'Output Format',
    emoji: '📐',
    detected: false,
    keywords: ['format', 'structure', 'headings', 'bullet', 'list', 'table', 'markdown', 'json', 'csv', 'numbered', 'ascii', 'diagram'],
    guideline: 'Specify the visual layout, markdown tags, or schema of the output.',
    tip: 'e.g. "Format: Use markdown with H2 headings, bullet points, and bold key terms."'
  },
  {
    key: 'tone',
    label: 'Tone & Style',
    emoji: '🎨',
    detected: false,
    keywords: ['tone', 'style', 'voice', 'conversational', 'professional', 'casual', 'friendly', 'authoritative', 'academic', 'persuasive'],
    guideline: 'Guide the attitude, reading level, and vocabulary style.',
    tip: 'e.g. "Tone: Professional yet highly conversational and friendly."'
  },
  {
    key: 'scope',
    label: 'Scope & Length',
    emoji: '📏',
    detected: false,
    keywords: ['words', 'characters', 'sentences', 'paragraphs', 'tokens', 'length', 'limit', 'under', 'max', 'min', 'count'],
    guideline: 'Define explicit boundaries, length limits, or token targets.',
    tip: 'e.g. "Length: Strictly between 800 and 1,200 words."'
  },
  {
    key: 'examples',
    label: 'Exemplars / Variables',
    emoji: '💡',
    detected: false,
    keywords: ['example', 'exemplar', 'such as', 'like', 'placeholder', '[topic]', '{{', '[', '<', '{'],
    guideline: 'Provide input-output examples or dynamic context slot placeholders.',
    tip: 'e.g. "Here is an example: [Input] -> [Output] or use placeholders like [TOPIC]."'
  },
  {
    key: 'guard',
    label: 'Guardrails (Negatives)',
    emoji: '🛡️',
    detected: false,
    keywords: ['avoid', 'do not', 'dont', 'never', 'unless', 'except', 'constraint', 'banned', 'limitations', 'no fluff', 'surface-level'],
    guideline: 'Set negative constraints detailing what the AI must NOT output.',
    tip: 'e.g. "Constraints: AVOID generic advice, clichés, or introductory preambles."'
  }
];

export default function BlueprintTypingAssistant({ prompt }: BlueprintTypingAssistantProps) {
  const [metrics, setMetrics] = useState<MetricStatus[]>(BLUEPRINT_METRICS);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  useEffect(() => {
    const text = prompt.toLowerCase();
    
    const updatedMetrics = BLUEPRINT_METRICS.map(metric => {
      // Check if any keyword matches the prompt text
      const detected = metric.keywords.some(kw => text.includes(kw));
      return { ...metric, detected };
    });

    setMetrics(updatedMetrics);
  }, [prompt]);

  const score = metrics.filter(m => m.detected).length;

  return (
    <div className="bg-card/50 border border-border/60 rounded-xl p-4.5 shadow-sm space-y-3.5 backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <h4 className="font-display font-bold text-foreground text-xs uppercase tracking-wider">
            Real-time Blueprint Scanner
          </h4>
        </div>
        
        {/* Score indicator */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <span className="text-muted-foreground">Blueprint Coverage:</span>
          <span className={`font-bold px-2 py-0.5 rounded ${
            score >= 6 
              ? 'bg-primary/10 text-primary border border-primary/20' 
              : score >= 3 
                ? 'bg-warning/10 text-warning border border-warning/20' 
                : 'bg-destructive/10 text-destructive border border-destructive/20'
          }`}>
            {score} / 8 Found
          </span>
        </div>
      </div>

      {/* Grid of Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {metrics.map((metric) => (
          <div
            key={metric.key}
            onMouseEnter={() => setActiveTooltip(metric.key)}
            onMouseLeave={() => setActiveTooltip(null)}
            onClick={() => setActiveTooltip(activeTooltip === metric.key ? null : metric.key)}
            className={`p-2.5 rounded-lg border flex flex-col justify-between select-none relative cursor-help transition-all duration-200 ${
              metric.detected
                ? 'bg-primary/[0.02] border-primary/25 hover:border-primary/45'
                : 'bg-secondary/40 border-border/80 hover:border-border hover:bg-secondary/60'
            }`}
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-sm">{metric.emoji}</span>
              {metric.detected ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-muted-foreground/45 shrink-0" />
              )}
            </div>
            
            <span className={`text-[10px] font-display font-bold mt-2 truncate ${
              metric.detected ? 'text-foreground font-semibold' : 'text-muted-foreground'
            }`}>
              {metric.label}
            </span>

            {/* Hover Guideline Tooltip */}
            <AnimatePresence>
              {activeTooltip === metric.key && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[220px] bg-secondary border border-border text-foreground p-3 rounded-lg text-[10px] shadow-xl z-50 pointer-events-none text-left space-y-1.5 leading-relaxed"
                >
                  <p className="font-bold text-primary flex items-center gap-1">
                    <Info className="w-3 h-3 text-primary" /> {metric.label}
                  </p>
                  <p className="text-white/80">{metric.guideline}</p>
                  <p className="text-muted-foreground font-mono pt-1 border-t border-border/50">
                    {metric.tip}
                  </p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-secondary" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
