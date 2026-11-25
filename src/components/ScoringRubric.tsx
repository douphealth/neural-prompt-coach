import { GRADE_SCALE, RUBRIC } from '@/lib/promptAnalyzer';

// Rendered from the same RUBRIC object the scoring engine uses, so it cannot drift.
export default function ScoringRubric() {
  const grades = GRADE_SCALE.map((g, i) => {
    const max = i === 0 ? 100 : GRADE_SCALE[i - 1].min - 1;
    return `${g.grade} ${g.min}–${max}`;
  });

  return (
    <section id="how-scoring-works" className="max-w-4xl mx-auto py-12" aria-labelledby="how-scoring-works-title">
      <h2 id="how-scoring-works-title" className="text-2xl md:text-3xl font-display font-bold text-foreground text-center">
        How PromptGrade scores a prompt
      </h2>
      <div className="text-muted-foreground mt-3 max-w-2xl mx-auto text-sm space-y-2 text-center">
        <p>
          The score is a transparent checklist, not an AI judgement. Your prompt is checked in your browser against 8
          dimensions; nothing is sent to a server and no AI model is called. The same prompt always gets the same score.
        </p>
        <p>
          Each dimension starts at a base value and gains the points shown for each check it passes (capped at 100). The
          overall score is the average of the 8 dimensions. Not every prompt needs every check: a quick question can be a good
          prompt and still score low on reusability.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-8">
        {RUBRIC.map((d) => (
          <details key={d.key} className="glass-card rounded-xl p-4 group">
            <summary className="cursor-pointer select-none list-none flex items-start justify-between gap-3">
              <span>
                <span className="font-display font-semibold text-foreground">
                  {d.emoji} {d.label}
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">{d.what}</span>
              </span>
              <span className="text-xs font-mono text-primary shrink-0 mt-0.5 group-open:hidden">Show checks</span>
            </summary>
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              <li className="font-mono">Base: {d.base}</li>
              {d.checks.map((c) => (
                <li key={c.label} className="flex justify-between gap-3">
                  <span>{c.label}</span>
                  <span className="font-mono shrink-0">
                    {c.points > 0 ? '+' : ''}
                    {c.points}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-6">
        Grades: {grades.join(' · ')}. Suggested rewrites are scored with the same checklist. See also the{' '}
        <a href="https://efficientgptprompts.com/prompt-testing-methodology/" className="text-primary underline">
          EfficientGPTPrompts prompt testing methodology
        </a>
        .
      </p>
    </section>
  );
}
