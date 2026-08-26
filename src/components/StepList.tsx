import { useEffect, useRef } from 'react';
import type { StepEntry } from '@/src/lib/step-entries';
import { StepIndexMark, FollowupIndexMark } from './step-index';

/**
 * Compact step pager — numbered tiles for solution steps, chat-bubble tiles
 * for inline Ask-in-chat answers anchored between them (1, 2, 3, ●, 4).
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

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const active = rail.querySelector<HTMLElement>('.slm-step-rail-item.is-active');
    active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeIndex, entries.length]);

  return (
    <nav ref={railRef} className="slm-step-rail" aria-label="Solution steps">
      <ol className="slm-step-rail-track">
        {entries.map((entry, i) => {
          const active = i === activeIndex;
          const isFollowup = entry.kind === 'followup';
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
                title={isFollowup ? entry.followup.question || 'Follow-up answer' : entry.step.title}
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
