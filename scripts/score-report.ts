// Scoring consistency report: scores each benchmark prompt RUNS times with the
// previous engine (legacy, as live before this change) and the current engine.
// Usage: npx vite-node scripts/score-report.ts > docs/scoring-consistency.md
import { BENCHMARK_PROMPTS } from '../src/test/benchmarkPrompts';
import { analyzePrompt } from '../src/lib/promptAnalyzer';
import { analyzePrompt as legacyAnalyze } from '../src/test/fixtures-legacyAnalyzer';

const RUNS = 3;

const rows: string[] = [];
const tierScores: Record<string, { legacy: number[]; current: number[] }> = {};
let unstable = 0;

for (const b of BENCHMARK_PROMPTS) {
  const legacy = Array.from({ length: RUNS }, () => legacyAnalyze(b.prompt).overallScore);
  const current = Array.from({ length: RUNS }, () => analyzePrompt(b.prompt));
  const scores = current.map((r) => r.overallScore);
  const stable = new Set(scores).size === 1 && new Set(legacy).size === 1;
  if (!stable) unstable++;
  (tierScores[b.tier] ??= { legacy: [], current: [] }).legacy.push(legacy[0]);
  tierScores[b.tier].current.push(scores[0]);
  const preview = b.prompt.replace(/\s+/g, ' ').slice(0, 60) + (b.prompt.length > 60 ? '…' : '');
  rows.push(
    `| ${b.id} | ${b.tier} | ${preview.replace(/\|/g, '\\|')} | ${legacy.join(' / ')} | ${scores.join(' / ')} | ${current[0].grade} | ${current[0].rewriteScore} | ${stable ? 'yes' : '**NO**'} |`,
  );
}

const avg = (a: number[]) => Math.round(a.reduce((s, x) => s + x, 0) / a.length);

console.log(`# PromptGrade scoring consistency (${RUNS} runs per prompt per engine)\n`);
console.log('| ID | Tier | Prompt | Old engine (live) | New engine | New grade | Rewrite score (measured) | Stable |');
console.log('|---|---|---|---|---|---|---|---|');
rows.forEach((r) => console.log(r));
console.log('\n| Tier | Old engine avg | New engine avg | Old range | New range |');
console.log('|---|---|---|---|---|');
for (const t of ['weak', 'medium', 'strong']) {
  const s = tierScores[t];
  console.log(
    `| ${t} | ${avg(s.legacy)} | ${avg(s.current)} | ${Math.min(...s.legacy)}–${Math.max(...s.legacy)} | ${Math.min(...s.current)}–${Math.max(...s.current)} |`,
  );
}
console.log(`\nUnstable prompts (different score on a repeat run): ${unstable}`);
