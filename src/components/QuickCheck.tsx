import { useCallback, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { QuickCheck as QuickCheckType } from '@/src/protocol/types';
import { MathMarkdown } from './MathMarkdown';
import { IconEye } from './icons';
import { trackEvent } from '@/src/lib/analytics';
import { MOTION_DUR, MOTION_EASE_OUT } from './step-motion';

/**
 * A self-test on the step's move. The answer stays out of the page until asked for, so the student
 * commits to an answer first; it can be hidden again to retry later.
 */
export function QuickCheck({
  check,
  platform,
  checkNumber,
}: {
  check: QuickCheckType;
  platform?: string;
  checkNumber?: number;
}) {
  const [revealed, setRevealed] = useState(false);
  const reducedMotion = useReducedMotion();
  const answerId = `slm-check-${useId().replaceAll(':', '')}`;
  // Reveal and Hide replace each other, so the control that was pressed leaves the page. Focus
  // follows the reader's action to what took its place instead of falling back to the document.
  const followFocus = useRef(false);
  const takeFocus = useCallback((el: HTMLElement | null) => {
    if (!el || !followFocus.current) return;
    followFocus.current = false;
    el.focus({ preventScroll: true });
  }, []);

  function toggle(next: boolean) {
    followFocus.current = true;
    setRevealed(next);
    if (next) void trackEvent('quickcheck_revealed', { platform });
  }

  return (
    <section className={`slm-quickcheck ${revealed ? 'is-revealed' : ''}`} aria-label={`Quick check ${checkNumber ?? 1}`}>
      <div className="slm-quickcheck-head">
        <span className="slm-quickcheck-badge">
          Check {checkNumber ?? 1}
        </span>
        <span className="slm-quickcheck-hint">Try it before you look</span>
      </div>
      <div className="slm-quickcheck-q">
        <MathMarkdown content={check.question} />
      </div>
      <AnimatePresence initial={false} mode="wait">
        {!revealed ? (
          <motion.div
            key="ask"
            className="slm-quickcheck-actions"
            initial={false}
            exit={reducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: MOTION_DUR[1] }}
          >
            <button
              ref={takeFocus}
              type="button"
              className="slm-btn slm-btn-soft slm-quickcheck-reveal"
              aria-expanded={false}
              onClick={() => toggle(true)}
            >
              <IconEye />
              Reveal answer
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="answer"
            id={answerId}
            className="slm-quickcheck-a"
            initial={reducedMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={reducedMotion ? { duration: 0 } : { duration: MOTION_DUR[3], ease: MOTION_EASE_OUT }}
          >
            <div
              ref={takeFocus}
              className="slm-quickcheck-a-inner"
              role="group"
              aria-label={`Answer to check ${checkNumber ?? 1}`}
              tabIndex={-1}
            >
              <span className="slm-quickcheck-a-label">Answer</span>
              <MathMarkdown content={check.answer} />
              <button
                type="button"
                className="slm-quickcheck-hide"
                aria-expanded
                aria-controls={answerId}
                onClick={() => toggle(false)}
              >
                Hide answer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
