import { useState } from 'react';
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
import { RepairFigureButton, type FigureRepairFailure } from './RepairFigureButton';
import type { DiagramCompileFailure } from './DiagramRenderer';
import { auditCapsuleDiagrams, diagramQualityMessage } from '@/src/protocol/diagram-quality';

export function StepCard({
  session,
  index,
  theme,
}: {
  session: Session;
  index: number;
  theme: ResolvedTheme;
}) {
  const [compileFailure, setCompileFailure] = useState<DiagramCompileFailure | null>(null);
  const step = session.capsule.steps[index];
  if (!step) return null;

  // Every step carries its own Ask-in-chat: step-specific context goes into
  // the composer, the student types the question, and the answer comes back
  // anchored right after this step in the rail.
  const followupSelection = buildStepFollowupSelection(session, step);
  const suggested = step.followup ? stripProtocolMarkers(step.followup) : undefined;
  const qualityCode = index === 0 ? auditCapsuleDiagrams(session.capsule)[0] : undefined;
  const qualityDiagram = session.capsule.steps
    .map((candidate) => candidate.diagram)
    .find((diagram): diagram is NonNullable<typeof diagram> => Boolean(diagram));
  const qualityFailure: FigureRepairFailure | null = qualityCode
    ? {
        family: qualityDiagram?.type ?? step.diagram?.type ?? 'figure',
        failingKeys: qualityDiagram
          ? [...new Set(qualityDiagram.content.split('\n').map((line) => /^\s*([A-Za-z][A-Za-z0-9_.-]*)\s*:/.exec(line)?.[1]?.toLowerCase()).filter((key): key is string => Boolean(key)))]
          : [],
        code: qualityCode,
        reason: diagramQualityMessage(qualityCode, session.capsule),
      }
    : null;
  const repairFailure: FigureRepairFailure | null = compileFailure ?? qualityFailure;
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
          <DiagramRenderer diagram={step.diagram} theme={theme} onCompileFailure={setCompileFailure} />
          {repairFailure && <RepairFigureButton session={session} stepId={step.id} failure={repairFailure} />}
        </div>
      )}

      {!step.diagram && repairFailure && (
        <RepairFigureButton session={session} stepId={step.id} failure={repairFailure} />
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
