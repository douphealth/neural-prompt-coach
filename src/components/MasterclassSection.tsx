import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Copy, Check, ArrowRight, Star, Shield, HelpCircle, Layers, Zap, GraduationCap, Search, Sparkles } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Pattern {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  difficulty: 'Easy' | 'Medium' | 'Expert';
  category: string;
  explanation: string;
  template: string;
  beforeExample: string;
  afterExample: string;
  proTip: string;
}

const PATTERNS: Pattern[] = [
  {
    id: 'cot',
    name: 'Chain of Thought (CoT)',
    emoji: '🧠',
    tagline: 'Prompt the model to show its step-by-step reasoning explicitly.',
    difficulty: 'Easy',
    category: 'Reasoning',
    explanation: 'Forcing an LLM to explain its logic sequentially before outputting a final answer dramatically reduces logical hallucinations and mathematical errors. It activates the model\'s internal processing capacity, matching its output tokens directly to reasoning steps.',
    template: 'Solve the following problem. First, outline a numbered list detailing your reasoning process step-by-step. Do not provide the final answer until all logical steps are fully detailed. Keep each step logical and independent.\n\nProblem:\n[INSERT PROBLEM]',
    beforeExample: 'Q: If John has 5 apples and eats 2, then buys 3 more, how many does he have?\nA: John has 6 apples.',
    afterExample: 'Let\'s think step-by-step:\n1. John starts with 5 apples.\n2. He eats 2 apples, so we calculate: 5 - 2 = 3 apples remaining.\n3. He then buys 3 more apples, so we add: 3 + 3 = 6.\nTherefore, John has 6 apples.',
    proTip: 'For complex scenarios, use "Show your scratchpad calculations before delivering the core solution" to maximize reasoning tokens.'
  },
  {
    id: 'react',
    name: 'ReAct (Reason + Action)',
    emoji: '⚙️',
    tagline: 'Simulate thought-action-observation cycles for agentic work.',
    difficulty: 'Expert',
    category: 'Agentic',
    explanation: 'This pattern enables an LLM to act as a dynamic agent. It structures interactions into cycles of Thought (reasoning about what to do next), Action (calling external tools or simulating tools), and Observation (analyzing tool outputs to plan the next step).',
    template: 'You are an agent operating in a Thought -> Action -> Observation loop.\n\nAvailable tools: [Search, Calculator, DatabaseLookup]\n\nTask: [INSERT TASK]\n\nFor every step, output:\nThought: [Explain your reasoning]\nAction: [ToolName](Parameter)\nObservation: [Await output or simulate output]\n...Repeat until you can deliver the final Answer.',
    beforeExample: 'Research the market capitalization of Apple and compare it to Microsoft\'s cash flow.',
    afterExample: 'Thought: I need to query the current market cap of Apple (AAPL). I will use the Search tool.\nAction: Search("Apple market cap 2026")\nObservation: Apple\'s market cap is $3.4 Trillion.\nThought: Now I need to search Microsoft\'s cash flow...\nAction: Search("Microsoft cash flow statements 2026")...',
    proTip: 'This pattern forms the baseline architecture of most state-of-the-art AI agent frameworks like LangChain or AutoGPT.'
  },
  {
    id: 'few-shot',
    name: 'Few-Shot Exemplars',
    emoji: '💡',
    tagline: 'Provide structured examples to lock in specific outputs.',
    difficulty: 'Easy',
    category: 'Formatting',
    explanation: 'LLMs are elite pattern-matching engines. Instead of explaining a complex output format in words, feed the model 2-3 precise examples showing exact input-output pairs. This locks in formatting, tone, and schema constraints instantly.',
    template: 'Perform the following classification task. Adhere strictly to the format shown in the examples.\n\nExample 1:\nInput: "I absolutely loved this product, it saved me hours!"\nOutput: Sentiment: POSITIVE | Confidence: 98% | Tag: Product-Love\n\nExample 2:\nInput: "It is okay, but it broke on day two."\nOutput: Sentiment: NEGATIVE | Confidence: 75% | Tag: Hardware-Failure\n\nInput: "[INSERT INPUT]"\nOutput:',
    beforeExample: 'Classify this sentence: "The customer service was slow and rude."',
    afterExample: 'Input: "The customer service was slow and rude."\nOutput: Sentiment: NEGATIVE | Confidence: 95% | Tag: Support-Quality',
    proTip: 'Always include diverse exemplars (e.g., positive, negative, and edge cases) to avoid biasing the model towards a single output.'
  },
  {
    id: 'xml-tags',
    name: 'XML Tag Segmentation',
    emoji: '🏷️',
    tagline: 'Isolate instructions, context, and variables with hierarchical XML.',
    difficulty: 'Medium',
    category: 'Structure',
    explanation: 'Modern LLMs (especially Claude) are trained heavily on XML-like documents. Wrapping different parts of your prompt in custom HTML/XML tags prevents instruction drift, makes it easy for the model to parse input data, and prevents injection attacks.',
    template: '<system_directives>\nYou are an expert editorial writer. Analyze the text provided within the <source_document> tags.\n</system_directives>\n\n<source_document>\n[PASTE DOCUMENT HERE]\n</source_document>\n\n<instructions>\n1. Summarize the main thesis inside a <thesis> tag.\n2. List top 3 supporting arguments within a <supporting_points> tag.\n</instructions>',
    beforeExample: 'Analyze this article: [Text]. Tell me the main arguments and thesis.',
    afterExample: '<thesis>\nThe rapid adoption of Prompt Engineering workbench tools is directly correlated with a 40% efficiency boost in corporate AI implementations.\n</thesis>\n<supporting_points>\n1. Visual chains reduce error cascades.\n2. Multi-model compatibility bridges vendor lock-in.\n3. Educational masterclasses upskill non-technical workers.\n</supporting_points>',
    proTip: 'Use closing tags (e.g. </source_document>) to prevent the model from confusing its instructions with the input data.'
  },
  {
    id: 'meta-prompt',
    name: 'Meta-Prompting (Self-Correction)',
    emoji: '🔄',
    tagline: 'Instruct the model to critique and refine its own outputs.',
    difficulty: 'Expert',
    category: 'Quality Control',
    explanation: 'Meta-prompting forces the AI to act as its own editor. In a single prompt (or conversation flow), you prompt the model to generate a draft, perform a critical review against a list of quality standards, and then outputs a refined, final version.',
    template: 'Execute the following task: "[INSERT TASK]".\n\nFollow these sequential phases:\nPhase 1: Generate a complete first draft.\nPhase 2: Critically review the draft. List 3 specific weaknesses or omissions regarding accuracy, clarity, and tone.\nPhase 3: Rewrite the draft, resolving all identified weaknesses in Phase 2. Output the final refined version inside <final_version> tags.',
    beforeExample: 'Write a professional email telling a client their project is delayed by two weeks.',
    afterExample: 'Phase 1 Draft: Hi, the project is delayed... \nPhase 2 Review: 1. Too blunt. 2. Doesn\'t state remediation steps. 3. Omit vague timelines.\nPhase 3 Refined: <final_version>Dear Client, I am writing to provide a strategic update regarding our project timeline...</final_version>',
    proTip: 'This pattern yields extremely polished enterprise copywriting, removing the need for manual, back-and-forth editing.'
  },
  {
    id: 'persona',
    name: 'Persona Anchoring',
    emoji: '🎭',
    tagline: 'Anchor the model to a highly detailed, domain-expert persona.',
    difficulty: 'Easy',
    category: 'Expertise',
    explanation: 'Instead of generic assistance, give the AI a highly specific profession, seniority level, and contextual background. This limits the probability space of its responses, triggering specialized vocabularies and frameworks.',
    template: 'You are an elite, senior McKinsey-level management consultant specializing in SaaS operations. Your work is data-driven, executive-ready, and highly decisive. Avoid generic advice or filler text.\n\nTask:\n[INSERT TASK]',
    beforeExample: 'Explain how a subscription business should grow.',
    afterExample: 'To optimize growth for a B2B SaaS subscription model with a $50M ARR profile, we must isolate three primary operational levers: 1. Net Revenue Retention (NRR) targets of >115% via cohort expansion. 2. CAC Payback compression... ',
    proTip: 'Add "Years of Experience" or "Famous Author Style" parameters to further narrow and refine the stylistic output.'
  },
  {
    id: 'json-outlines',
    name: 'Structured JSON Outlines',
    emoji: '📊',
    tagline: 'Enforce rigid JSON outputs optimized for API parsing integrations.',
    difficulty: 'Medium',
    category: 'Output Control',
    explanation: 'Forcing an AI model to structure its response within a rigid JSON schema ensures consistent integration with software APIs. It eliminates random preamble dialogue and guarantees a predictable schema formatting structure.',
    template: 'Generate a list of 3 business ideas. Respond ONLY in a valid JSON object matching this schema:\n{\n  "ideas": [\n    {\n      "title": "String (Idea name)",\n      "cost": "String (Low/Medium/High)",\n      "risk": "String (Description)"\n    }\n  ]\n}\nDo not include any introductory markdown or dialogue tags.',
    beforeExample: 'Give me 3 business ideas and their costs.',
    afterExample: '{\n  "ideas": [\n    {"title": "Automated SEO writer", "cost": "Low", "risk": "Algorithmic changes"},\n    {"title": "Micro-SaaS Sandbox", "cost": "Medium", "risk": "Low user acquisition"}\n  ]\n}',
    proTip: 'Instruct the LLM to output "valid JSON only, no backticks, no markdown" to prevent parsing errors inside backend servers.'
  },
  {
    id: 'constraint-grids',
    name: 'Pre-Mortem Constraint Grids',
    emoji: '🛡️',
    tagline: 'Define explicit boundaries and anti-patterns beforehand.',
    difficulty: 'Medium',
    category: 'Guardrails',
    explanation: 'Proactively instructing the model on common pitfalls and explicitly detailing anti-patterns represents a powerful way to reduce mistakes. By analyzing failures before drafting, the AI constructs logical guardrails.',
    template: 'Conduct a pre-mortem analysis before executing this task: "[INSERT TASK]".\n\nIdentify the top 3 ways this task could fail or yield a generic, fluff-filled response.\nDefine 3 strict NEGATIVE CONSTRAINTS (rules regarding what you must explicitly AVOID) to prevent these failures.',
    beforeExample: 'Write an article about working from home.',
    afterExample: 'Pre-Mortem Failure check:\n- Risk: Generic tips about "buying a chair".\n- Constraint: AVOID mentioning chairs, standing desks, or standard schedules. Focus strictly on asynchronous data-management workflows.',
    proTip: 'Always combine negative constraints with explicit definitions of desired behaviors for best results.'
  },
  {
    id: 'megaprompt',
    name: 'Megaprompt Orchestration',
    emoji: '🏛️',
    tagline: 'Establish full workspace ecosystems with comprehensive rules.',
    difficulty: 'Expert',
    category: 'Frameworks',
    explanation: 'An elite technique wrapping massive instructions, background directories, variable indexes, dictionaries, and strict execution instructions into a single complex orchestrator prompt. Extremely effective for enterprise custom agents.',
    template: '# PROGRAM PROTOCOL: COGNITIVE WORKBENCH\n\n[Core Directive]\nYou are acting as a senior systems analyst.\n\n[Variable Directory]\n- TargetTopic: [INSERT TOPIC]\n- SecurityRules: Strict client-side storage only\n\n[Rules Grid]\n1. System is fully objective.\n2. Output format must use clean headings.\n\n[Task Flow]\nStep 1: Parse variables.\nStep 2: Generate response.',
    beforeExample: 'Review this project proposal.',
    afterExample: '# COGNITIVE WORKBENCH ACTIVE\nSystem Analyst loaded successfully. Analyzing target topic variables... Target Topic: [Stripe Webhook integration]. Initiating security audit.',
    proTip: 'Structure megaprompts using bold titles, directories, and markdown hierarchies to help the LLM weigh instructions correctly.'
  },
  {
    id: 'density',
    name: 'Sequential Chain-of-Density',
    emoji: '📦',
    tagline: 'Iteratively compress and enrich text for ultimate density.',
    difficulty: 'Expert',
    category: 'Summarization',
    explanation: 'A cutting-edge summarization technique. It instructs the LLM to write a summary, then iteratively identify 1-3 core missing details, and rewrite the summary to compress it—maintaining the exact same length but increasing information density.',
    template: 'Read this article: [INSERT TEXT].\n\nDraft a 100-word summary.\nNow, identify 2-3 critical, highly specific details missing from your draft.\nRewrite the summary. Maintain the exact same 100-word limit, but compress the text to fit the new details. Repeat this density pass 3 times.',
    beforeExample: 'Summarize the history of prompt engineering.',
    afterExample: 'Density Pass 3: ReAct paradigms (2022) consolidated LLM reasoning-action pipelines, boosting accuracy. CoT prompting (Wehr et al.) resolved mathematical hurdles by mapping outputs directly to token reasoning streams, reducing token overhead by 40%.',
    proTip: 'This pattern yields summaries of absolute elite quality, matching executive briefs in corporate workflows.'
  },
  {
    id: 'flipped',
    name: 'Flipped Interaction System',
    emoji: '🔄',
    tagline: 'Force the AI to interview you to extract optimal context.',
    difficulty: 'Medium',
    category: 'Interactive',
    explanation: 'Instead of trying to explain everything in a massive, confusing prompt, instruct the AI to act as the interviewer. It will ask you 3-5 key targeted questions, gather your answers, and then compile the optimal, customized asset.',
    template: 'You are an elite business architect. Your goal is to write a business plan for me. However, you do not have enough context.\n\nPlease ask me 4 highly targeted, specific questions about my business model, target audience, budget, and competitors. Do not write the plan yet. Await my answers.',
    beforeExample: 'Write a business plan for my SaaS app.',
    afterExample: 'I would be glad to design your B2B SaaS business plan. To ensure elite performance, please answer these 4 questions:\n1. What is your CAC Payback target?\n2. Who are your top 3 competitors?\n3. ...',
    proTip: 'Excellent for onboarding flows and consulting agents. Keeps the user engaged and guarantees high-specificity context.'
  },
  {
    id: 'semantic',
    name: 'Semantic RAG Retrieval',
    emoji: '📡',
    tagline: 'Format external documentation feeds cleanly for semantic indexing.',
    difficulty: 'Expert',
    category: 'Advanced',
    explanation: 'Optimizes how external knowledge retrieved via semantic search (RAG) is structured inside the prompt context. It maps chunks of document data with strict IDs, scores, and relevance metrics to prevent document overload.',
    template: 'You are an expert system. Refer strictly to the semantic documentation chunks provided inside the <knowledge_base> tags to answer the user inquiry: "[INSERT INQUIRY]".\n\n<knowledge_base>\nChunk 1 (Relevance: 98%):\n[PASTE CHUNK]\n\nChunk 2 (Relevance: 82%):\n[PASTE CHUNK]\n</knowledge_base>\n\nIf the answer is not found in the chunks, state "INSUFFICIENT_KNOWLEDGE".',
    beforeExample: 'Search our docs and tell me how to handle billing.',
    afterExample: 'Referencing <knowledge_base> Chunk 1: To configure Stripe webhook integrations, you must invoke the supabase payment creation edge function...',
    proTip: 'Always include the "INSUFFICIENT_KNOWLEDGE" fallback instruction to prevent the LLM from making up false answers when docs are silent.'
  }
];

interface MasterclassSectionProps {
  onTryTemplate: (prompt: string) => void;
}

export default function MasterclassSection({ onTryTemplate }: MasterclassSectionProps) {
  const [activePattern, setActivePattern] = useState<string>('cot');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: 'Template Copied',
      description: 'The masterclass prompt pattern is ready for pasting!'
    });
  };

  const handleTryIt = (pattern: Pattern) => {
    onTryTemplate(pattern.template);
    toast({
      title: 'Template Loaded',
      description: `Loaded the '${pattern.name}' pattern into the Prompt Analyzer tab!`
    });
  };

  // Filter patterns dynamically
  const filtered = PATTERNS.filter(p => {
    return (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.explanation.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const currentPattern = filtered.find(p => p.id === activePattern) || filtered[0] || PATTERNS[0];

  return (
    <section className="py-8">
      {/* Title */}
      <div className="flex items-center gap-3 border-b border-border/60 pb-4 mb-6">
        <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary">
          <GraduationCap className="w-5.5 h-5.5" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            Prompt Engineering Masterclass™
            <span className="text-[10px] font-mono font-semibold bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider">
              12 Elite Patterns Unlocked
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Master the advanced structural paradigms used by leading AI engineers to get optimal model results.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Side: Pattern Course Navigation */}
        <div className="w-full lg:w-1/3 space-y-4">
          {/* Dynamic Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patterns..."
              className="pl-9 pr-4 py-2 w-full bg-secondary/80 border border-border/80 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-sans"
            />
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar">
            <h4 className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider px-2 mb-3">
              Prompt Design Curricula ({filtered.length} Chapters)
            </h4>
            
            {filtered.map((p) => {
              const isActive = p.id === currentPattern.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setActivePattern(p.id)}
                  className={`w-full text-left p-3.5 rounded-xl border flex items-start gap-3 transition-all relative overflow-hidden group ${
                    isActive
                      ? 'bg-primary/5 border-primary shadow-sm shadow-primary/5'
                      : 'bg-card border-border/70 hover:border-primary/30 hover:bg-secondary/40'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                  )}
                  <span className="text-2xl mt-0.5 select-none">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                        {p.name}
                      </span>
                      <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                        p.difficulty === 'Easy'
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                          : p.difficulty === 'Medium'
                            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                            : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                      }`}>
                        {p.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1 leading-relaxed">
                      {p.tagline}
                    </p>
                  </div>
                </button>
              );
            })}

            {filtered.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground italic border border-dashed border-border/60 rounded-xl">
                No matching patterns found.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Tab content with layout animations */}
        <div className="flex-1 bg-card border border-border/80 rounded-2xl p-6 shadow-sm min-h-[500px]">
          {currentPattern ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPattern.id}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* Pattern Info Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl select-none">{currentPattern.emoji}</span>
                    <div>
                      <h3 className="text-lg font-display font-bold text-foreground">
                        {currentPattern.name}
                      </h3>
                      <p className="text-xs text-primary font-mono mt-0.5">
                        Pattern Category: {currentPattern.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(currentPattern.template, 'tmpl')}
                      className="bg-secondary text-foreground hover:text-primary hover:border-primary/30 border border-border px-3.5 py-2 rounded-lg font-display font-semibold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      {copiedId === 'tmpl' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      Copy Template
                    </button>
                    <button
                      onClick={() => handleTryIt(currentPattern)}
                      className="bg-primary text-primary-foreground font-display font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 hover:opacity-90 transition-opacity shadow-sm"
                    >
                      Try in Analyzer <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Core Mechanism explanation */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-primary" /> Core Mechanism
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                    {currentPattern.explanation}
                  </p>
                </div>

                {/* Interactive Code template */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-primary" /> System Megaprompt Template
                  </h4>
                  <div className="bg-black/40 border border-border/80 rounded-xl p-4 font-mono text-[11px] text-foreground leading-relaxed select-all">
                    {currentPattern.template}
                  </div>
                </div>

                {/* Before vs After Case Study */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Before Card */}
                  <div className="border border-destructive/20 bg-destructive/5 rounded-xl p-4 space-y-2 flex flex-col justify-between">
                    <div>
                      <h5 className="text-[10px] text-destructive/80 font-bold uppercase tracking-wider mb-2">
                        ❌ Basic Prompt Output
                      </h5>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed font-sans">
                        {currentPattern.beforeExample}
                      </p>
                    </div>
                    <div className="text-[9px] font-mono text-destructive/60 border-t border-destructive/10 pt-2 mt-2">
                      Lacks depth, accuracy, or structure.
                    </div>
                  </div>

                  {/* After Card */}
                  <div className="border border-primary/20 bg-primary/5 rounded-xl p-4 space-y-2 flex flex-col justify-between">
                    <div>
                      <h5 className="text-[10px] text-primary/80 font-bold uppercase tracking-wider mb-2">
                        ✅ Engineered Prompt Output
                      </h5>
                      <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed font-mono text-[10px]">
                        {currentPattern.afterExample}
                      </p>
                    </div>
                    <div className="text-[9px] font-mono text-primary/60 border-t border-primary/10 pt-2 mt-2">
                      Highly detailed, precise, and structurally verified.
                    </div>
                  </div>
                </div>

                {/* Pro Tip Callout Box */}
                <div className="bg-secondary/40 border border-border/80 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-mono font-bold text-foreground">PRO ENGINEER SECRET</h5>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed font-sans">
                      {currentPattern.proTip}
                    </p>
                  </div>
                </div>

              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground italic text-xs">
              Select a design pattern from the course curricula drawer.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
