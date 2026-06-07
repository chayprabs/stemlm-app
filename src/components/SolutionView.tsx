import { Fragment } from 'react';
import type { Session, Step } from '@/src/protocol/types';
import type { ResolvedTheme } from '@/src/lib/theme';
import { MathMarkdown } from './MathMarkdown';
import { DiagramRenderer } from './DiagramRenderer';
import { StepWork } from './StepWork';
import { shouldShowFormulaBlock } from '@/src/lib/step-display';
import { solutionDiagramRegexGlobal } from '@/src/protocol/parser';
import { resolveSessionQuestion } from '@/src/lib/session-question';

function SolutionStep({
  step,
  theme,
}: {
  step: Step;
  theme: ResolvedTheme;
}) {
  const stepNo = String(step.index).padStart(2, '0');

  return (
    <article className="slm-solution-step">
      <header className="slm-solution-step-head">
        <span className="slm-step-badge">{stepNo}</span>
        <h3 className="slm-solution-step-title">{step.title}</h3>
      </header>

      {shouldShowFormulaBlock(step) && step.formula && (
        <div className="slm-formula">
          <span className="slm-formula-label">Formula</span>
          <MathMarkdown content={step.formula} mathMode="display" />
        </div>
      )}

      <StepWork step={step} className="slm-step-work slm-solution-step-body" />

      {step.diagram && (
        <div className="slm-step-diagram">
          <span className="slm-step-diagram-label">Diagram</span>
          <DiagramRenderer diagram={step.diagram} theme={theme} />
        </div>
      )}

      {step.takeaway && (
        <div className="slm-takeaway slm-selectable">
          <span className="slm-takeaway-label">Takeaway</span>
          <MathMarkdown content={step.takeaway} />
        </div>
      )}
    </article>
  );
}

/**
 * Complete study answer: question, every step (with diagrams), then the
 * condensed @solution narrative. Matches the richness of the PDF export.
 */
export function SolutionView({ session, theme }: { session: Session; theme: ResolvedTheme }) {
  const { steps, solution, solutionDiagrams, meta } = session.capsule;
  const question = resolveSessionQuestion(session);
  const solutionParts = solution.split(solutionDiagramRegexGlobal());
  const hasSteps = steps.length > 0;
  const hasSolutionText = solution.trim().length > 0;

  return (
    <div className="slm-solution">
      {question && (
        <section className="slm-solution-q slm-selectable">
          <span className="slm-solution-section-label">Question</span>
          <MathMarkdown content={question} className="slm-solution-q-text" />
        </section>
      )}

      {hasSteps && (
        <section className="slm-solution-steps" aria-label="Step-by-step solution">
          <h2 className="slm-solution-section-title">Step-by-step</h2>
          {steps.map((step) => (
            <SolutionStep key={step.id} step={step} theme={theme} />
          ))}
        </section>
      )}

      {hasSolutionText && (
        <section className="slm-solution-full slm-selectable" aria-label="Full solution summary">
          <h2 className="slm-solution-section-title">Full solution</h2>
          <div className="slm-solution-full-body">
            {solutionParts.map((part, i) => {
              if (i % 2 === 1) {
                const idx = Number(part);
                if (!Number.isFinite(idx)) return <Fragment key={`d-${i}`} />;
                const diagram = solutionDiagrams[idx];
                return diagram ? (
                  <div key={`d-${i}`} className="slm-step-diagram">
                    <span className="slm-step-diagram-label">Diagram</span>
                    <DiagramRenderer diagram={diagram} theme={theme} size="solution" />
                  </div>
                ) : null;
              }
              return part.trim() ? (
                <MathMarkdown key={`t-${i}`} content={part} />
              ) : (
                <Fragment key={`t-${i}`} />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
