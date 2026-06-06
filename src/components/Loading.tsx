import { motion } from 'framer-motion';
import { StemMark } from './icons';

export function Loading({ subject }: { subject?: string }) {
  return (
    <div className="slm-loading">
      <div className="slm-loading-head">
        <motion.span
          className="slm-loading-spark"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        >
          <StemMark />
        </motion.span>
        <div>
          <p className="slm-loading-title">Reading response</p>
          <p className="slm-loading-sub">
            Matching framework and building step cards
            {subject && subject !== 'Auto' ? ` · ${subject}` : ''}
          </p>
        </div>
      </div>

      <div className="slm-skeleton-card">
        <div className="slm-sk slm-sk-step" />
        <div className="slm-sk slm-sk-title" />
        <div className="slm-sk slm-sk-diagram" />
        <div className="slm-sk slm-sk-formula" />
        <div className="slm-sk slm-sk-line" />
        <div className="slm-sk slm-sk-line short" />
      </div>
    </div>
  );
}
