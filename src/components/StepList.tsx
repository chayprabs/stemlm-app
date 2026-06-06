import type { Step } from '@/src/protocol/types';
import { IconCheck } from './icons';

function stepPreview(step: Step): string {
  if (step.formula) {
    return step.formula.replace(/\$\$?/g, '').trim();
  }
  const plain = step.body
    .replace(/\$\$?[^$]+\$\$?/g, ' ')
    .replace(/[#*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > 72 ? `${plain.slice(0, 72)}…` : plain;
}

/** Hero-style compact step rows — all steps visible with 01 mono chips. */
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
    <div className="slm-step-list" role="list" aria-label="Solution steps">
      {steps.map((step, i) => {
        const active = i === activeIndex;
        const reviewed = reviewedIds.includes(step.id);
        const badge = String(step.index).padStart(2, '0');
        const preview = stepPreview(step);

        return (
          <button
            key={step.id}
            type="button"
            role="listitem"
            className={`slm-step-row ${active ? 'is-active' : ''} ${reviewed ? 'is-reviewed' : ''}`}
            onClick={() => onSelect(i)}
            aria-current={active ? 'step' : undefined}
            aria-label={`Step ${badge}: ${step.title}`}
          >
            <div className="slm-step-row-head">
              <span className="slm-step-badge">
                {reviewed ? <IconCheck width={10} height={10} /> : badge}
              </span>
              <span className="slm-step-row-title">{step.title}</span>
            </div>
            {preview && <div className="slm-step-row-value">{preview}</div>}
          </button>
        );
      })}
    </div>
  );
}
