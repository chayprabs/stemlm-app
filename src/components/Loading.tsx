import { AnimatedStemMark, themeToBrandVariant } from './brand';
import type { ResolvedTheme } from '@/src/lib/theme';

/**
 * Shown while the chat is still writing. The skeleton has the shape of the page that is coming
 * (a strip of step marks, then title, formula, prose and figure in the reading column) so nothing
 * jumps when the answer lands.
 */
export function Loading({ theme = 'light' }: { theme?: ResolvedTheme }) {
  return (
    <div className="slm-loading" role="status" aria-live="polite">
      <div className="slm-loading-strip" aria-hidden="true">
        <div className="slm-sk slm-sk-dot" />
        <div className="slm-sk slm-sk-dot" />
        <div className="slm-sk slm-sk-dot" />
      </div>

      <div className="slm-loading-page">
        <div className="slm-loading-head">
          <span className="slm-loading-mark" aria-hidden="true">
            <AnimatedStemMark size={28} variant={themeToBrandVariant(theme)} />
          </span>
          <div>
            <p className="slm-loading-title">Reading response</p>
            <p className="slm-loading-sub">Each step appears here as the chat finishes writing it.</p>
          </div>
        </div>

        <div className="slm-skeleton-card" aria-hidden="true">
          <div className="slm-sk slm-sk-step" />
          <div className="slm-sk slm-sk-title" />
          <div className="slm-sk slm-sk-formula" />
          <div className="slm-sk slm-sk-line" />
          <div className="slm-sk slm-sk-line" />
          <div className="slm-sk slm-sk-line short" />
          <div className="slm-sk slm-sk-diagram" />
        </div>
      </div>
    </div>
  );
}
