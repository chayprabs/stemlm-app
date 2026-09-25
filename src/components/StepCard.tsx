import { motion, useReducedMotion } from 'framer-motion';
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

function learnerFacingFollowupHint(raw: string | undefined): string {
  const cleaned = raw ? stripProtocolMarkers(raw).trim() : '';
  const internalInstruction =
    /\b(?:mode\s*:\s*(?:patch|new|resolve|full)|op\s*=\s*(?:replace|insert|delete)|qid|step\s+id|figure\s+repair|(?:replace|insert|delete|repair)\s+(?:the\s+|this\s+|a\s+)?(?:diagram|figure|step|patch))\b/i;
  if (
    cleaned &&
    !/\b(?:q\d+\.)?s\d+\b/i.test(cleaned) &&
    !/@(?:meta|step|patch|diagram|end)\b/i.test(cleaned) &&
    !internalInstruction.test(cleaned)
  ) {
    return `Try: ${cleaned}`;
  }
  return 'Ask a question about this step; its work and formula will be added to chat.';
}

export function StepCard({
  session,
  index,
  theme,
}: {
  session: Session;
  index: number;
  theme: ResolvedTheme;
}) {
  const reducedMotion = useReducedMotion();
  const step = session.capsule.steps[index];
  if (!step) return null;

  // Every step carries its own Ask-in-chat: step-specific context goes into
  // the composer, the student types the question, and the answer comes back
  // anchored right after this step in the rail.
  const followupSelection = buildStepFollowupSelection(session, step);
  const suggested = learnerFacingFollowupHint(step.followup);
  // Answer-level flags open the answer; its checks and assumptions close it.
  // Printing either inside every step makes them read as that step's work.
  const isFirst = index === 0;
  const isLast = index === session.capsule.steps.length - 1;
  return (
    <motion.article
      key={step.id}
      className="slm-card"
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
    >
      <header className="slm-card-head">
        <h2 className="slm-card-title"><MathMarkdown content={step.title} inline /></h2>
      </header>
      {isFirst && <CapsuleSignals capsule={session.capsule} />}

      {shouldShowFormulaBlock(step) && step.formula && (
        <div className="slm-formula">
          <span className="slm-formula-label">Formula</span>
          <MathMarkdown content={step.formula} mathMode="display" />
        </div>
      )}

      <StepWork step={step} className="slm-step-work slm-card-body" />

      {step.diagram && (
        <DiagramRenderer diagram={step.diagram} theme={theme} section />
      )}

      {step.takeaway && (
        <div className="slm-takeaway slm-selectable">
          <span className="slm-takeaway-label">Takeaway</span>
          <MathMarkdown content={step.takeaway} />
        </div>
      )}

      {isLast && <StudentAnswerNotes capsule={session.capsule} />}

      {step.quickCheck && (
        <QuickCheck check={step.quickCheck} platform={session.platform} checkNumber={step.index} />
      )}

      <FollowupBar
        followup={followupSelection}
        subject={session.capsule.meta.subject}
        stepTitle={step.title}
        intent="ask"
        anchor={{ sessionId: session.id, anchorStepId: step.id }}
        hint={suggested}
      />
    </motion.article>
  );
}
