import { describe, expect, it } from 'vitest';
import { analyzePrompt, RUBRIC, scorePrompt, GRADE_SCALE, getGrade } from '@/lib/promptAnalyzer';
import { BENCHMARK_PROMPTS } from './benchmarkPrompts';

const byTier = (tier: string) => BENCHMARK_PROMPTS.filter((b) => b.tier === tier).map((b) => scorePrompt(b.prompt).overallScore);

describe('scoring engine', () => {
  it('gives the same score for the same prompt every time', () => {
    for (const b of BENCHMARK_PROMPTS) {
      const runs = Array.from({ length: 5 }, () => JSON.stringify(analyzePrompt(b.prompt)));
      expect(new Set(runs).size).toBe(1);
    }
  });

  it('ignores leading and trailing whitespace', () => {
    expect(scorePrompt('  summarize this \n').overallScore).toBe(scorePrompt('summarize this').overallScore);
  });

  it('orders the benchmark tiers: every weak < every medium < every strong', () => {
    const weak = byTier('weak');
    const medium = byTier('medium');
    const strong = byTier('strong');
    expect(Math.max(...weak)).toBeLessThan(Math.min(...medium));
    expect(Math.max(...medium)).toBeLessThan(Math.min(...strong));
  });

  it('matches whole words only ("if" must not match "specific")', () => {
    const r = scorePrompt('Be specific and different in every paragraph you write for the reader today please.');
    const edge = r.dimensions.find((d) => d.key === 'edgeCases')!;
    expect(edge.checks!.find((c) => c.label.startsWith('Handles conditions'))!.passed).toBe(false);
  });

  it('does not treat "as a table" as a role', () => {
    const r = scorePrompt('List the planets as a table with their distance from the sun in kilometres.');
    const structure = r.dimensions.find((d) => d.key === 'structure')!;
    expect(structure.checks!.find((c) => c.label === 'Assigns a role')!.passed).toBe(false);
  });

  it('computes each dimension as base + passed checks, capped 0-100', () => {
    for (const b of BENCHMARK_PROMPTS) {
      for (const d of scorePrompt(b.prompt).dimensions) {
        const def = RUBRIC.find((x) => x.key === d.key)!;
        const raw = def.base + d.checks!.filter((c) => c.passed).reduce((s, c) => s + c.points, 0);
        expect(d.score).toBe(Math.max(0, Math.min(100, raw)));
      }
    }
  });

  it('reports a measured rewrite score, not an estimate', () => {
    for (const b of BENCHMARK_PROMPTS) {
      const r = analyzePrompt(b.prompt);
      expect(r.rewriteScore).toBe(scorePrompt(r.rewrite).overallScore);
    }
  });

  it('scores an empty prompt as 0', () => {
    expect(scorePrompt('   ').overallScore).toBe(0);
  });

  it('uses the documented grade scale', () => {
    expect(GRADE_SCALE[GRADE_SCALE.length - 1]).toEqual({ min: 0, grade: 'F' });
    expect(getGrade(100)).toBe('A+');
    expect(getGrade(39)).toBe('F');
    expect(getGrade(40)).toBe('D-');
  });

  it('does not make claims about AI potential in the verdict', () => {
    for (const b of BENCHMARK_PROMPTS) {
      expect(analyzePrompt(b.prompt).verdict).not.toMatch(/potential|efficient\./i);
    }
  });
});
