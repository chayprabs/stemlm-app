import type { Step } from '@/src/protocol/types';
import { MathMarkdown } from './MathMarkdown';

export function StepWork({
  step,
  className = 'slm-step-work',
}: {
  step: Step;
  className?: string;
}) {
  const body = step.body.trim();
  if (!body) return null;

  return (
    <div className={className}>
      <span className="slm-step-work-label">Work</span>
      <div className="slm-step-work-body slm-selectable">
        <MathMarkdown content={step.body} />
      </div>
    </div>
  );
}
