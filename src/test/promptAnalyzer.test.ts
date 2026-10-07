import { describe, expect, it } from "vitest";
import { analyzePrompt } from "@/lib/promptAnalyzer";

describe("prompt analyzer", () => {
  it("returns deterministic bounded scores and all eight dimensions", () => {
    const result = analyzePrompt(
      "You are a senior SEO strategist. Audit this landing page and return 5 prioritized fixes in a markdown table. Include impact, effort, evidence, and avoid generic advice."
    );

    expect(result.dimensions).toHaveLength(8);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.grade).toMatch(/^(A\+|A|A-|B\+|B|B-|C\+|C|C-|D\+|D|D-|F)$/);
    expect(result.rewrite.length).toBeGreaterThan(100);
    expect(result.modelRewrites).toHaveLength(4);
    expect(result.modelMatches.length).toBeGreaterThanOrEqual(4);
  });

  it("scores a structured prompt better than a vague prompt", () => {
    const vague = analyzePrompt("write something about marketing");
    const structured = analyzePrompt(
      "You are a senior B2B SaaS marketing strategist. Create a 900-word conversion-focused article for CFOs comparing 3 attribution models. Use H2 headings, a decision table, 3 examples, and a concise recommendation. Do not use generic advice."
    );

    expect(structured.overallScore).toBeGreaterThan(vague.overallScore);
  });
});
