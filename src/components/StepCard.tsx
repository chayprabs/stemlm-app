import { motion } from 'framer-motion';
import type { Session } from '@/src/protocol/types';
import type { ResolvedTheme } from '@/src/lib/theme';
import { MathMarkdown } from './MathMarkdown';
import { DiagramRenderer } from './DiagramRenderer';
import { QuickCheck } from './QuickCheck';
import { FollowupBar } from './FollowupBar';
import { shouldShowFormulaBlock } from '@/src/lib/step-display';
import { StepWork } from './StepWork';
import { buildStepFollowupSelection } from '@/src/lib/followup-selection';
import { stripProtocolMarkers } from '@/src/protocol/strip-markers';
import { CapsuleSignals, StudentAnswerNotes } from './CapsuleSignals';

export function StepCard({
  session,
  index,
  theme,
}: {
  session: Session;
  index: number;
  theme: ResolvedTheme;
}) {
  const step = session.capsule.steps[index];
  if (!step) return null;

  // Every step carries its own Ask-in-chat: step-specific context goes into
  // the composer, the student types the question, and the answer comes back
  // anchored right after this step in the rail.
  const followupSelection = buildStepFollowupSelection(session, step);
  const suggested = step.followup ? stripProtocolMarkers(step.followup) : undefined;
  return (
    <motion.article
      key={step.id}
      className="slm-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
    >
      <header className="slm-card-head">
        <h2 className="slm-card-title">{step.title}</h2>
      </header>
      <CapsuleSignals capsule={session.capsule} />

      {shouldShowFormulaBlock(step) && step.formula && (
        <div className="slm-formula">
          <span className="slm-formula-label">Formula</span>
          <MathMarkdown content={step.formula} mathMode="display" />
        </div>
      )}

      <StepWork step={step} className="slm-step-work slm-card-body" />
      <StudentAnswerNotes capsule={session.capsule} />

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

      {step.quickCheck && (
        <QuickCheck check={step.quickCheck} platform={session.platform} checkNumber={step.index} />
      )}

      <FollowupBar
        followup={followupSelection}
        subject={session.capsule.meta.subject}
        stepTitle={step.title}
        intent="ask"
        anchor={{ sessionId: session.id, anchorStepId: step.id }}
        hint={suggested ? `Try: ${suggested}` : undefined}
      />
    </motion.article>
  );
}
