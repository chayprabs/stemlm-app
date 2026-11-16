import type { Step } from '@/src/protocol/types';
import { resolveStepWorkText } from '@/src/lib/step-display';
import { MathMarkdown } from './MathMarkdown';

/** The worked explanation of a step. It is the page's body text, so its label is spoken, not shown. */
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
      <span className="slm-step-work-label slm-sr-only">Work</span>
      <div className="slm-step-work-body slm-selectable">
        <MathMarkdown content={work} />
      </div>
    </div>
  );
}
