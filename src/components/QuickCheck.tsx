import { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { QuickCheck as QuickCheckType } from '@/src/protocol/types';
import { MathMarkdown } from './MathMarkdown';
import { IconEye } from './icons';
import { trackEvent } from '@/src/lib/analytics';

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
            transition={{ duration: 0.1 }}
          >
            <button
              type="button"
              className="slm-btn slm-btn-soft slm-quickcheck-reveal"
              aria-expanded={false}
              aria-controls={answerId}
              onClick={() => {
                setRevealed(true);
                void trackEvent('quickcheck_revealed', { platform });
              }}
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
            transition={reducedMotion ? { duration: 0 } : { duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="slm-quickcheck-a-inner">
              <span className="slm-quickcheck-a-label">Answer</span>
              <MathMarkdown content={check.answer} />
              <button type="button" className="slm-quickcheck-hide" onClick={() => setRevealed(false)}>
                Hide answer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
