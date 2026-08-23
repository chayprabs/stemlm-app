import { Fragment } from 'react';
import type { Session, Step } from '@/src/protocol/types';
import type { ResolvedTheme } from '@/src/lib/theme';
import { MathMarkdown } from './MathMarkdown';
import { DiagramRenderer } from './DiagramRenderer';
import { StepWork } from './StepWork';
import { StepIndexMark } from './step-index';
import { shouldShowFormulaBlock } from '@/src/lib/step-display';
import { solutionDiagramRegexGlobal } from '@/src/protocol/parser';
import { CapsuleSignals } from './CapsuleSignals';

function SolutionStep({
  step,
  index,
  theme,
}: {
  step: Step;
  index: number;
  theme: ResolvedTheme;
}) {
  return (
    <article className="slm-solution-step">
      <header className="slm-solution-step-head">
        <StepIndexMark n={index + 1} />
        <span className="slm-step-id">{step.id}</span>
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
 * Complete study answer: stacked steps (with diagrams). The @solution
 * narrative is omitted when steps exist — this tab is the full solution.
 */
export function SolutionView({ session, theme }: { session: Session; theme: ResolvedTheme }) {
  const { steps, solution, solutionDiagrams } = session.capsule;
  const solutionParts = solution.split(solutionDiagramRegexGlobal());
  const hasSteps = steps.length > 0;
  const hasSolutionText = solution.trim().length > 0;

  return (
    <div className="slm-solution">
      <CapsuleSignals capsule={session.capsule} />
      {hasSteps && (
        <section className="slm-solution-steps" aria-label="Solution steps">
          {steps.map((step, i) => (
            <SolutionStep key={step.id} step={step} index={i} theme={theme} />
          ))}
        </section>
      )}

      {!hasSteps && hasSolutionText && (
        <section className="slm-solution-full slm-selectable" aria-label="Solution">
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
