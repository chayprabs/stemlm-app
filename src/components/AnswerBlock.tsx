import { Fragment } from 'react';
import type { Capsule } from '@/src/protocol/types';
import type { ResolvedTheme } from '@/src/lib/theme';
import { solutionDiagramRegexGlobal } from '@/src/protocol/parser';
import { MathMarkdown } from './MathMarkdown';
import { DiagramRenderer } from './DiagramRenderer';
import { IconTherefore } from './icons';

/**
 * The conclusion of the answer: the model's own closing synthesis, set apart so the result can be
 * found without rereading the working. Shown under the last step and at the top of the Solution
 * view. Figures embedded in the synthesis are drawn only where `figures` asks for them, so the
 * same figure never appears twice on one page.
 */
export function AnswerBlock({
  capsule,
  theme,
  figures = false,
}: {
  capsule: Capsule;
  theme: ResolvedTheme;
  figures?: boolean;
}) {
  const text = capsule.solution.trim();
  if (!text) return null;
  const parts = capsule.solution.split(solutionDiagramRegexGlobal());
  const hasProse = parts.some((part, i) => i % 2 === 0 && part.trim());
  if (!hasProse && !figures) return null;

  return (
    <section className="slm-answer slm-selectable" aria-label="Answer">
      <header className="slm-answer-head">
        <IconTherefore className="slm-answer-mark" width={14} height={14} />
        <span className="slm-answer-label">Answer</span>
      </header>
      <div className="slm-answer-body">
        {parts.map((part, i) => {
          if (i % 2 === 1) {
            const diagram = figures ? capsule.solutionDiagrams[Number(part)] : undefined;
            return diagram
              ? <DiagramRenderer key={`d-${i}`} diagram={diagram} theme={theme} size="solution" section />
              : <Fragment key={`d-${i}`} />;
          }
          return part.trim() ? <MathMarkdown key={`t-${i}`} content={part} /> : <Fragment key={`t-${i}`} />;
        })}
      </div>
    </section>
  );
}
