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
  IconPdf,
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
  onExportPdf,
  onClose,
}: {
  session: Session | undefined;
  view: PanelView;
  theme: ResolvedTheme;
  saved: boolean;
  onSetView: (v: PanelView) => void;
  onToggleSave: () => void;
  onExportPdf: () => void;
  onClose: () => void;
  onToggleTheme: () => void;
}) {
  const heading = session ? sessionQuestionHeading(session) : '';

  return (
    <header className="slm-header">
      <div className="slm-header-bar slm-header-top">
        <div className="slm-brand">
          <BrandWordmark
            key={themeToBrandVariant(theme)}
            className="slm-brand-name"
            variant={themeToBrandVariant(theme)}
          />
        </div>
        <div className="slm-header-actions">
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
            title={saved ? 'Remove from saved' : 'Save session'}
            onClick={onToggleSave}
            disabled={!session}
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
        <>
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

          <div className="slm-header-title slm-topic-row">
            <span className="slm-question-icon" aria-hidden="true">
              Q.
            </span>
            <div className="slm-topic-scroll">
              <MathMarkdown content={heading} className="slm-topic" />
            </div>
          </div>
        </>
      )}
    </header>
  );
}
