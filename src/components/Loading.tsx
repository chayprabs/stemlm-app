import { motion } from 'framer-motion';
import { ExtensionLogo } from './ExtensionLogo';

export function Loading() {
  return (
    <div className="slm-loading">
      <div className="slm-loading-head">
        <motion.span
          className="slm-loading-mark"
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        >
          <ExtensionLogo size={16} />
        </motion.span>
        <div>
          <p className="slm-loading-title">Reading response</p>
          <p className="slm-loading-sub">Matching framework and building step cards</p>
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
