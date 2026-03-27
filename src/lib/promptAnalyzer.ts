export interface DimensionScore {
  key: string;
  label: string;
  emoji: string;
  score: number;
  feedback: string;
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

export interface AnalysisResult {
  overallScore: number;
  grade: string;
  verdict: string;
  dimensions: DimensionScore[];
  annotations: Annotation[];
  rewrite: string;
  modelMatches: ModelMatch[];
}

const ROLE_KEYWORDS = ['you are', 'act as', 'as a', 'your role', 'persona', 'expert', 'specialist', 'professional'];
const STRUCTURE_KEYWORDS = ['step', 'first', 'then', 'next', 'finally', 'section', 'part', 'phase', 'stage', '1.', '2.', '3.'];
const FORMAT_KEYWORDS = ['format', 'structure', 'bullet', 'heading', 'paragraph', 'list', 'table', 'markdown', 'json', 'csv', 'numbered'];
const TONE_KEYWORDS = ['tone', 'style', 'voice', 'formal', 'casual', 'professional', 'friendly', 'conversational', 'academic'];
const REASONING_KEYWORDS = ['think', 'step by step', 'reason', 'analyze', 'consider', 'evaluate', 'chain of thought', 'explain your reasoning', 'walk through'];
const EDGE_KEYWORDS = ['avoid', 'do not', "don't", 'never', 'unless', 'except', 'edge case', 'handle', 'if', 'otherwise', 'fallback'];
const SPECIFICITY_KEYWORDS = ['specifically', 'exactly', 'precisely', 'word', 'character', 'example', 'such as', 'like', 'including', 'e.g.'];

function countMatches(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.filter(k => lower.includes(k)).length;
}

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function scoreClarity(prompt: string): DimensionScore {
  const words = prompt.split(/\s+/).length;
  const hasQuestion = /\?/.test(prompt);
  const sentences = prompt.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLen = words / Math.max(sentences.length, 1);

  let score = 40;
  if (words > 10) score += 15;
  if (words > 25) score += 10;
  if (hasQuestion || sentences.length > 1) score += 10;
  if (avgSentenceLen < 25) score += 10;
  if (avgSentenceLen < 15) score += 5;
  if (countMatches(prompt, ROLE_KEYWORDS) > 0) score += 10;

  const feedback = score >= 75 ? 'Clear intent with good direction.' :
    score >= 50 ? 'Intent is understandable but could be more explicit.' :
    'Ambiguous intent — the AI will have to guess what you want.';

  return { key: 'clarity', label: 'Clarity', emoji: '🎯', score: clamp(score), feedback };
}

function scoreStructure(prompt: string): DimensionScore {
  const roleMatch = countMatches(prompt, ROLE_KEYWORDS);
  const structMatch = countMatches(prompt, STRUCTURE_KEYWORDS);
  const formatMatch = countMatches(prompt, FORMAT_KEYWORDS);

  let score = 20;
  if (roleMatch > 0) score += 20;
  if (structMatch > 0) score += 15;
  if (structMatch > 2) score += 10;
  if (formatMatch > 0) score += 15;
  if (prompt.includes('\n')) score += 10;
  if (/\d\./.test(prompt)) score += 10;

  const feedback = score >= 75 ? 'Well-structured with clear role-task-format flow.' :
    score >= 50 ? 'Some structure present, but missing key framework elements.' :
    'Lacks structure. Use Role → Task → Format → Constraints.';

  return { key: 'structure', label: 'Structure', emoji: '📐', score: clamp(score), feedback };
}

function scoreSpecificity(prompt: string): DimensionScore {
  const words = prompt.split(/\s+/).length;
  const specMatch = countMatches(prompt, SPECIFICITY_KEYWORDS);
  const hasNumbers = /\d+/.test(prompt);

  let score = 25;
  if (words > 30) score += 15;
  if (words > 60) score += 10;
  if (specMatch > 0) score += 20;
  if (specMatch > 2) score += 10;
  if (hasNumbers) score += 15;
  if (prompt.includes('"') || prompt.includes("'")) score += 5;

  const feedback = score >= 75 ? 'Highly specific with clear details and context.' :
    score >= 50 ? 'Somewhat specific but could include more details.' :
    'Very vague — add context, numbers, examples, and scope.';

  return { key: 'specificity', label: 'Specificity', emoji: '🔍', score: clamp(score), feedback };
}

function scoreTokenEfficiency(prompt: string): DimensionScore {
  const words = prompt.split(/\s+/).length;
  const uniqueWords = new Set(prompt.toLowerCase().split(/\s+/)).size;
  const ratio = uniqueWords / Math.max(words, 1);

  let score = 50;
  if (words < 10) score -= 20; // too short = not enough info
  if (words > 200) score -= 15; // too long
  if (words > 500) score -= 15;
  if (ratio > 0.7) score += 20;
  if (ratio > 0.85) score += 10;
  if (words >= 20 && words <= 150) score += 15;

  const feedback = score >= 75 ? 'Concise and information-dense. Great token efficiency.' :
    score >= 50 ? 'Reasonable length but could be tightened.' :
    words < 15 ? 'Too brief — you need more detail, not fewer tokens.' :
    'Overly verbose — trim redundancy to save tokens.';

  return { key: 'tokenEfficiency', label: 'Token Efficiency', emoji: '⚡', score: clamp(score), feedback };
}

function scoreReasoning(prompt: string): DimensionScore {
  const matches = countMatches(prompt, REASONING_KEYWORDS);

  let score = 20;
  if (matches > 0) score += 30;
  if (matches > 2) score += 20;
  if (prompt.toLowerCase().includes('step by step')) score += 15;
  if (prompt.toLowerCase().includes('chain of thought')) score += 15;

  const feedback = score >= 75 ? 'Strong reasoning triggers — the AI will think deeply.' :
    score >= 50 ? 'Some reasoning cues present.' :
    'No reasoning triggers. Add "think step by step" or "explain your reasoning."';

  return { key: 'reasoning', label: 'Reasoning Activation', emoji: '🧠', score: clamp(score), feedback };
}

function scoreOutputControl(prompt: string): DimensionScore {
  const formatMatch = countMatches(prompt, FORMAT_KEYWORDS);
  const toneMatch = countMatches(prompt, TONE_KEYWORDS);
  const hasLength = /\b\d+\s*(word|character|sentence|paragraph|page|token)/i.test(prompt);

  let score = 15;
  if (formatMatch > 0) score += 25;
  if (toneMatch > 0) score += 20;
  if (hasLength) score += 20;
  if (formatMatch > 2) score += 10;
  if (toneMatch > 1) score += 10;

  const feedback = score >= 75 ? 'Excellent output control with format, tone, and length.' :
    score >= 50 ? 'Some output guidance but could be more specific.' :
    'No output control. Specify format, tone, length, and style.';

  return { key: 'outputControl', label: 'Output Control', emoji: '🎨', score: clamp(score), feedback };
}

function scoreEdgeCases(prompt: string): DimensionScore {
  const matches = countMatches(prompt, EDGE_KEYWORDS);

  let score = 15;
  if (matches > 0) score += 25;
  if (matches > 2) score += 20;
  if (matches > 4) score += 15;
  if (prompt.toLowerCase().includes('important')) score += 10;
  if (prompt.toLowerCase().includes('constraint')) score += 15;

  const feedback = score >= 75 ? 'Good guardrails and edge case handling.' :
    score >= 50 ? 'Some constraints set, but consider more guardrails.' :
    'No guardrails. Add what to avoid, constraints, and edge cases.';

  return { key: 'edgeCases', label: 'Edge Case Handling', emoji: '🛡️', score: clamp(score), feedback };
}

function scoreReusability(prompt: string): DimensionScore {
  const hasPlaceholders = /\[.*?\]|\{.*?\}|<.*?>|___/.test(prompt);
  const words = prompt.split(/\s+/).length;
  const hasStructure = prompt.includes('\n') || /\d\./.test(prompt);

  let score = 25;
  if (hasPlaceholders) score += 30;
  if (hasStructure) score += 15;
  if (words > 30) score += 10;
  if (words > 60) score += 10;
  if (countMatches(prompt, ROLE_KEYWORDS) > 0) score += 10;

  const feedback = score >= 75 ? 'Highly reusable — could serve as a template.' :
    score >= 50 ? 'Somewhat reusable with minor tweaks.' :
    'Not reusable. Add placeholders like [TOPIC] to templatize.';

  return { key: 'reusability', label: 'Reusability', emoji: '🔄', score: clamp(score), feedback };
}

function getGrade(score: number): string {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 50) return 'D+';
  if (score >= 45) return 'D';
  if (score >= 40) return 'D-';
  return 'F';
}

function generateAnnotations(prompt: string): Annotation[] {
  const annotations: Annotation[] = [];
  const lower = prompt.toLowerCase();
  const words = prompt.split(/\s+/);

  if (words.length < 10) {
    annotations.push({ text: 'Entire prompt', type: 'error', suggestion: 'Your prompt is extremely short. Add role, context, format, and constraints for better results.' });
  }

  if (countMatches(prompt, ROLE_KEYWORDS) === 0) {
    annotations.push({ text: 'Missing role assignment', type: 'warning', suggestion: 'Start with "You are a [role] with expertise in [domain]" to set context.' });
  }

  if (countMatches(prompt, FORMAT_KEYWORDS) === 0) {
    annotations.push({ text: 'No output format specified', type: 'warning', suggestion: 'Add format instructions: "Structure your response with headings, bullet points, and examples."' });
  }

  if (countMatches(prompt, TONE_KEYWORDS) === 0) {
    annotations.push({ text: 'No tone/style defined', type: 'info', suggestion: 'Specify tone: "Use a professional but conversational tone" or "Write in an academic style."' });
  }

  if (!/\d+/.test(prompt)) {
    annotations.push({ text: 'No specific numbers or quantities', type: 'info', suggestion: 'Add specifics: word count, number of items, time frames, or measurable targets.' });
  }

  if (countMatches(prompt, EDGE_KEYWORDS) === 0) {
    annotations.push({ text: 'No constraints or guardrails', type: 'warning', suggestion: 'Add what to avoid: "Do not include generic advice. Focus only on actionable strategies."' });
  }

  if (lower.startsWith('write') || lower.startsWith('create') || lower.startsWith('make')) {
    annotations.push({ text: `"${words.slice(0, 3).join(' ')}..."`, type: 'warning', suggestion: 'Weak opener. Assign a role first, then give the task with specific parameters.' });
  }

  const vagueWords = ['thing', 'stuff', 'something', 'good', 'nice', 'interesting', 'about'];
  const foundVague = vagueWords.filter(w => lower.includes(w));
  if (foundVague.length > 0) {
    annotations.push({ text: `Vague language: "${foundVague.join(', ')}"`, type: 'warning', suggestion: 'Replace vague words with precise terms. Instead of "about marketing," say "about content marketing strategies for B2B SaaS."' });
  }

  if (annotations.length === 0) {
    annotations.push({ text: 'Well-crafted prompt!', type: 'success', suggestion: 'Your prompt covers most best practices. Consider adding examples for even better results.' });
  }

  return annotations;
}

function generateRewrite(prompt: string): string {
  const lower = prompt.toLowerCase();
  const words = prompt.split(/\s+/);

  // Extract topic guess
  const topicWords = words.filter(w => w.length > 3 && !['write', 'create', 'make', 'about', 'that', 'this', 'with', 'from', 'have', 'will', 'would', 'could', 'should', 'please', 'help'].includes(w.toLowerCase()));
  const topic = topicWords.slice(0, 5).join(' ') || 'the requested topic';

  return `You are an expert professional with deep knowledge in ${topic}. Your task is to provide comprehensive, actionable, and well-structured content.

**Task:** ${prompt.charAt(0).toUpperCase() + prompt.slice(1)}${prompt.endsWith('.') ? '' : '.'}

**Requirements:**
- Structure your response with clear H2 headings and bullet points
- Include 3-5 specific, real-world examples
- Provide actionable takeaways the reader can implement immediately
- Length: 800-1,200 words

**Tone:** Professional but conversational. Write as if explaining to a knowledgeable peer.

**Constraints:**
- Avoid generic or surface-level advice
- Every point must include a concrete example or data point
- End with a clear summary of key takeaways

**Format:** Use markdown with headings, bold key terms, and numbered lists for sequential steps.`;
}

function generateModelMatches(score: number): ModelMatch[] {
  return [
    { model: 'GPT-4o', level: score > 50 ? 'excellent' : 'good', note: score > 50 ? 'Excellent match' : 'Add more structure for best results' },
    { model: 'Claude Opus/Sonnet', level: score > 50 ? 'excellent' : 'good', note: score > 50 ? 'Excellent match' : 'Claude benefits from explicit formatting' },
    { model: 'Gemini 2.5', level: score > 60 ? 'excellent' : 'good', note: score > 60 ? 'Excellent match' : 'Add more structure for Gemini' },
    { model: 'Llama 3', level: score > 70 ? 'excellent' : score > 40 ? 'good' : 'poor', note: score > 70 ? 'Good match' : 'Simplify constraints for open-source models' },
    { model: 'Midjourney', level: /image|visual|design|photo|illustration|draw|paint/i.test('') ? 'good' : 'poor', note: 'Text-generation prompt — not applicable for image models' },
  ];
}

export function analyzePrompt(prompt: string): AnalysisResult {
  const dimensions = [
    scoreClarity(prompt),
    scoreStructure(prompt),
    scoreSpecificity(prompt),
    scoreTokenEfficiency(prompt),
    scoreReasoning(prompt),
    scoreOutputControl(prompt),
    scoreEdgeCases(prompt),
    scoreReusability(prompt),
  ];

  const overallScore = Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length);
  const grade = getGrade(overallScore);
  const gap = 100 - overallScore;
  const verdict = `Your prompt is ${overallScore}% efficient. You're leaving ${gap}% of the AI's potential on the table.`;

  return {
    overallScore,
    grade,
    verdict,
    dimensions,
    annotations: generateAnnotations(prompt),
    rewrite: generateRewrite(prompt),
    modelMatches: generateModelMatches(overallScore),
  };
}
