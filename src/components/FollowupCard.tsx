import { motion } from 'framer-motion';
import type { Capsule, Session, StepFollowup } from '@/src/protocol/types';
import type { ResolvedTheme } from '@/src/lib/theme';
import { MathMarkdown } from './MathMarkdown';
import { DiagramRenderer } from './DiagramRenderer';
import { StepWork } from './StepWork';
import { FollowupBar } from './FollowupBar';
import { shouldShowFormulaBlock } from '@/src/lib/step-display';
import { buildFollowupChainSelection } from '@/src/lib/followup-selection';
import { cleanSessionQuestion } from '@/src/lib/session-question';

/** Body of an Ask-in-chat answer capsule — shared by step and solution views. */
export function FollowupAnswerBody({ capsule, theme }: { capsule: Capsule; theme: ResolvedTheme }) {
  return (
    <>
      {capsule.steps.map((step) => (
        <section key={step.id} className="slm-followup-answer-block">
          {capsule.steps.length > 1 && (
            <h3 className="slm-followup-answer-title">{step.title}</h3>
          )}
          {shouldShowFormulaBlock(step) && step.formula && (
            <div className="slm-formula">
              <span className="slm-formula-label">Formula</span>
              <MathMarkdown content={step.formula} mathMode="display" />
            </div>
          )}
          <StepWork step={step} className="slm-step-work slm-card-body" />
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
        </section>
      ))}

      {capsule.solution && (
        <div className="slm-followup-answer-summary slm-selectable">
          <span className="slm-takeaway-label">Answer</span>
          <MathMarkdown content={capsule.solution} />
        </div>
      )}
    </>
  );
}

/**
 * Inline Ask-in-chat answer, rendered in the same step window as a chained
 * entry after its anchor step. Has its own Ask-in-chat so repeat questions
 * keep chaining after this one — never a new panel or session.
 */
export function FollowupCard({
  session,
  followup,
  anchorStepNumber,
  ordinal,
  theme,
}: {
  session: Session;
  followup: StepFollowup;
  anchorStepNumber: number;
  ordinal: number;
  theme: ResolvedTheme;
}) {
  const anchorStep = session.capsule.steps.find((s) => s.id === followup.anchorStepId);
  const problem =
    cleanSessionQuestion(session.question) ||
    session.capsule.meta.question?.trim() ||
    session.capsule.meta.topic;

  const chainSelection = buildFollowupChainSelection({
    problem,
    anchorStepTitle: anchorStep?.title,
    previousQuestion: followup.question,
    previousAnswer: followup.capsule.solution || followup.capsule.steps[0]?.body,
  });

  return (
    <motion.article
      key={followup.id}
      className="slm-card slm-card--followup"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
    >
      <header className="slm-card-head">
        <span className="slm-followup-card-kicker">
          Follow-up {ordinal > 1 ? `${ordinal} ` : ''}· after step {anchorStepNumber}
        </span>
        <h2 className="slm-card-title">
          {followup.question || followup.capsule.meta.topic || 'Your question'}
        </h2>
      </header>

      <FollowupAnswerBody capsule={followup.capsule} theme={theme} />

      <FollowupBar
        followup={chainSelection}
        subject={session.capsule.meta.subject}
        stepTitle={anchorStep?.title ?? `Step ${anchorStepNumber}`}
        intent="ask"
        anchor={{ sessionId: session.id, anchorStepId: followup.anchorStepId }}
      />
    </motion.article>
  );
}
