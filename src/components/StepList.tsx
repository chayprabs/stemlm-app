import { useEffect, useRef } from 'react';
import type { Step } from '@/src/protocol/types';
import { StepIndexMark } from './step-index';

/** Compact step pager — index tiles only; titles live on the card and in the tooltip. */
export function StepList({
  steps,
  activeIndex,
  onSelect,
}: {
  steps: Step[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  const railRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const active = rail.querySelector<HTMLElement>('.slm-step-rail-item.is-active');
    active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeIndex, steps.length]);

  return (
    <nav ref={railRef} className="slm-step-rail" aria-label="Solution steps">
      <ol className="slm-step-rail-track">
        {steps.map((step, i) => {
          const n = i + 1;
          const active = i === activeIndex;

          return (
            <li
              key={step.id}
              className={['slm-step-rail-item', active ? 'is-active' : ''].filter(Boolean).join(' ')}
            >
              <button
                type="button"
                className="slm-step-rail-btn"
                onClick={() => onSelect(i)}
                aria-current={active ? 'step' : undefined}
                aria-label={`Step ${n} (${step.id}): ${step.title}`}
                title={`${step.id}: ${step.title}`}
              >
                <span className="slm-step-rail-mark" aria-hidden="true">
                  <StepIndexMark n={n} />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
