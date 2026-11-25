# PromptGrade scoring consistency (3 runs per prompt per engine)

| ID | Tier | Prompt | Old engine (live) | New engine | New grade | Rewrite score (measured) | Stable |
|---|---|---|---|---|---|---|---|
| W1 | weak | write a blog post about marketing | 29 / 29 / 29 | 20 / 20 / 20 | F | 85 | yes |
| W2 | weak | help with my code | 29 / 29 / 29 | 20 / 20 / 20 | F | 85 | yes |
| W3 | weak | Tell me something interesting about history. | 29 / 29 / 29 | 20 / 20 / 20 | F | 84 | yes |
| W4 | weak | summarize this | 29 / 29 / 29 | 20 / 20 / 20 | F | 85 | yes |
| W5 | weak | Give me some good ideas for a business. Make it nice. | 35 / 35 / 35 | 28 / 28 / 28 | F | 84 | yes |
| M1 | medium | Write a 500-word blog post about email marketing for small b… | 45 / 45 / 45 | 51 / 51 / 51 | D+ | 85 | yes |
| M2 | medium | You are a running coach. Create a 4-week beginner running pl… | 46 / 46 / 46 | 47 / 47 / 47 | D | 85 | yes |
| M3 | medium | Explain how HTTPS works to a non-technical manager in 5 bull… | 45 / 45 / 45 | 49 / 49 / 49 | D | 85 | yes |
| M4 | medium | Review this Python function for bugs and suggest fixes with … | 41 / 41 / 41 | 38 / 38 / 38 | F | 88 | yes |
| M5 | medium | Summarize the attached quarterly report into a one-page exec… | 42 / 42 / 42 | 45 / 45 / 45 | D | 85 | yes |
| S1 | strong | You are a senior B2B SaaS copywriter. Context: we sell [PROD… | 83 / 83 / 83 | 85 / 85 / 85 | A- | 90 | yes |
| S2 | strong | You are a senior software engineer doing a code review. Anal… | 83 / 83 / 83 | 84 / 84 / 84 | B+ | 96 | yes |
| S3 | strong | Act as a market research analyst. Goal: compare 3 project-ma… | 84 / 84 / 84 | 90 / 90 / 90 | A | 94 | yes |
| S4 | strong | You are a customer support agent for an online furniture sto… | 78 / 78 / 78 | 81 / 81 / 81 | B+ | 92 | yes |
| S5 | strong | You are an experienced secondary-school science teacher. Cre… | 75 / 75 / 75 | 83 / 83 / 83 | B+ | 89 | yes |

| Tier | Old engine avg | New engine avg | Old range | New range |
|---|---|---|---|---|
| weak | 30 | 22 | 29–35 | 20–28 |
| medium | 44 | 46 | 41–46 | 38–51 |
| strong | 81 | 85 | 75–84 | 81–90 |

Unstable prompts (different score on a repeat run): 0

## How this was produced

- `npx vite-node scripts/score-report.ts` scores each of the 15 prompts in `src/test/benchmarkPrompts.ts` three times with the old engine (`src/test/fixtures-legacyAnalyzer.ts`, a frozen copy of the engine live before this change) and three times with the new one (`src/lib/promptAnalyzer.ts`).
- Live cross-check on 2026-11-25 (https://promptgrade.efficientgptprompts.com, in a browser): W1 scored 29, M3 scored 45, and S1 scored 83 twice. These match the "Old engine (live)" column.
- "Rewrite score (measured)" is the new engine's score of the generic rewrite. The old UI showed `original + 32` (capped at 96) instead of measuring it.
- `src/test/scoring.test.ts` enforces determinism, the tier ordering (every weak < every medium < every strong) and that the rewrite score is measured.

## What changed in the scoring and why

| Problem in the old engine | Fix |
|---|---|
| Substring keyword matching: "if" matched "specific", "as a" matched "has a" and "as a table", "list" matched "specialist" | Whole-word / whole-phrase matching; role detection uses explicit patterns ("You are a…", "Act as…") |
| The rewrite score was invented (`original + 32`) | Every rewrite is scored with the same checklist |
| Verdict "You're leaving X% of the AI's potential on the table" (no basis) | "Scored X/100 on PromptGrade's 8-part checklist. Biggest gaps: A and B." |
| Very short prompts got credit for "readable sentences" and "token efficiency" | Those checks need at least 8–10 words; under 10 words is a −25 penalty in Token Efficiency |
| "for a business" counted as naming an audience | Audience needs an explicit cue (audience, readers, customers, managers, "for small…", etc.) |
| Image-model match ignored the prompt (`test('')`) | It checks the prompt for image terms |
| Template library showed hand-entered "PES™ 90+" scores | Templates are scored with the engine at runtime |
| The rubric was not shown anywhere | "How PromptGrade scores a prompt" section and per-dimension "Why this score" lists, both generated from the engine's `RUBRIC` |
