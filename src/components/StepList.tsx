import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { StepEntry } from '@/src/lib/step-entries';
import { StepIndexMark, FollowupIndexMark } from './step-index';

/**
 * The step strip: one numbered mark per step in a row above the page, with Ask-in-chat answers
 * sitting after the step they belong to (1, 2, 3, ●, 4). Marks only, no titles: the page below
 * carries the title, and a mark's tooltip names its step.
 */
export function StepList({
  entries,
  activeIndex,
  onSelect,
}: {
  entries: StepEntry[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  const railRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const active = rail.querySelector<HTMLElement>('.slm-step-rail-item.is-active');
    active?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [activeIndex, entries.length, reducedMotion]);

  return (
    <nav ref={railRef} className="slm-step-rail" aria-label="Solution steps">
      <ol className="slm-step-rail-track">
        {entries.map((entry, i) => {
          const active = i === activeIndex;
          const isFollowup = entry.kind === 'followup';
          const title = isFollowup ? entry.followup.question || 'Follow-up answer' : entry.step.title;
          const label = isFollowup
            ? `Follow-up answer after step ${entry.anchorStepIndex + 1}${
                entry.followup.question ? `: ${entry.followup.question}` : ''
              }`
            : `Step ${entry.stepNumber}: ${entry.step.title}`;

          return (
            <li
              key={entry.key}
              className={[
                'slm-step-rail-item',
                isFollowup ? 'slm-step-rail-item--followup' : '',
                active ? 'is-active' : '',
                i < activeIndex ? 'is-past' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <button
                type="button"
                className={[
                  'slm-step-rail-btn',
                  isFollowup ? 'slm-step-rail-btn--followup' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onSelect(i)}
                aria-current={active ? 'step' : undefined}
                aria-label={label}
                title={title}
              >
                <span className="slm-step-rail-mark" aria-hidden="true">
                  {isFollowup ? <FollowupIndexMark /> : <StepIndexMark n={entry.stepNumber} />}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
