import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ArrowDown, Play, Copy, Check, Info, Settings2, Code, Zap, Sparkles, FolderHeart } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ChainStep {
  id: string;
  title: string;
  role: string;
  prompt: string;
  outputDescription: string;
  simulatedOutput: string;
}

const PIPELINE_PRESETS = [
  {
    name: '🚀 SaaS Copy Funnel',
    variables: {
      topic: 'AI Graphic Design Sandbox',
      audience: 'Product Hunters & Digital Designers'
    },
    steps: [
      {
        id: 'funnel-1',
        title: 'Step 1: Audience Profiler',
        role: 'Direct Response Marketer',
        prompt: 'Act as a direct response marketer. Compile the top 3 core emotional pain points of "{{audience}}" regarding "{{topic}}".',
        outputDescription: 'Audience Pain-Point Report',
        simulatedOutput: 'AUDIENCE INSIGHTS:\n1. Friction: Lack of design coding expertise.\n2. Desire: Instantly view sandbox outputs in high-fidelity.\n3. Trigger: Quick sandbox deployments with no hosting setup.'
      },
      {
        id: 'funnel-2',
        title: 'Step 2: Landing Page Copywriter',
        role: 'Copywriting Architect',
        prompt: 'Draft a landing page copy using the pain points from Step 1. Title the heading to target "{{audience}}". Include a clear call-to-action.',
        outputDescription: 'High-Converting Copy',
        simulatedOutput: 'LANDING PAGE HEADLINE:\n"Zero Code. Infinite Design. Deploy Your First Glowing Cyber-Sandbox in 800ms!"\n\nCall-to-Action:\n"Unlock Your Lifetime Access Free sandbox."'
      },
      {
        id: 'funnel-3',
        title: 'Step 3: Launch Sequence Creator',
        role: 'Email Marketing Master',
        prompt: 'Create a 2-part launch follow-up email about "{{topic}}" targeting "{{audience}}". Address core questions and add dynamic links.',
        outputDescription: 'Launch Sequence Copy',
        simulatedOutput: 'SUBJECT: A sandbox built specifically for you... \n\nBody: Hey [First Name], we know you love speed. That\'s why we designed our {{topic}} environment with immediate hot reloads. Click here to check the walkthrough...'
      }
    ]
  },
  {
    name: '💻 Code Feature Architect',
    variables: {
      topic: 'Secure Stripe Billing Portal Integration',
      audience: 'React Node TypeScript Developers'
    },
    steps: [
      {
        id: 'arch-1',
        title: 'Step 1: Database Schema ERD',
        role: 'Principal DB Architect',
        prompt: 'Design a clean, normalized PostgreSQL database schema ERD in ASCII style for: "{{topic}}". Highlight table relationships.',
        outputDescription: 'SQL Schema Definition',
        simulatedOutput: 'DATABASE SCHEMA ERD:\nTABLE transactions (\n  id UUID PRIMARY KEY,\n  user_id UUID REFERENCES users(id),\n  amount NUMERIC(10,2),\n  status VARCHAR(20) DEFAULT \'pending\',\n  created_at TIMESTAMP DEFAULT NOW()\n);'
      },
      {
        id: 'arch-2',
        title: 'Step 2: API Controller Logic',
        role: 'Senior Node Developer',
        prompt: 'Using the Step 1 Schema, write a secure Express/TypeScript controller logic to handle billing webhooks for "{{topic}}".',
        outputDescription: 'TypeScript Backend Code',
        simulatedOutput: 'BACKEND CONTROLLER:\nimport { Request, Response } from \'express\';\nexport const handleWebhook = async (req: Request, res: Response) => {\n  const { type, data } = req.body;\n  if (type === \'charge.succeeded\') {\n    await updateTransactionStatus(data.id, \'success\');\n  }\n  return res.sendStatus(200);\n};'
      },
      {
        id: 'arch-3',
        title: 'Step 3: Integration Testing Suite',
        role: 'Lead QA Engineer',
        prompt: 'Draft comprehensive Vitest integration tests for the Step 2 controller. Mock external requests and cover all billing edge cases.',
        outputDescription: 'Vitest Code Assertions',
        simulatedOutput: 'TESTING SUITE:\nimport { describe, it, expect, vi } from \'vitest\';\ndescribe(\'Billing webhook controller\', () => {\n  it(\'should set status success on charge.succeeded\', async () => {\n    const response = await simulateWebhookPayload(\'charge.succeeded\');\n    expect(response.status).toBe(200);\n  });\n});'
      }
    ]
  },
  {
    name: '📊 Roundtable Board',
    variables: {
      topic: 'Transitioning to a Product-Led Growth (PLG) Model',
      audience: 'Venture-backed Tech Executives'
    },
    steps: [
      {
        id: 'board-1',
        title: 'Step 1: Situation Assessment',
        role: 'Chief Executive Officer',
        prompt: 'Assess the core business implications and primary friction points of executing: "{{topic}}" inside the corporate ecosystem.',
        outputDescription: 'CEO Advisory Briefing',
        simulatedOutput: 'CEO EVALUATION:\n1. Strategy: Shift CAC paybacks from marketing budgets to product-led expansions.\n2. Risk: Sales-alignment friction and temporary revenue churn.\n3. Goal: Compressing user onboarding drop-offs by 40%.'
      },
      {
        id: 'board-2',
        title: 'Step 2: Feasibility Audit',
        role: 'Chief Technology Officer',
        prompt: 'Examine the data infrastructure and analytics platform adjustments needed for implementing PLG metrics from Step 1.',
        outputDescription: 'CTO Architecture Plan',
        simulatedOutput: 'CTO DATA BLUEPRINT:\n- We need standard product telemetry (Mixpanel/Amplitude) attached to checkout triggers.\n- Establish real-time tracking checkpoints for user sandbox setups.\n- Mitigate schema scaling overhead.'
      },
      {
        id: 'board-3',
        title: 'Step 3: Consensus Execution Roadmap',
        role: 'Corporate Strategy Director',
        prompt: 'Consolidate Step 1 and Step 2 into a single unified action plan with a checklist and KPIs.',
        outputDescription: 'Executive Board Agreement',
        simulatedOutput: 'EXECUTIVE CONSENSUS ROADMAP:\n- Q1: Implement client telemetry analytics and complete beta checkout tests.\n- Q2: Launch dynamic mock payment flows and sandbox tools.\n- Key KPI: Average onboarding activation time < 3 minutes.'
      }
    ]
  }
];

const DEFAULT_STEPS: ChainStep[] = [
  {
    id: '1',
    title: 'Research & Context Extraction',
    role: 'Senior Research Analyst',
    prompt: 'You are a Senior Research Analyst. Gather all major facts, current trends, and critical nuances related to: "{{topic}}". Highlight the core audience pain points specifically for: "{{audience}}".',
    outputDescription: 'Context Fact Sheet',
    simulatedOutput: 'FACT SHEET GENERATED:\n1. Core Audience Pain Points: Lack of structured documentation, difficulty scaling prompts, variable consistency issues.\n2. Recent Trends: Increasing demand for multi-model interoperability, adoption of structured XML guidelines, prompt chains orchestration.\n3. Key Nuances: Different LLM engines respond better to specific syntax structures.'
  },
  {
    id: '2',
    title: 'Outline & Strategy Formulation',
    role: 'Lead Business Architect',
    prompt: 'Using the Fact Sheet generated in Step 1, create a strategic execution outline for: "{{topic}}". Target key solutions for: "{{audience}}".',
    outputDescription: 'Execution Strategy Outline',
    simulatedOutput: 'OUTLINE PROPOSAL:\n- SECTION 1: Executive Context & Objectives (addresses pain point #1).\n- SECTION 2: Architecture Framework (utilizes multi-model interoperability rules).\n- SECTION 3: Resource Allocations & Guardrails (addresses variable consistency problems).'
  },
  {
    id: '3',
    title: 'Drafting & Final Deliverable',
    role: 'Senior Content Strategist',
    prompt: 'Draft the final comprehensive solution about: "{{topic}}". Incorporate the Step 2 Outline and direct it specifically to: "{{audience}}". Focus on high-end actionable takeaways.',
    outputDescription: 'Final Engineered Asset',
    simulatedOutput: 'FINAL DELIVERABLE DRAFT:\nWelcome to the official master plan. As requested for {{audience}}, we present a deep dive into {{topic}}.\n\nKey Strategy:\n- Adopt dynamic chaining principles.\n- Establish direct negative constraints early to save 40% of token compute overhead.\n- Verify compatibility using our 8-dimension Scanning Radar.'
  }
];

export default function PromptChainsBuilder() {
  const [steps, setSteps] = useState<ChainStep[]>(DEFAULT_STEPS);
  const [variables, setVariables] = useState({
    topic: 'Automating Customer Support with AI Agents',
    audience: 'B2B Customer Support Directors'
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [activeRunningStep, setActiveRunningStep] = useState<string | null>(null);
  const [simulatedOutputs, setSimulatedOutputs] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  // Load a pipeline preset
  const handleLoadPreset = (presetIndex: number) => {
    const selected = PIPELINE_PRESETS[presetIndex];
    setSteps(selected.steps);
    setVariables(selected.variables);
    setSimulatedOutputs({});
    toast({
      title: 'Pipeline Preset Loaded',
      description: `Loaded the '${selected.name}' structure and variables.`
    });
  };

  // Extract variables dynamically from prompt texts e.g. {{variableName}}
  const getExtractedVariables = () => {
    const vars = new Set<string>();
    steps.forEach(step => {
      const matches = step.prompt.match(/\{\{(.*?)\}\}/g);
      if (matches) {
        matches.forEach(m => {
          vars.add(m.replace(/\{\{|\}\}/g, '').trim());
        });
      }
    });
    return Array.from(vars);
  };

  const extractedVars = getExtractedVariables();

  const handleAddStep = () => {
    const newId = String(Date.now());
    const newStep: ChainStep = {
      id: newId,
      title: `Step ${steps.length + 1}: Custom Prompt Task`,
      role: 'Specialized Agent Persona',
      prompt: 'Act as a professional. Using output from the previous steps, execute task about: "{{topic}}". Keep it structured.',
      outputDescription: 'Segment Output',
      simulatedOutput: 'SIMULATED STEP RESPONSE:\nSuccess. Successfully processed pipeline task. Ready for forwarding.'
    };
    setSteps([...steps, newStep]);
    toast({
      title: 'Step Added',
      description: 'A new chain step has been appended to your pipeline.'
    });
  };

  const handleDeleteStep = (id: string) => {
    if (steps.length <= 1) {
      toast({
        title: 'Cannot Delete',
        description: 'You must keep at least one step in your prompt pipeline.',
        variant: 'destructive'
      });
      return;
    }
    setSteps(steps.filter(s => s.id !== id));
  };

  const handleUpdateStep = (id: string, field: keyof ChainStep, value: string) => {
    setSteps(steps.map(s => {
      if (s.id === id) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const handleVarChange = (name: string, value: string) => {
    setVariables(prev => ({ ...prev, [name]: value }));
  };

  // Run simulated pipeline flow
  const handleRunPipeline = async () => {
    setIsRunning(true);
    setSimulatedOutputs({});
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      setActiveRunningStep(step.id);
      
      // Delay for simulation animation
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Interpolate prompt variables for output display
      let formattedOutput = step.simulatedOutput;
      Object.entries(variables).forEach(([k, v]) => {
        formattedOutput = formattedOutput.replace(new RegExp(`{{${k}}}`, 'g'), v);
      });

      setSimulatedOutputs(prev => ({
        ...prev,
        [step.id]: formattedOutput
      }));
    }

    setActiveRunningStep(null);
    setIsRunning(false);
    toast({
      title: 'Pipeline Run Complete',
      description: 'Simulated prompt chain executed successfully!'
    });
  };

  // Copy full chain bundle code
  const handleCopyBundle = () => {
    let bundleText = `# PROMPT GRADE™ PIPELINE CHAIN BUNDLE\n`;
    bundleText += `*Exported Workspace Configuration*\n\n`;
    
    bundleText += `## Core Variables:\n`;
    Object.entries(variables).forEach(([k, v]) => {
      bundleText += `- **\$\{${k}\}**: ${v}\n`;
    });
    bundleText += `\n---\n\n`;

    steps.forEach((step, idx) => {
      bundleText += `### STEP ${idx + 1}: ${step.title.toUpperCase()}\n`;
      bundleText += `- **Role Persona:** ${step.role}\n`;
      bundleText += `- **Output Product:** ${step.outputDescription}\n\n`;
      bundleText += `#### Instruction Template:\n\`\`\`text\n${step.prompt}\n\`\`\`\n\n`;
      if (idx < steps.length - 1) {
        bundleText += `*Forward Output of Step ${idx + 1} to Step ${idx + 2} input context.*\n\n---\n\n`;
      }
    });

    navigator.clipboard.writeText(bundleText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied to Clipboard',
      description: 'Full Markdown prompt chain bundle is ready to paste!'
    });
  };

  return (
    <section className="py-8 relative">
      {/* Visual Blueprints Preset Header Drawer */}
      <div className="bg-card border border-border/70 rounded-xl p-4.5 mb-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <FolderHeart className="w-5 h-5 text-primary shrink-0" />
          <div>
            <h4 className="font-display font-bold text-foreground text-sm">Chains Blueprint Vault</h4>
            <p className="text-xs text-muted-foreground">Load pre-configured multi-step pipeline architectures with a single click.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {PIPELINE_PRESETS.map((p, idx) => (
            <button
              key={p.name}
              onClick={() => handleLoadPreset(idx)}
              className="px-3.5 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border hover:border-primary/30 transition-all font-display font-semibold text-xs text-left"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Side: Pipeline Control Panel */}
        <div className="w-full lg:w-1/3 space-y-6">
          <div className="bg-card border border-border/80 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Settings2 className="w-5 h-5 text-primary" />
              <h4 className="font-display font-bold text-foreground">Pipeline Settings</h4>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Inject active variables into your prompts using <code className="text-primary font-mono font-semibold">{"{{variable_name}}"}</code>. They will dynamically populate during runtime.
            </p>

            {/* Variable Form Inputs */}
            <div className="space-y-3.5 pt-2">
              {extractedVars.map(varName => (
                <div key={varName} className="space-y-1.5">
                  <label className="text-[11px] font-mono font-bold text-primary uppercase tracking-wider">
                    {"{{"} {varName} {"}}"}
                  </label>
                  <input
                    type="text"
                    value={(variables as any)[varName] || ''}
                    onChange={(e) => handleVarChange(varName, e.target.value)}
                    placeholder={`Enter value for ${varName}`}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50 font-sans"
                  />
                </div>
              ))}
              {extractedVars.length === 0 && (
                <div className="flex items-center gap-2 p-3 bg-secondary/40 border border-border/40 rounded-lg text-xs text-muted-foreground italic">
                  <Info className="w-4 h-4 text-primary shrink-0" />
                  No active variables detected. Add {"{{variable}}"} to any prompt template.
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border/40 flex gap-2">
              <button
                onClick={handleRunPipeline}
                disabled={isRunning || steps.length === 0}
                className="flex-1 bg-primary text-primary-foreground font-display font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-40 transition-all shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Run Pipeline Chain
              </button>
              <button
                onClick={handleCopyBundle}
                disabled={steps.length === 0}
                className="px-3 border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 rounded-lg transition-colors"
                title="Export Chain Bundle"
              >
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Code className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Prompt Engineering Insight */}
          <div className="bg-gradient-card border border-border/80 rounded-xl p-5 shadow-sm">
            <h5 className="font-display font-bold text-sm text-foreground mb-2 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-primary" /> Why use prompt chains?
            </h5>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Complex tasks (like creating software or market analyses) overwhelm LLMs when stuffed into a single prompt. Breaking the task down into sequential steps—where each prompt relies exclusively on the structured outputs of the last—increases performance, reduces hallucinations, and saves token compute.
            </p>
          </div>
        </div>

        {/* Right Side: Interactive Visual Workflow */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Visual Chains Designer
              </h3>
              <p className="text-xs text-muted-foreground">Arrange, customize, and prototype step-by-step sequential workflows.</p>
            </div>

            <button
              onClick={handleAddStep}
              className="bg-secondary hover:bg-secondary/80 text-foreground border border-border hover:border-primary/30 font-display font-bold text-xs px-3.5 py-1.8 rounded-lg flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Step
            </button>
          </div>

          {/* Steps Grid */}
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {steps.map((step, idx) => {
                const isStepRunning = activeRunningStep === step.id;
                const stepOutput = simulatedOutputs[step.id];
                
                return (
                  <motion.div
                    key={step.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`bg-card border rounded-xl p-5 transition-all shadow-sm ${
                      isStepRunning 
                        ? 'border-primary shadow-lg ring-1 ring-primary/20 bg-primary/[0.01]' 
                        : stepOutput 
                          ? 'border-primary/20 bg-card' 
                          : 'border-border/80'
                    }`}
                  >
                    {/* Step Header */}
                    <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-secondary border border-border text-foreground font-mono text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => handleUpdateStep(step.id, 'title', e.target.value)}
                          className="bg-transparent border-none text-foreground font-display font-bold text-sm focus:outline-none focus:border-b focus:border-primary max-w-[250px]"
                        />
                      </div>

                      <button
                        onClick={() => handleDeleteStep(step.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        title="Delete Step"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Step Fields */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Left: Prompts editor */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">Agent Persona</label>
                            <input
                              type="text"
                              value={step.role}
                              onChange={(e) => handleUpdateStep(step.id, 'role', e.target.value)}
                              className="w-full bg-secondary/60 border border-border/80 rounded-md px-2 py-1 text-xs text-foreground focus:outline-none"
                              placeholder="e.g. Senior Copywriter"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">Output Product</label>
                            <input
                              type="text"
                              value={step.outputDescription}
                              onChange={(e) => handleUpdateStep(step.id, 'outputDescription', e.target.value)}
                              className="w-full bg-secondary/60 border border-border/80 rounded-md px-2 py-1 text-xs text-foreground focus:outline-none"
                              placeholder="e.g. Context Sheet"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">Prompt Instruction Template</label>
                          <textarea
                            value={step.prompt}
                            onChange={(e) => handleUpdateStep(step.id, 'prompt', e.target.value)}
                            rows={3}
                            className="w-full bg-secondary/80 border border-border/80 rounded-lg p-2.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary/40 resize-none leading-relaxed"
                          />
                        </div>
                      </div>

                      {/* Right: Outputs Terminal */}
                      <div className="flex flex-col bg-black/40 border border-border/60 rounded-lg p-3 justify-between min-h-[140px] relative overflow-hidden">
                        <div className="absolute top-2.5 right-2.5 text-[9px] font-mono font-semibold text-muted-foreground">
                          Context: Step Output
                        </div>
                        
                        {isStepRunning && (
                          <div className="absolute inset-0 bg-primary/[0.02] backdrop-blur-[0.5px] flex flex-col items-center justify-center text-xs font-semibold text-primary font-display gap-2">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                            >
                              <Plus className="w-5 h-5" />
                            </motion.div>
                            Simulating execution...
                          </div>
                        )}

                        <div className="flex-1 overflow-auto text-[11px] font-mono text-muted-foreground/90 whitespace-pre-wrap leading-relaxed">
                          {stepOutput ? (
                            <span className="text-white/90">{stepOutput}</span>
                          ) : (
                            <span className="text-muted-foreground/30 italic">Awaiting pipeline run simulation...</span>
                          )}
                        </div>

                        <div className="border-t border-border/30 pt-2 mt-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground/75">
                          <span>Output: {step.outputDescription}</span>
                          <span className="text-primary font-bold">PES™ ~94</span>
                        </div>
                      </div>
                    </div>

                    {/* Sequential Arrow Indicator */}
                    {idx < steps.length - 1 && (
                      <div className="flex justify-center items-center py-2 -mb-2 mt-4">
                        <motion.div 
                          animate={isStepRunning ? { y: [0, 4, 0] } : {}}
                          transition={{ repeat: Infinity, duration: 1 }}
                        >
                          <ArrowDown className={`w-5 h-5 ${isStepRunning ? 'text-primary' : 'text-muted-foreground/45'}`} />
                        </motion.div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
