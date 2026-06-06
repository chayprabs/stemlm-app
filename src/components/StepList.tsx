import type { Step } from '@/src/protocol/types';
import { IconCheck } from './icons';

/** Vertical numbered step rail — circles only, no titles or previews. */
export function StepList({
  steps,
  activeIndex,
  reviewedIds,
  onSelect,
}: {
  steps: Step[];
  activeIndex: number;
  reviewedIds: string[];
  onSelect: (index: number) => void;
}) {
  return (
    <nav className="slm-step-rail" aria-label="Solution steps">
      <ol className="slm-step-rail-track">
        {steps.map((step, i) => {
          const active = i === activeIndex;
          const reviewed = reviewedIds.includes(step.id);
          const isLast = i === steps.length - 1;

          return (
            <li
              key={step.id}
              className={[
                'slm-step-rail-item',
                active ? 'is-active' : '',
                reviewed ? 'is-reviewed' : '',
                isLast ? 'is-last' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <button
                type="button"
                className="slm-step-rail-btn"
                onClick={() => onSelect(i)}
                aria-current={active ? 'step' : undefined}
                aria-label={`Step ${step.index}: ${step.title}`}
                title={step.title}
              >
                <span className="slm-step-rail-dot">
                  {reviewed ? <IconCheck width={12} height={12} /> : step.index}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
