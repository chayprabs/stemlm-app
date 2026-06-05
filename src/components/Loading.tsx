import { motion } from 'framer-motion';
import { IconSpark } from './icons';

/** Skeleton shown while the assistant generates the study capsule. */
export function Loading({ subject }: { subject?: string }) {
  return (
    <div className="slm-loading" role="status" aria-live="polite" aria-busy="true">
      <div className="slm-loading-head">
        <motion.span
          className="slm-loading-spark"
          aria-hidden="true"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
        >
          <IconSpark />
        </motion.span>
        <div>
          <p className="slm-loading-title">Building your study capsule</p>
          <p className="slm-loading-sub">
            Organizing steps, formulas, and diagrams{subject ? ` · ${subject}` : ''}.
          </p>
        </div>
      </div>

      <div className="slm-skeleton-card" aria-hidden="true">
        <div className="slm-sk slm-sk-step" />
        <div className="slm-sk slm-sk-title" />
        <div className="slm-sk slm-sk-formula" />
        <div className="slm-sk slm-sk-line" />
        <div className="slm-sk slm-sk-line short" />
        <div className="slm-sk slm-sk-diagram" />
        <div className="slm-sk slm-sk-line" />
      </div>
    </div>
  );
}
