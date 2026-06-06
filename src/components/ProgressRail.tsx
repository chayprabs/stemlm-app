import type { Step } from '@/src/protocol/types';
import { IconCheck } from './icons';

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
        const badge = String(step.index).padStart(2, '0');
        return (
          <button
            key={step.id}
            type="button"
            className={`slm-rail-dot ${active ? 'is-active' : ''} ${reviewed ? 'is-reviewed' : ''}`}
            onClick={() => onJump(i)}
            title={step.title}
            aria-label={`Step ${i + 1}: ${step.title}`}
            aria-current={active ? 'step' : undefined}
          >
            <span className="slm-rail-dot-mark">
              {reviewed ? <IconCheck width={10} height={10} /> : badge}
            </span>
            <span className="slm-rail-dot-label">{step.title}</span>
          </button>
        );
      })}
    </nav>
  );
}
