import { Fragment, useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { Session, Step } from '@/src/protocol/types';
import type { ResolvedTheme } from '@/src/lib/theme';
import { MathMarkdown } from './MathMarkdown';
import { DiagramRenderer } from './DiagramRenderer';
import { StepWork } from './StepWork';
import { FormulaBlock } from './FormulaBlock';
import { StepIndexMark } from './step-index';
import { solutionDiagramRegexGlobal } from '@/src/protocol/parser';
import { CapsuleSignals, StudentAnswerNotes } from './CapsuleSignals';
import { OriginNote } from './OriginNote';
import { FollowupBar } from './FollowupBar';
import { FollowupAnswerBody } from './FollowupCard';
import { SOLUTION_ANCHOR_ID, solutionFollowups } from '@/src/lib/step-entries';
import { buildSolutionFollowupSelection } from '@/src/lib/followup-selection';
import { AnswerBlock } from './AnswerBlock';
import { IconTherefore } from './icons';

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
        <h3 className="slm-solution-step-title"><MathMarkdown content={step.title} inline /></h3>
      </header>

      <FormulaBlock step={step} />

      <StepWork step={step} className="slm-step-work slm-solution-step-body" />

      {step.diagram && (
        <DiagramRenderer diagram={step.diagram} theme={theme} section />
      )}

      {step.takeaway && (
        <div className="slm-takeaway slm-selectable">
          <span className="slm-takeaway-label"><IconTherefore width={12} height={12} />Takeaway</span>
          <MathMarkdown content={step.takeaway} />
        </div>
      )}
    </article>
  );
}

/**
 * The whole answer as one document: the conclusion first, then every step in order with its
 * figures. An answer that has no steps is its solution text alone.
 */
export function SolutionView({ session, theme }: { session: Session; theme: ResolvedTheme }) {
  const { steps, solution, solutionDiagrams } = session.capsule;
  const solutionParts = solution.split(solutionDiagramRegexGlobal());
  const hasSteps = steps.length > 0;
  const hasSolutionText = solution.trim().length > 0;

  // Solution-tab follow-ups chain below the solution; scroll to the newest.
  const followups = solutionFollowups(session);
  const reducedMotion = useReducedMotion();
  const followupsEndRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(followups.length);
  useEffect(() => {
    if (followups.length > prevCount.current) {
      followupsEndRef.current?.scrollIntoView({ block: 'end', behavior: reducedMotion ? 'auto' : 'smooth' });
    }
    prevCount.current = followups.length;
  }, [followups.length, reducedMotion]);

  return (
    <div className="slm-solution">
      <CapsuleSignals capsule={session.capsule} />
      {hasSteps && <AnswerBlock capsule={session.capsule} theme={theme} figures />}
      {hasSteps && (
        <section className="slm-solution-steps" aria-label="Solution steps">
          {steps.map((step, i) => (
            <SolutionStep
              key={step.id}
              step={step}
              index={i}
              theme={theme}
            />
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
                  <DiagramRenderer key={`d-${i}`} diagram={diagram} theme={theme} size="solution" section />
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
      <OriginNote session={session} variant="detail" />

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
              <MathMarkdown content={f.question || f.capsule.meta.topic || 'Your question'} inline promote={false} />
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
