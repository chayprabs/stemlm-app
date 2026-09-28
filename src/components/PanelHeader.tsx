import { useRef } from 'react';
import type { Session } from '@/src/protocol/types';
import type { PanelView } from '@/src/state/store';
import type { ResolvedTheme } from '@/src/lib/theme';
import { sessionQuestionHeading } from '@/src/lib/session-question';
import { MathMarkdown } from './MathMarkdown';
import { BrandWordmark, themeToBrandVariant } from './brand';
import {
  IconBook,
  IconClose,
  IconLayers,
  IconMinus,
  IconPdf,
  IconPlus,
  IconSave,
  IconTheme,
} from './icons';

export function PanelHeader({
  session,
  view,
  theme,
  saved,
  onSetView,
  onToggleTheme,
  onToggleSave,
  contentScale,
  contentScaleBusy,
  onChangeContentScale,
  onExportPdf,
  onClose,
}: {
  session: Session | undefined;
  view: PanelView;
  theme: ResolvedTheme;
  saved: boolean;
  onSetView: (v: PanelView) => void;
  onToggleSave: () => void;
  contentScale: number;
  contentScaleBusy: boolean;
  onChangeContentScale: (direction: -1 | 1) => void;
  onExportPdf: () => void;
  onClose: () => void;
  onToggleTheme: () => void;
}) {
  const heading = session ? sessionQuestionHeading(session) : '';
  const decreaseRef = useRef<HTMLButtonElement>(null);
  const increaseRef = useRef<HTMLButtonElement>(null);

  /**
   * Keep the keyboard alive at the boundaries: the control the user just
   * pressed becomes disabled at level 1 / 5, which would otherwise drop focus
   * to the document. Hand it to the sibling that is still usable.
   */
  function changeScale(direction: -1 | 1) {
    const next = contentScale + direction;
    onChangeContentScale(direction);
    if (direction === -1 && next <= 1) increaseRef.current?.focus();
    if (direction === 1 && next >= 5) decreaseRef.current?.focus();
  }

  return (
    <header className="slm-header">
      <div className="slm-header-bar slm-header-top">
        <div className="slm-header-leading">
          <div className="slm-brand">
            <BrandWordmark
              className="slm-brand-name"
              variant={themeToBrandVariant(theme)}
            />
          </div>
          {session && (
            <div className="slm-header-nav slm-header-bottom">
              <div className="slm-tabs" role="tablist" aria-label="Study view">
                <button
                  type="button"
                  role="tab"
                  id="slm-tab-steps"
                  aria-controls="slm-panel-steps"
                  aria-selected={view === 'steps'}
                  className={`slm-tab ${view === 'steps' ? 'is-active' : ''}`}
                  onClick={() => onSetView('steps')}
                >
                  <IconLayers /> Steps
                </button>
                <button
                  type="button"
                  role="tab"
                  id="slm-tab-solution"
                  aria-controls="slm-panel-solution"
                  aria-selected={view === 'solution'}
                  className={`slm-tab ${view === 'solution' ? 'is-active' : ''}`}
                  onClick={() => onSetView('solution')}
                >
                  <IconBook /> Solution
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="slm-header-actions">
          {/* Sizes answer content, so it only exists once there is an answer. */}
          {session && (
          <div
            className="slm-content-scale"
            role="group"
            aria-label={`Solution content size, level ${contentScale} of 5`}
          >
            <button
              ref={decreaseRef}
              type="button"
              className="slm-content-scale-btn"
              aria-label={`Decrease content size from level ${contentScale}`}
              title="Decrease content size"
              onClick={() => changeScale(-1)}
              disabled={contentScaleBusy || contentScale <= 1}
            >
              <IconMinus />
            </button>
            <span className="slm-content-scale-divider" aria-hidden="true" />
            <button
              ref={increaseRef}
              type="button"
              className="slm-content-scale-btn"
              aria-label={`Increase content size from level ${contentScale}`}
              title="Increase content size"
              onClick={() => changeScale(1)}
              disabled={contentScaleBusy || contentScale >= 5}
            >
              <IconPlus />
            </button>
            <span className="slm-sr-only" role="status" aria-live="polite">
              {`Content size level ${contentScale} of 5`}
            </span>
          </div>
          )}
          <button
            type="button"
            className={`slm-icon-btn slm-theme-btn ${theme === 'dark' ? 'is-dark' : ''}`}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={onToggleTheme}
          >
            <IconTheme />
          </button>
          <button
            type="button"
            className="slm-icon-btn slm-icon-btn--save"
            aria-label={saved ? 'Remove from saved sessions' : 'Save session'}
            aria-pressed={saved}
            title={saved ? 'Remove from saved' : session?.cutOff ? 'Save when the full answer arrives' : 'Save session'}
            onClick={onToggleSave}
            disabled={!session || session.cutOff}
            data-active={saved ? 'true' : undefined}
          >
            <span className="slm-save-glyph">
              <IconSave />
            </span>
          </button>
          <button
            type="button"
            className="slm-icon-btn"
            aria-label="Export PDF"
            title="Export PDF"
            onClick={onExportPdf}
            disabled={!session}
          >
            <IconPdf width={18} height={18} />
          </button>
          <button
            type="button"
            className="slm-icon-btn slm-icon-btn--close"
            aria-label="Close panel"
            title="Close panel"
            onClick={onClose}
          >
            <IconClose width={18} height={18} />
          </button>
        </div>
      </div>

      {session && (
        <div className="slm-header-title slm-topic-row">
          <span className="slm-question-icon" aria-hidden="true">
            Q.
          </span>
          <div className="slm-topic-scroll is-single">
            <MathMarkdown content={heading} className="slm-topic" />
          </div>
        </div>
      )}
    </header>
  );
}
