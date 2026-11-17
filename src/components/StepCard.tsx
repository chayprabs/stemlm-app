import { motion, useReducedMotion } from 'framer-motion';
import type { Session } from '@/src/protocol/types';
import type { ResolvedTheme } from '@/src/lib/theme';
import { MathMarkdown } from './MathMarkdown';
import { DiagramRenderer } from './DiagramRenderer';
import { QuickCheck } from './QuickCheck';
import { FollowupBar } from './FollowupBar';
import { StepWork } from './StepWork';
import { FormulaBlock } from './FormulaBlock';
import { buildStepFollowupSelection } from '@/src/lib/followup-selection';
import { stripProtocolMarkers } from '@/src/protocol/strip-markers';
import { CapsuleSignals, StudentAnswerNotes } from './CapsuleSignals';
import { AnswerBlock } from './AnswerBlock';
import { OriginNote } from './OriginNote';
import { IconTherefore } from './icons';
import { stepMotion, type StepDirection } from './step-motion';

/** The follow-up question the answer suggests for a step, when it is one a student could ask as written. */
function suggestedQuestion(raw: string | undefined): string | undefined {
  const cleaned = raw ? stripProtocolMarkers(raw).trim() : '';
  const internalInstruction =
    /\b(?:mode\s*:\s*(?:patch|new|resolve|full)|op\s*=\s*(?:replace|insert|delete)|qid|step\s+id|figure\s+repair|(?:replace|insert|delete|repair)\s+(?:the\s+|this\s+|a\s+)?(?:diagram|figure|step|patch))\b/i;
  const askable =
    cleaned &&
    !/\b(?:q\d+\.)?s\d+\b/i.test(cleaned) &&
    !/@(?:meta|step|patch|diagram|end)\b/i.test(cleaned) &&
    !internalInstruction.test(cleaned);
  return askable ? cleaned : undefined;
}

export function StepCard({
  session,
  index,
  theme,
  direction = 1,
}: {
  session: Session;
  index: number;
  theme: ResolvedTheme;
  /** Which way the reader is travelling, so the page arrives from that side. */
  direction?: StepDirection;
}) {
  const reducedMotion = useReducedMotion();
  const step = session.capsule.steps[index];
  if (!step) return null;

  // Every step carries its own Ask-in-chat: step-specific context goes into
  // the composer, the student types the question (or takes the one the answer
  // suggests), and the answer comes back anchored right after this step in the rail.
  const followupSelection = buildStepFollowupSelection(session, step);
  // Answer-level flags open the answer; its checks and assumptions close it.
  // Printing either inside every step makes them read as that step's work.
  const total = session.capsule.steps.length;
  const isFirst = index === 0;
  const isLast = index === total - 1;
  return (
    <motion.article
      key={step.id}
      className="slm-card"
      {...stepMotion(Boolean(reducedMotion), direction)}
    >
      <header className="slm-card-head">
        <p className="slm-card-kicker">
          <span className="slm-card-kicker-step">Step {index + 1}</span>
          <span className="slm-card-kicker-of">of {total}</span>
        </p>
        <h2 className="slm-card-title"><MathMarkdown content={step.title} inline /></h2>
      </header>
      {isFirst && <CapsuleSignals capsule={session.capsule} />}

      <FormulaBlock step={step} />

      <StepWork step={step} className="slm-step-work slm-card-body" />

      {step.diagram && (
        <DiagramRenderer diagram={step.diagram} theme={theme} section />
      )}

      {step.takeaway && (
        <div className="slm-takeaway slm-selectable">
          <span className="slm-takeaway-label"><IconTherefore width={12} height={12} />Takeaway</span>
          <MathMarkdown content={step.takeaway} />
        </div>
      )}

      {step.quickCheck && (
        <QuickCheck check={step.quickCheck} platform={session.platform} checkNumber={step.index} />
      )}

      {isLast && <AnswerBlock capsule={session.capsule} theme={theme} />}
      {isLast && <StudentAnswerNotes capsule={session.capsule} />}
      {isLast && <OriginNote session={session} variant="detail" />}

      <FollowupBar
        followup={followupSelection}
        subject={session.capsule.meta.subject}
        stepTitle={step.title}
        intent="ask"
        anchor={{ sessionId: session.id, anchorStepId: step.id }}
        hint="Ask about this step: its working and formula go into the chat box with your question."
        suggestion={suggestedQuestion(step.followup)}
      />
    </motion.article>
  );
}
