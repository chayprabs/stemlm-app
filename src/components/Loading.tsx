import { motion } from 'framer-motion';
import { IconSpark } from './icons';

/** Polished skeleton shown while the assistant generates the capsule. */
export function Loading({ subject }: { subject?: string }) {
  return (
    <div className="slm-loading">
      <div className="slm-loading-head">
        <motion.span
          className="slm-loading-spark"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
        >
          <IconSpark />
        </motion.span>
        <div>
          <p className="slm-loading-title">Structuring the answer…</p>
          <p className="slm-loading-sub">
            stemLM is turning the response into clear steps{subject ? ` · ${subject}` : ''}.
          </p>
        </div>
      </div>

      <div className="slm-skeleton-card">
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
