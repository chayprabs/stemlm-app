import { Fragment, useEffect, useRef } from 'react';
import type { Session, Step } from '@/src/protocol/types';
import type { ResolvedTheme } from '@/src/lib/theme';
import { MathMarkdown } from './MathMarkdown';
import { DiagramRenderer } from './DiagramRenderer';
import { StepWork } from './StepWork';
import { StepIndexMark } from './step-index';
import { shouldShowFormulaBlock } from '@/src/lib/step-display';
import { solutionDiagramRegexGlobal } from '@/src/protocol/parser';
import { CapsuleSignals, StudentAnswerNotes } from './CapsuleSignals';
import { FollowupBar } from './FollowupBar';
import { FollowupAnswerBody } from './FollowupCard';
import { SOLUTION_ANCHOR_ID, solutionFollowups } from '@/src/lib/step-entries';
import { buildSolutionFollowupSelection } from '@/src/lib/followup-selection';

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

  // Solution-tab follow-ups chain below the solution; scroll to the newest.
  const followups = solutionFollowups(session);
  const followupsEndRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(followups.length);
  useEffect(() => {
    if (followups.length > prevCount.current) {
      followupsEndRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    }
    prevCount.current = followups.length;
  }, [followups.length]);

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
      <StudentAnswerNotes capsule={session.capsule} />

      {followups.map((f, i) => (
        <section
          key={f.id}
          className="slm-solution-followup"
          aria-label={`Follow-up answer ${i + 1}`}
        >
          <header className="slm-card-head">
            <span className="slm-followup-card-kicker">
              Follow-up{followups.length > 1 ? ` ${i + 1}` : ''} · whole solution
            </span>
            <h2 className="slm-card-title">
              {f.question || f.capsule.meta.topic || 'Your question'}
            </h2>
          </header>
          <FollowupAnswerBody capsule={f.capsule} theme={theme} />
        </section>
      ))}
      <div ref={followupsEndRef} />

      <FollowupBar
        followup={buildSolutionFollowupSelection(session)}
        subject={session.capsule.meta.subject}
        stepTitle=""
        intent="ask-solution"
        anchor={{ sessionId: session.id, anchorStepId: SOLUTION_ANCHOR_ID }}
      />
    </div>
  );
}
