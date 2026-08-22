import type { Step } from '@/src/protocol/types';
import { StepIndexMark } from './step-index';

export function ProgressRail({
  steps,
  activeIndex,
  onJump,
}: {
  steps: Step[];
  activeIndex: number;
  onJump: (index: number) => void;
}) {
  return (
    <nav className="slm-rail" aria-label="Steps">
      {steps.map((step, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={step.id}
            type="button"
            className={`slm-rail-dot ${active ? 'is-active' : ''}`}
            onClick={() => onJump(i)}
            title={step.title}
            aria-label={`Step ${i + 1}: ${step.title}`}
            aria-current={active ? 'step' : undefined}
          >
            <span className="slm-rail-dot-mark">
              <StepIndexMark n={i + 1} />
            </span>
            <span className="slm-rail-dot-label">{step.title}</span>
          </button>
        );
      })}
    </nav>
  );
}
