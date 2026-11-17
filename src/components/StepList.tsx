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

  // Keep the current mark in the middle of the strip when the steps outnumber the room, so the
  // reader always sees what came before and what comes next. Only the strip scrolls: the page and
  // the chat behind the panel stay where they are.
  useEffect(() => {
    const rail = railRef.current;
    const active = rail?.querySelector<HTMLElement>('.slm-step-rail-item.is-active');
    if (!rail || !active) return;
    const strip = rail.getBoundingClientRect();
    const mark = active.getBoundingClientRect();
    const offset = mark.left + mark.width / 2 - (strip.left + strip.width / 2);
    rail.scrollBy?.({ left: offset, behavior: reducedMotion ? 'auto' : 'smooth' });
    // The strip is one stop for Tab: when the keyboard is in it, it moves with the current mark.
    const root = rail.getRootNode() as Document | ShadowRoot;
    if (root.activeElement && rail.contains(root.activeElement)) active.querySelector('button')?.focus({ preventScroll: true });
  }, [activeIndex, entries.length, reducedMotion]);

  // Left and Right turn the page (the panel's own keys); Home and End go to the first and last step.
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    onSelect(e.key === 'Home' ? 0 : entries.length - 1);
  }

  return (
    <nav ref={railRef} className="slm-step-rail" aria-label="Solution steps" onKeyDown={onKeyDown}>
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
                tabIndex={active ? 0 : -1}
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
