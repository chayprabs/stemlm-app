import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { QuickCheck as QuickCheckType } from '@/src/protocol/types';
import { MathMarkdown } from './MathMarkdown';
import { trackEvent } from '@/src/lib/analytics';

export function QuickCheck({ check, platform }: { check: QuickCheckType; platform?: string }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="slm-quickcheck">
      <div className="slm-quickcheck-head">
        <span className="slm-quickcheck-badge">Quick check</span>
      </div>
      <div className="slm-quickcheck-q">
        <MathMarkdown content={check.question} />
      </div>
      {!revealed ? (
        <button
          type="button"
          className="slm-btn slm-btn-ghost slm-quickcheck-reveal"
          onClick={() => {
            setRevealed(true);
            void trackEvent('quickcheck_revealed', { platform });
          }}
        >
          Reveal answer
        </button>
      ) : (
        <AnimatePresence>
          <motion.div
            className="slm-quickcheck-a"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <MathMarkdown content={check.answer} />
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
