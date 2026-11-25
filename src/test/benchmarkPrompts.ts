// 15 benchmark prompts used to check that PromptGrade scores are stable and sensible.
// Tiers are a human judgement of prompt quality, written before tuning the scorer.
export type Tier = 'weak' | 'medium' | 'strong';

export interface BenchmarkPrompt {
  id: string;
  tier: Tier;
  prompt: string;
}

export const BENCHMARK_PROMPTS: BenchmarkPrompt[] = [
  // Weak: no role, no context, no format, no constraints.
  { id: 'W1', tier: 'weak', prompt: 'write a blog post about marketing' },
  { id: 'W2', tier: 'weak', prompt: 'help with my code' },
  { id: 'W3', tier: 'weak', prompt: 'Tell me something interesting about history.' },
  { id: 'W4', tier: 'weak', prompt: 'summarize this' },
  { id: 'W5', tier: 'weak', prompt: 'Give me some good ideas for a business. Make it nice.' },

  // Medium: a clear task with one or two of format, audience, length or constraints.
  {
    id: 'M1',
    tier: 'medium',
    prompt:
      'Write a 500-word blog post about email marketing for small bakeries. Use a friendly tone and include 3 examples of subject lines.',
  },
  {
    id: 'M2',
    tier: 'medium',
    prompt: 'You are a running coach. Create a 4-week beginner running plan with 3 sessions per week, as a table.',
  },
  {
    id: 'M3',
    tier: 'medium',
    prompt: 'Explain how HTTPS works to a non-technical manager in 5 bullet points. Avoid jargon.',
  },
  {
    id: 'M4',
    tier: 'medium',
    prompt: 'Review this Python function for bugs and suggest fixes with corrected code:\n[PASTE CODE]',
  },
  {
    id: 'M5',
    tier: 'medium',
    prompt:
      'Summarize the attached quarterly report into a one-page executive summary. List the 3 key numbers and the top risks.',
  },

  // Strong: role, context, task, output format, length, constraints and edge cases.
  {
    id: 'S1',
    tier: 'strong',
    prompt: `You are a senior B2B SaaS copywriter.

Context: we sell [PRODUCT], an invoicing tool for agencies with 5-50 staff. The reader is an agency operations lead who has never heard of us.

Task: write a cold email that earns a reply.

Format:
1. Subject line (under 8 words)
2. Email body of 90-120 words in plain text
3. One-sentence call to action asking for a 15-minute call

Tone: direct, friendly, no hype.

Constraints:
- Do not use the words "revolutionary" or "game-changer".
- Do not invent customer names, statistics or testimonials.
- If you need a fact you don't have, write [ASK] instead of guessing.`,
  },
  {
    id: 'S2',
    tier: 'strong',
    prompt: `You are a senior software engineer doing a code review.

Analyze the code below for:
1. Bugs and logic errors, including edge cases such as empty input and null values
2. Security issues (injection, auth, secrets in code)
3. Performance problems
4. Readability

For each issue, give the severity (critical, warning or info), the line reference, why it matters, and a corrected code example.
Think step by step before you answer, and do not flag style preferences as bugs.
End with the top 3 fixes as a numbered list.

Code:
\`\`\`
[PASTE CODE HERE]
\`\`\``,
  },
  {
    id: 'S3',
    tier: 'strong',
    prompt: `Act as a market research analyst.

Goal: compare 3 project-management tools ([TOOL_A], [TOOL_B], [TOOL_C]) for a 10-person design studio.

Steps:
1. First, list the criteria that matter for a small studio (price per seat, client sharing, time tracking).
2. Then evaluate each tool against every criterion and explain your reasoning.
3. Finally, recommend one tool and say who should choose a different one.

Output format: a markdown table followed by a recommendation of at most 150 words.
Constraints: only use information you are confident about; if pricing may be out of date, say so explicitly. Never make up features.`,
  },
  {
    id: 'S4',
    tier: 'strong',
    prompt: `You are a customer support agent for an online furniture store.

Write a reply to the customer message below.
- Tone: warm, professional, concise (under 150 words).
- Structure: acknowledge the problem, give the next step, give a timeline.
- If the order is more than 30 days old, explain the repair option instead of a refund.
- If the customer mentions an injury, do not discuss liability; escalate to a manager and say so.
- Never promise a delivery date you cannot confirm.

Customer message:
"""
[CUSTOMER MESSAGE]
"""`,
  },
  {
    id: 'S5',
    tier: 'strong',
    prompt: `You are an experienced secondary-school science teacher.

Create a 45-minute lesson plan on {TOPIC} for students aged 13-14.

Include, in this order:
1. Learning objectives (exactly 3, measurable)
2. A 5-minute starter activity
3. Main activity with step-by-step instructions
4. A differentiation note for students who finish early and for students who struggle
5. A 3-question exit quiz with answers

Format the plan as markdown with headings. Use simple language. Avoid activities that need special equipment unless you list a no-equipment alternative.`,
  },
];
