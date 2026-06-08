import type { Session } from '@/src/protocol/types';
import type { PanelView } from '@/src/state/store';
import type { ResolvedTheme } from '@/src/lib/theme';
import { sessionQuestionHeading } from '@/src/lib/session-question';
import { MathMarkdown } from './MathMarkdown';
import { BrandWordmark } from './BrandWordmark';
import { ExtensionLogo } from './ExtensionLogo';
import {
  IconBook,
  IconClose,
  IconLayers,
  IconMoon,
  IconPdf,
  IconSave,
  IconSun,
} from './icons';

export function PanelHeader({
  session,
  view,
  reviewedCount,
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
  reviewedCount: number;
  theme: ResolvedTheme;
  saved: boolean;
  onSetView: (v: PanelView) => void;
  onToggleSave: () => void;
  onExportPdf: () => void;
  onClose: () => void;
  onToggleTheme: () => void;
}) {
  const total = session?.capsule.steps.length ?? 0;
  const heading = session ? sessionQuestionHeading(session) : '';

  return (
    <header className="slm-header">
      <div className="slm-header-top">
        <div className="slm-brand">
          <ExtensionLogo size={26} />
          <BrandWordmark className="slm-brand-name" />
        </div>
        <div className="slm-header-actions">
          <button
            type="button"
            className="slm-icon-btn"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={onToggleTheme}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
          <button
            type="button"
            className="slm-icon-btn"
            aria-label={saved ? 'Remove from saved sessions' : 'Save session'}
            aria-pressed={saved}
            title={saved ? 'Remove from saved' : 'Save session'}
            onClick={onToggleSave}
            disabled={!session}
            data-active={saved ? 'true' : undefined}
          >
            <IconSave />
          </button>
          <button
            type="button"
            className="slm-icon-btn"
            aria-label="Export PDF"
            onClick={onExportPdf}
            disabled={!session}
          >
            <IconPdf />
          </button>
          <button type="button" className="slm-icon-btn" aria-label="Close panel" onClick={onClose}>
            <IconClose />
          </button>
        </div>
      </div>

      {session && (
        <>
          <div className="slm-topic-row">
            <MathMarkdown content={heading} className="slm-topic" />
            <span className="slm-subject-chip">{session.capsule.meta.subject}</span>
          </div>

          <div className="slm-header-bottom">
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
            {view === 'steps' && total > 0 && (
              <span className="slm-progress-count">
                {reviewedCount}/{total} reviewed
              </span>
            )}
          </div>
        </>
      )}
    </header>
  );
}
