import { motion } from 'framer-motion';
import type { Session } from '@/src/protocol/types';
import type { ResolvedTheme } from '@/src/lib/theme';
import { MathMarkdown } from './MathMarkdown';
import { DiagramRenderer } from './DiagramRenderer';
import { QuickCheck } from './QuickCheck';
import { FollowupBar } from './FollowupBar';
import { StepWork } from './StepWork';
import { IconCheck } from './icons';
import { buildLastStepFollowupSelection } from '@/src/lib/followup-selection';

export function StepCard({
  session,
  index,
  theme,
  reviewed,
  onToggleReviewed,
}: {
  session: Session;
  index: number;
  theme: ResolvedTheme;
  reviewed: boolean;
  onToggleReviewed: () => void;
}) {
  const step = session.capsule.steps[index];
  if (!step) return null;

  const stepNo = String(step.index).padStart(2, '0');
  const isLastStep = index === session.capsule.steps.length - 1;
  const followupSelection =
    step.followup ?? (isLastStep ? buildLastStepFollowupSelection(session, step) : undefined);
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
        <div className="slm-card-meta">
          <span className="slm-step-badge">{stepNo}</span>
        </div>
        <button
          type="button"
          className={`slm-review ${reviewed ? 'is-on' : ''}`}
          onClick={onToggleReviewed}
          aria-pressed={reviewed}
        >
          <span className="slm-review-box">{reviewed && <IconCheck width={10} height={10} />}</span>
          {reviewed ? 'Reviewed' : 'Mark reviewed'}
        </button>
        <h2 className="slm-card-title">{step.title}</h2>
      </header>

      {step.formula && (
        <div className="slm-formula">
          <span className="slm-formula-label">Formula</span>
          <MathMarkdown content={step.formula} />
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

      {step.quickCheck && (
        <QuickCheck check={step.quickCheck} platform={session.platform} checkNumber={step.index} />
      )}

      {followupSelection && (
        <FollowupBar
          followup={followupSelection}
          subject={session.capsule.meta.subject}
          stepTitle={step.title}
          intent={step.followup ? 'dig-deeper' : 'ask'}
        />
      )}
    </motion.article>
  );
}
