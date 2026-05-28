import type { Step } from '@/src/protocol/types';
import { IconCheck } from './icons';

/**
 * Compact vertical rail of step dots showing position + reviewed state. Click a
 * dot to jump to that step.
 */
export function ProgressRail({
  steps,
  activeIndex,
  reviewedIds,
  onJump,
}: {
  steps: Step[];
  activeIndex: number;
  reviewedIds: string[];
  onJump: (index: number) => void;
}) {
  return (
    <nav className="slm-rail" aria-label="Steps">
      {steps.map((step, i) => {
        const reviewed = reviewedIds.includes(step.id);
        const active = i === activeIndex;
        return (
          <button
            key={step.id}
            type="button"
            className={`slm-rail-dot ${active ? 'is-active' : ''} ${reviewed ? 'is-reviewed' : ''}`}
            onClick={() => onJump(i)}
            title={step.title}
            aria-current={active ? 'step' : undefined}
          >
            <span className="slm-rail-dot-mark">{reviewed ? <IconCheck /> : i + 1}</span>
            <span className="slm-rail-dot-label">{step.title}</span>
          </button>
        );
      })}
    </nav>
  );
}
