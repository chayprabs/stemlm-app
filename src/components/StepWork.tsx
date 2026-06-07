import type { Step } from '@/src/protocol/types';
import { resolveStepWorkText } from '@/src/lib/step-display';
import { MathMarkdown } from './MathMarkdown';

export function StepWork({
  step,
  className = 'slm-step-work',
}: {
  step: Step;
  className?: string;
}) {
  const work = resolveStepWorkText(step);
  if (!work) return null;

  return (
    <div className={className}>
      <span className="slm-step-work-label">Work</span>
      <div className="slm-step-work-body slm-selectable">
        <MathMarkdown content={work} />
      </div>
    </div>
  );
}
