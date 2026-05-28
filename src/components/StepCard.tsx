import { motion } from 'framer-motion';
import type { Session } from '@/src/protocol/types';
import type { ResolvedTheme } from '@/src/lib/theme';
import { MathMarkdown } from './MathMarkdown';
import { DiagramRenderer } from './DiagramRenderer';
import { QuickCheck } from './QuickCheck';
import { FollowupBar } from './FollowupBar';
import { IconCheck } from './icons';

/**
 * A single study step: title, key formula, explanation, the step-synced
 * diagram, the takeaway, a quick-check, and a follow-up prompt. The whole body
 * is selectable so the panel can offer a quote-reply drill-down.
 */
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

  return (
    <motion.article
      key={step.id}
      className="slm-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="slm-card-head">
        <div className="slm-card-step">Step {step.index}</div>
        <h2 className="slm-card-title">{step.title}</h2>
        <button
          type="button"
          className={`slm-review ${reviewed ? 'is-on' : ''}`}
          onClick={onToggleReviewed}
          aria-pressed={reviewed}
        >
          <span className="slm-review-box">{reviewed && <IconCheck />}</span>
          {reviewed ? 'Reviewed' : 'Mark reviewed'}
        </button>
      </header>

      {step.formula && (
        <div className="slm-formula">
          <MathMarkdown content={step.formula} />
        </div>
      )}

      <div className="slm-card-body slm-selectable">
        <MathMarkdown content={step.body} />
      </div>

      {step.diagram && (
        <div className="slm-card-diagram">
          <DiagramRenderer diagram={step.diagram} theme={theme} />
        </div>
      )}

      {step.takeaway && (
        <div className="slm-takeaway slm-selectable">
          <span className="slm-takeaway-label">Takeaway</span>
          <MathMarkdown content={step.takeaway} />
        </div>
      )}

      {step.quickCheck && <QuickCheck check={step.quickCheck} platform={session.platform} />}

      {step.followup && (
        <FollowupBar
          followup={step.followup}
          subject={session.capsule.meta.subject}
          stepTitle={step.title}
        />
      )}
    </motion.article>
  );
}
