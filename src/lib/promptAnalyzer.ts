// PromptGrade scoring engine.
//
// The score is a deterministic checklist: the same prompt always gets the same score.
// Nothing is sent to a server and no AI model is called. Each of the 8 dimensions starts
// from a base value and adds (or subtracts) fixed points for each check the prompt passes.
// The overall score is the average of the 8 dimension scores. RUBRIC below is the single
// source of truth; the "How scoring works" section in the UI is rendered from it.

export interface CheckResult {
  label: string;
  points: number;
  passed: boolean;
}

export interface DimensionScore {
  key: string;
  label: string;
  emoji: string;
  score: number;
  feedback: string;
  /** Present on results from engine v2 onwards (older history items lack it). */
  checks?: CheckResult[];
}

export interface Annotation {
  text: string;
  type: 'warning' | 'error' | 'success' | 'info';
  suggestion: string;
}

export interface ModelMatch {
  model: string;
  level: 'excellent' | 'good' | 'poor';
  note: string;
}

export interface ModelRewrite {
  model: string;
  name: string;
  rewrite: string;
  focus: string;
}

export interface AnalysisResult {
  overallScore: number;
  grade: string;
  verdict: string;
  dimensions: DimensionScore[];
  annotations: Annotation[];
  rewrite: string;
  /** Score of `rewrite`, measured with this same engine (engine v2+). */
  rewriteScore?: number;
  modelRewrites: ModelRewrite[];
  modelMatches: ModelMatch[];
  engineVersion?: number;
}

export const ENGINE_VERSION = 2;

// ---------------------------------------------------------------------------
// Text features
// ---------------------------------------------------------------------------

interface Ctx {
  text: string;
  lower: string;
  words: string[];
  wordCount: number;
  lines: string[];
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whole-word / whole-phrase match, so "if" does not match "specific". */
function hasTerm(lower: string, term: string): boolean {
  const start = /^\w/.test(term) ? '\\b' : '';
  const end = /\w$/.test(term) ? '\\b' : '';
  return new RegExp(`${start}${escapeRegex(term)}${end}`, 'i').test(lower);
}

function countTerms(lower: string, terms: string[]): number {
  return terms.filter((t) => hasTerm(lower, t)).length;
}

const ROLE_PATTERNS = [
  /\byou are (an?|the)\b/i,
  /\bact as\b/i,
  /\byour role\b/i,
  /\bpersona\b/i,
  /\bpretend (to be|you are)\b/i,
  /\bimagine you are\b/i,
  /\bas an? (expert|senior|experienced|professional|specialist)\b/i,
];

const TASK_VERBS =
  /\b(write|create|draft|explain|summari[sz]e|review|analy[sz]e|compare|list|generate|plan|design|translate|rewrite|classify|extract|build|recommend|outline|describe|evaluate|answer|calculate|reply|suggest|identify|convert|edit|proofread|give|tell|make|help)\b/i;

const FORMAT_TERMS = [
  'format', 'bullet', 'bullets', 'bullet points', 'heading', 'headings', 'paragraph', 'paragraphs',
  'list', 'table', 'markdown', 'json', 'csv', 'yaml', 'numbered', 'outline', 'plain text', 'code block',
  'subject line',
];
const TONE_TERMS = [
  'tone', 'style', 'voice', 'formal', 'casual', 'friendly', 'conversational', 'academic', 'warm',
  'direct', 'concise', 'simple language', 'plain language', 'persuasive', 'neutral', 'no hype',
];
const REASONING_TERMS = [
  'analyze', 'analyse', 'evaluate', 'compare', 'consider', 'reason', 'reasoning', 'justify',
  'explain why', 'explain your reasoning', 'walk through', 'trade-offs', 'pros and cons', 'criteria',
];
const STEP_BY_STEP_TERMS = ['step by step', 'step-by-step', 'chain of thought', 'think before', 'before you answer', 'think through'];
const SELF_CHECK_TERMS = [
  'verify', 'double-check', 'check your', 'self-check', 'review your answer', 'if unsure', 'confident',
  'say so', 'out of date',
];
const CONSTRAINT_TERMS = [
  'avoid', 'do not', "don't", 'never', 'only', 'must', 'without', 'at most', 'no more than', 'under',
  'exactly', 'maximum', 'minimum', 'limit',
];
const CONDITIONAL_TERMS = ['if', 'unless', 'otherwise', 'in case', 'fallback', 'edge case', 'edge cases', 'instead', 'except'];
const ANTI_HALLUCINATION_TERMS = [
  'do not invent', "don't invent", 'never make up', "don't make up", 'do not make up', 'make up',
  "if you don't know", 'if you do not know', 'if unsure', 'do not guess', "don't guess", 'instead of guessing',
  '[ask]', 'cite', 'sources', 'confident',
];
const CONSTRAINT_SECTION_TERMS = ['constraints', 'constraint', 'rules', 'requirements', 'guardrails', 'restrictions'];
const EXAMPLE_TERMS = ['such as', 'e.g.', 'for example', 'for instance', 'example', 'examples', 'including', 'specifically', 'exactly'];
// Explicit audience or purpose cues only; a bare "for a business" is not an audience.
const AUDIENCE_PATTERN =
  /\b(audience|readers?|aged \d+|students|customers?|clients?|beginners?|non-technical|managers?|executives?|stakeholders?|context:|goal:|purpose|so that|in order to|for (people|someone|teams?|small|busy|new|first-time)\b)/i;
const VAGUE_TERMS = ['thing', 'things', 'stuff', 'something', 'nice', 'good', 'interesting', 'whatever', 'somehow', 'etc'];
const FILLER_TERMS = ['please', 'kindly', 'i want you to', 'i would like', 'can you', 'could you', 'just', 'basically', 'very', 'really'];
const LENGTH_PATTERN =
  /(\b\d+\s*(-|–|to)?\s*\d*\s*(words?|characters?|chars|sentences?|paragraphs?|pages?|bullets?|bullet points|items?|lines?|points?|minutes?|tokens?)\b)|\b(one|two|three|single)[- ]page\b|\b(under|at most|no more than|maximum of|max\.?)\s+\d+/i;
const PLACEHOLDER_PATTERN = /\[[^\]\n]{1,40}\]|\{[^}\n]{1,40}\}|<[A-Z_][A-Z0-9_ ]{0,30}>|_{3,}/;
// Input fenced off from the instructions: triple quotes/backticks, or a line ending in ":"
// followed by a placeholder or quoted block on the next line.
const DELIMITED_INPUT_PATTERN = /"""|```|'''|:[ \t]*\n\s*(\[|\{|<|")/;
const LABELED_SECTION_PATTERN = /^\s*(#{1,4}\s+\S|[A-Z][A-Za-z ]{1,24}:\s*(\S|$)|<\w+>)/m;
const LIST_PATTERN = /^\s*(\d+[.)]|[-*•])\s+\S/m;
const SEQUENCE_TERMS = ['first', 'then', 'next', 'finally', 'step', 'steps', 'in this order', 'followed by'];

function makeCtx(prompt: string): Ctx {
  const text = prompt.trim();
  const words = text.split(/\s+/).filter(Boolean);
  return { text, lower: text.toLowerCase(), words, wordCount: words.length, lines: text.split('\n') };
}

const hasRole = (c: Ctx) => ROLE_PATTERNS.some((r) => r.test(c.text));
const hasAudience = (c: Ctx) => AUDIENCE_PATTERN.test(c.text);
const hasNumbers = (c: Ctx) => /\d/.test(c.text);
const hasVague = (c: Ctx) => countTerms(c.lower, VAGUE_TERMS) > 0;
const avgSentenceLength = (c: Ctx) => {
  const sentences = c.text.split(/[.!?\n]+/).filter((s) => s.trim().split(/\s+/).filter(Boolean).length > 0);
  return c.wordCount / Math.max(sentences.length, 1);
};

// ---------------------------------------------------------------------------
// Rubric
// ---------------------------------------------------------------------------

interface Check {
  label: string;
  points: number;
  test: (c: Ctx) => boolean;
}

interface DimensionDef {
  key: string;
  label: string;
  emoji: string;
  what: string;
  base: number;
  checks: Check[];
  feedback: [high: string, mid: string, low: string];
}

const DIMENSIONS: DimensionDef[] = [
  {
    key: 'clarity',
    label: 'Clarity',
    emoji: '🎯',
    what: 'Can the AI tell exactly what you want and who it is for?',
    base: 30,
    checks: [
      { label: 'States a clear task (write, explain, review, compare…)', points: 15, test: (c) => TASK_VERBS.test(c.text) },
      { label: 'At least 8 words', points: 10, test: (c) => c.wordCount >= 8 },
      { label: 'At least 20 words', points: 10, test: (c) => c.wordCount >= 20 },
      { label: 'Assigns a role ("You are a…", "Act as…")', points: 10, test: hasRole },
      { label: 'Names the audience or purpose', points: 15, test: hasAudience },
      { label: 'Readable sentences (25 words or fewer on average)', points: 10, test: (c) => c.wordCount >= 8 && avgSentenceLength(c) <= 25 },
      { label: 'No vague words (thing, stuff, nice, interesting…)', points: 10, test: (c) => c.wordCount >= 8 && !hasVague(c) },
    ],
    feedback: [
      'Clear task with a defined audience or purpose.',
      'The task is understandable but leaves the AI to guess some details.',
      'Ambiguous: the AI will have to guess what you want.',
    ],
  },
  {
    key: 'structure',
    label: 'Structure',
    emoji: '📐',
    what: 'Is the prompt organised (role, context, task, format, constraints)?',
    base: 15,
    checks: [
      { label: 'Assigns a role', points: 20, test: hasRole },
      { label: 'Uses separate lines or sections', points: 15, test: (c) => c.lines.filter((l) => l.trim()).length >= 3 },
      { label: 'Contains a numbered or bulleted list', points: 15, test: (c) => LIST_PATTERN.test(c.text) },
      { label: 'Uses sequence words (first, then, finally, steps)', points: 10, test: (c) => countTerms(c.lower, SEQUENCE_TERMS) > 0 },
      { label: 'Labels its sections (Task:, Format:, ### headings, <tags>)', points: 15, test: (c) => LABELED_SECTION_PATTERN.test(c.text) },
      { label: 'Names an output format', points: 10, test: (c) => countTerms(c.lower, FORMAT_TERMS) > 0 },
    ],
    feedback: [
      'Well organised: role, task and format are easy to find.',
      'Some structure, but key parts (role, format, constraints) are missing or mixed together.',
      'No structure. Try Role → Context → Task → Format → Constraints.',
    ],
  },
  {
    key: 'specificity',
    label: 'Specificity',
    emoji: '🔍',
    what: 'Does it give concrete details: numbers, examples, context?',
    base: 15,
    checks: [
      { label: 'At least 20 words of detail', points: 10, test: (c) => c.wordCount >= 20 },
      { label: 'At least 50 words of detail', points: 10, test: (c) => c.wordCount >= 50 },
      { label: 'Includes numbers or quantities', points: 20, test: hasNumbers },
      { label: 'Gives examples or specifics (such as, e.g., including…)', points: 15, test: (c) => countTerms(c.lower, EXAMPLE_TERMS) > 0 },
      { label: 'Names the audience or context', points: 15, test: hasAudience },
      { label: 'Quotes or delimits the input text', points: 10, test: (c) => DELIMITED_INPUT_PATTERN.test(c.text) || /"[^"\n]{3,}"/.test(c.text) },
      { label: 'No vague words', points: 5, test: (c) => c.wordCount >= 8 && !hasVague(c) },
    ],
    feedback: [
      'Specific, with concrete details and context.',
      'Somewhat specific; add numbers, examples or audience details.',
      'Very vague: add context, numbers, examples and scope.',
    ],
  },
  {
    key: 'tokenEfficiency',
    label: 'Token Efficiency',
    emoji: '⚡',
    what: 'Is it long enough to be complete without padding or repetition?',
    base: 40,
    checks: [
      { label: 'Length between 20 and 300 words', points: 25, test: (c) => c.wordCount >= 20 && c.wordCount <= 300 },
      {
        label: 'Little repetition (60%+ unique words, 10+ words)',
        points: 20,
        test: (c) => c.wordCount >= 10 && new Set(c.words.map((w) => w.toLowerCase())).size / c.wordCount >= 0.6,
      },
      { label: 'At most one filler phrase (please, could you, just, very…)', points: 15, test: (c) => countTerms(c.lower, FILLER_TERMS) <= 1 },
      { label: 'Fewer than 10 words: too short to be complete', points: -25, test: (c) => c.wordCount < 10 },
      { label: 'More than 500 words', points: -20, test: (c) => c.wordCount > 500 },
    ],
    feedback: [
      'Complete and compact.',
      'Reasonable, but it could be tighter or more complete.',
      'Too short to be complete, or padded with repetition.',
    ],
  },
  {
    key: 'reasoning',
    label: 'Reasoning Activation',
    emoji: '🧠',
    what: 'Does it ask the AI to think, compare or check its work (where the task needs it)?',
    base: 20,
    checks: [
      { label: 'Asks for analysis (analyze, evaluate, compare, justify…)', points: 30, test: (c) => countTerms(c.lower, REASONING_TERMS) > 0 },
      { label: 'Two or more reasoning cues', points: 15, test: (c) => countTerms(c.lower, REASONING_TERMS) >= 2 },
      { label: 'Asks for step-by-step thinking before answering', points: 20, test: (c) => countTerms(c.lower, STEP_BY_STEP_TERMS) > 0 },
      { label: 'Asks the AI to check itself or flag uncertainty', points: 15, test: (c) => countTerms(c.lower, SELF_CHECK_TERMS) > 0 },
    ],
    feedback: [
      'Strong reasoning cues.',
      'Some reasoning cues.',
      'No reasoning cues. For analytical tasks, ask the AI to compare, justify or think step by step.',
    ],
  },
  {
    key: 'outputControl',
    label: 'Output Control',
    emoji: '🎨',
    what: 'Does it say what the answer should look like: format, tone, length?',
    base: 10,
    checks: [
      { label: 'Names an output format (list, table, JSON, headings…)', points: 25, test: (c) => countTerms(c.lower, FORMAT_TERMS) > 0 },
      { label: 'Two or more format details', points: 10, test: (c) => countTerms(c.lower, FORMAT_TERMS) >= 2 },
      { label: 'Sets the tone or style', points: 20, test: (c) => countTerms(c.lower, TONE_TERMS) > 0 },
      { label: 'Sets a length (500 words, 5 bullets, one page…)', points: 25, test: (c) => LENGTH_PATTERN.test(c.text) },
      { label: 'Names the audience', points: 10, test: hasAudience },
    ],
    feedback: [
      'Clear format, tone and length.',
      'Some output guidance; add format, tone or length.',
      'No output control. Specify format, tone and length.',
    ],
  },
  {
    key: 'edgeCases',
    label: 'Constraints & Edge Cases',
    emoji: '🛡️',
    what: 'Does it set limits and say what to do in tricky cases?',
    base: 10,
    checks: [
      { label: 'At least one constraint (avoid, do not, only, at most…)', points: 25, test: (c) => countTerms(c.lower, CONSTRAINT_TERMS) > 0 },
      { label: 'Three or more constraints', points: 15, test: (c) => countTerms(c.lower, CONSTRAINT_TERMS) >= 3 },
      { label: 'Handles conditions (if, unless, otherwise, instead…)', points: 25, test: (c) => countTerms(c.lower, CONDITIONAL_TERMS) > 0 },
      { label: 'Tells the AI not to invent facts or to flag uncertainty', points: 15, test: (c) => countTerms(c.lower, ANTI_HALLUCINATION_TERMS) > 0 },
      { label: 'Has a labelled constraints or rules section', points: 10, test: (c) => countTerms(c.lower, CONSTRAINT_SECTION_TERMS) > 0 },
    ],
    feedback: [
      'Good guardrails and edge-case handling.',
      'Some constraints; consider what should happen in edge cases.',
      'No guardrails. Add what to avoid and how to handle edge cases.',
    ],
  },
  {
    key: 'reusability',
    label: 'Reusability',
    emoji: '🔄',
    what: 'Could you reuse it as a template?',
    base: 15,
    checks: [
      { label: 'Has placeholders ([TOPIC], {NAME}, ___)', points: 35, test: (c) => PLACEHOLDER_PATTERN.test(c.text) },
      { label: 'Separates the input from the instructions', points: 15, test: (c) => DELIMITED_INPUT_PATTERN.test(c.text) },
      { label: 'Uses separate lines or sections', points: 15, test: (c) => c.lines.filter((l) => l.trim()).length >= 3 },
      { label: 'Assigns a role', points: 10, test: hasRole },
      { label: 'At least 30 words', points: 10, test: (c) => c.wordCount >= 30 },
    ],
    feedback: [
      'Reusable as a template.',
      'Partly reusable; placeholders would make it a template.',
      'One-off prompt. Add placeholders like [TOPIC] to reuse it.',
    ],
  },
];

export const GRADE_SCALE: { min: number; grade: string }[] = [
  { min: 95, grade: 'A+' },
  { min: 90, grade: 'A' },
  { min: 85, grade: 'A-' },
  { min: 80, grade: 'B+' },
  { min: 75, grade: 'B' },
  { min: 70, grade: 'B-' },
  { min: 65, grade: 'C+' },
  { min: 60, grade: 'C' },
  { min: 55, grade: 'C-' },
  { min: 50, grade: 'D+' },
  { min: 45, grade: 'D' },
  { min: 40, grade: 'D-' },
  { min: 0, grade: 'F' },
];

/** Public, UI-safe description of the rubric (no functions). */
export const RUBRIC = DIMENSIONS.map((d) => ({
  key: d.key,
  label: d.label,
  emoji: d.emoji,
  what: d.what,
  base: d.base,
  checks: d.checks.map(({ label, points }) => ({ label, points })),
}));

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function scoreDimension(def: DimensionDef, c: Ctx): DimensionScore {
  const checks = def.checks.map((ch) => ({ label: ch.label, points: ch.points, passed: ch.test(c) }));
  const score = clamp(def.base + checks.reduce((s, ch) => s + (ch.passed ? ch.points : 0), 0));
  const feedback = score >= 75 ? def.feedback[0] : score >= 50 ? def.feedback[1] : def.feedback[2];
  return { key: def.key, label: def.label, emoji: def.emoji, score, feedback, checks };
}

export function getGrade(score: number): string {
  return GRADE_SCALE.find((g) => score >= g.min)?.grade ?? 'F';
}

/** Scores only (no rewrites); used to measure the rewrite without recursion. */
export function scorePrompt(prompt: string): { overallScore: number; grade: string; dimensions: DimensionScore[] } {
  const c = makeCtx(prompt);
  const dimensions = DIMENSIONS.map((d) => scoreDimension(d, c));
  const overallScore = c.wordCount === 0 ? 0 : Math.round(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length);
  return { overallScore, grade: getGrade(overallScore), dimensions };
}

// ---------------------------------------------------------------------------
// Annotations and rewrites
// ---------------------------------------------------------------------------

function generateAnnotations(c: Ctx): Annotation[] {
  const annotations: Annotation[] = [];

  if (c.wordCount < 10) {
    annotations.push({ text: 'Entire prompt', type: 'error', suggestion: 'Your prompt is very short. Add the role, context, format and constraints.' });
  }
  if (!hasRole(c)) {
    annotations.push({ text: 'Missing role assignment', type: 'warning', suggestion: 'Start with "You are a [role] with expertise in [domain]" to set context.' });
  }
  if (countTerms(c.lower, FORMAT_TERMS) === 0) {
    annotations.push({ text: 'No output format specified', type: 'warning', suggestion: 'Say how the answer should look: "Use headings and bullet points" or "Return a table".' });
  }
  if (countTerms(c.lower, TONE_TERMS) === 0) {
    annotations.push({ text: 'No tone or style defined', type: 'info', suggestion: 'Specify the tone: "friendly and plain" or "formal, for a board report".' });
  }
  if (!hasNumbers(c)) {
    annotations.push({ text: 'No numbers or quantities', type: 'info', suggestion: 'Add specifics: word count, number of items, time frame or target.' });
  }
  if (countTerms(c.lower, CONSTRAINT_TERMS) === 0) {
    annotations.push({ text: 'No constraints or guardrails', type: 'warning', suggestion: 'Add what to avoid: "Do not include generic advice. Do not invent statistics."' });
  }
  if (/^(write|create|make)\b/i.test(c.text) && !hasRole(c)) {
    annotations.push({ text: `"${c.words.slice(0, 3).join(' ')}…"`, type: 'warning', suggestion: 'The prompt jumps straight to the task. Give the role and context first.' });
  }
  const foundVague = VAGUE_TERMS.filter((w) => hasTerm(c.lower, w));
  if (foundVague.length > 0) {
    annotations.push({ text: `Vague language: "${foundVague.join(', ')}"`, type: 'warning', suggestion: 'Replace vague words with precise terms, e.g. "B2B email subject lines" instead of "good ideas".' });
  }
  if (annotations.length === 0) {
    annotations.push({ text: 'Well-crafted prompt', type: 'success', suggestion: 'It covers most of the checklist. An example of the output you want can help further.' });
  }
  return annotations;
}

const STOP_WORDS = ['write', 'create', 'make', 'about', 'that', 'this', 'with', 'from', 'have', 'will', 'would', 'could', 'should', 'please', 'help', 'tell', 'give', 'some'];

function guessTopic(c: Ctx, n = 5) {
  const topicWords = c.words.filter((w) => w.length > 3 && !STOP_WORDS.includes(w.toLowerCase().replace(/[^a-z]/g, '')));
  return topicWords.slice(0, n).join(' ').replace(/[.,!?;:]+$/, '') || 'the requested topic';
}

function generateRewrite(c: Ctx): string {
  const topic = guessTopic(c);
  const task = c.text.charAt(0).toUpperCase() + c.text.slice(1);
  return `You are an expert with deep knowledge of ${topic}.

**Task:** ${task}${/[.!?]$/.test(task) ? '' : '.'}

**Context:** [WHO THE OUTPUT IS FOR AND WHY YOU NEED IT]

**Requirements:**
- Structure the response with clear headings and bullet points
- Include 3-5 specific, real-world examples
- Length: [TARGET LENGTH, e.g. 800-1,200 words]

**Tone:** Professional but conversational.

**Constraints:**
- Avoid generic or surface-level advice
- Do not invent statistics, names or quotes; if a fact is uncertain, say so
- End with a short summary of the key takeaways

**Format:** Markdown with headings and numbered lists for sequential steps.`;
}

function generateModelRewrites(c: Ctx): ModelRewrite[] {
  const topic = guessTopic(c);
  const cleanPrompt = c.text.charAt(0).toUpperCase() + c.text.slice(1);

  return [
    {
      model: 'gpt-4o',
      name: 'GPT-style rewrite',
      focus: 'Numbered instructions, explicit reasoning steps and markdown structure.',
      rewrite: `You are an expert in ${topic}.

[Task]
${cleanPrompt}

[Instructions]
1. Think through the request step by step before writing the final answer.
2. Cover the topic with real-world examples, concrete numbers and frameworks.
3. Give each section an H2 heading and concise bullet points.

[Tone and format]
- Tone: professional and direct.
- Format: markdown; bold the key terms.
- Length: [TARGET LENGTH].
- Do not invent facts; flag anything you are unsure about.`,
    },
    {
      model: 'claude',
      name: 'Claude-style rewrite',
      focus: 'XML tags that separate context, instructions and constraints.',
      rewrite: `<role>
You are a senior specialist in ${topic}.
</role>

<context>
[WHO THIS IS FOR AND WHY IT IS NEEDED]
</context>

<instructions>
${cleanPrompt}

1. Divide the response into clear sections.
2. Prefer specific mechanisms and examples over general statements.
3. Include at least 3 concrete examples.
</instructions>

<constraints>
- No filler or repeated preambles.
- If you must make assumptions, list them first inside <assumptions> tags.
- Do not invent facts; say when something is uncertain.
</constraints>`,
    },
    {
      model: 'gemini',
      name: 'Gemini-style rewrite',
      focus: 'Markdown sections, a summary first, and an action checklist.',
      rewrite: `## Role
You are a practical expert in ${topic}.

## Task
${cleanPrompt}

## Output
1. **Summary**: 3 bullet points with the key takeaways.
2. **Details**: a breakdown of the main parts of the topic; use a table for comparisons.
3. **Checklist**: step-by-step actions the reader can take.

## Tone and constraints
- Friendly but professional.
- If a point is debated, present both sides.
- Do not invent statistics or sources.`,
    },
    {
      model: 'llama',
      name: 'Open-model rewrite (Llama, DeepSeek, Mistral)',
      focus: 'Short, direct instructions and explicit negative constraints.',
      rewrite: `### Role
You are an expert in ${topic}.

### Task
${cleanPrompt}

### Rules
- Start directly with the answer; no introduction.
- Do NOT give generic advice; support every point with a practical example.
- Use exact figures where you know them and [PLACEHOLDERS] where you don't.
- Format: H2/H3 headings, bold keywords, short paragraphs or bullet lists.`,
    },
  ];
}

const IMAGE_PROMPT_PATTERN = /\b(image|photo|photograph|illustration|logo|drawing|painting|render|midjourney|stable diffusion|dall-?e)\b/i;

function generateModelMatches(score: number, c: Ctx): ModelMatch[] {
  const isImage = IMAGE_PROMPT_PATTERN.test(c.text);
  const level = (min: number): ModelMatch['level'] => (score >= min ? 'excellent' : score >= 40 ? 'good' : 'poor');
  const note = (min: number) =>
    score >= min ? 'Structured enough to work well' : 'More structure and constraints would help';
  return [
    { model: 'ChatGPT (OpenAI)', level: level(60), note: note(60) },
    { model: 'Claude (Anthropic)', level: level(60), note: note(60) },
    { model: 'Gemini (Google)', level: level(60), note: note(60) },
    { model: 'Open models (Llama, Mistral)', level: level(70), note: score >= 70 ? 'Explicit enough for smaller models' : 'Smaller models need very explicit instructions' },
    {
      model: 'Image models (Midjourney etc.)',
      level: isImage ? 'good' : 'poor',
      note: isImage ? 'Looks like an image prompt; add subject, style, lighting and aspect ratio' : 'Text prompt: not meant for image models',
    },
  ];
}

export function analyzePrompt(prompt: string): AnalysisResult {
  const c = makeCtx(prompt);
  const { overallScore, grade, dimensions } = scorePrompt(prompt);
  const weakest = [...dimensions].sort((a, b) => a.score - b.score).slice(0, 2).map((d) => d.label);
  const verdict =
    overallScore >= 75
      ? `Scored ${overallScore}/100 on PromptGrade's 8-part checklist. Lowest areas: ${weakest.join(' and ')}.`
      : `Scored ${overallScore}/100 on PromptGrade's 8-part checklist. Biggest gaps: ${weakest.join(' and ')}.`;
  const rewrite = generateRewrite(c);

  return {
    overallScore,
    grade,
    verdict,
    dimensions,
    annotations: generateAnnotations(c),
    rewrite,
    rewriteScore: scorePrompt(rewrite).overallScore,
    modelRewrites: generateModelRewrites(c),
    modelMatches: generateModelMatches(overallScore, c),
    engineVersion: ENGINE_VERSION,
  };
}
