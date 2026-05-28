import type { Session } from '@/src/protocol/types';
import type { PanelView } from '@/src/state/store';
import type { ResolvedTheme } from '@/src/lib/theme';
import { IconBook, IconClose, IconLayers, IconMoon, IconPdf, IconSave, IconSun } from './icons';

export function PanelHeader({
  session,
  view,
  reviewedCount,
  theme,
  saved,
  onSetView,
  onToggleTheme,
  onSave,
  onExportPdf,
  onClose,
}: {
  session: Session | undefined;
  view: PanelView;
  reviewedCount: number;
  theme: ResolvedTheme;
  saved: boolean;
  onSetView: (v: PanelView) => void;
  onToggleTheme: () => void;
  onSave: () => void;
  onExportPdf: () => void;
  onClose: () => void;
}) {
  const total = session?.capsule.steps.length ?? 0;

  return (
    <header className="slm-header">
      <div className="slm-header-top">
        <div className="slm-brand">
          <span className="slm-brand-dot" />
          <span className="slm-brand-name">stemLM</span>
          {session && <span className="slm-subject-chip">{session.capsule.meta.subject}</span>}
        </div>
        <div className="slm-header-actions">
          <button type="button" className="slm-icon-btn" title="Toggle theme" onClick={onToggleTheme}>
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
          <button
            type="button"
            className="slm-icon-btn"
            title={saved ? 'Saved' : 'Save session'}
            onClick={onSave}
            disabled={!session}
            data-active={saved ? 'true' : undefined}
          >
            <IconSave />
          </button>
          <button
            type="button"
            className="slm-icon-btn"
            title="Export PDF"
            onClick={onExportPdf}
            disabled={!session}
          >
            <IconPdf />
          </button>
          <button type="button" className="slm-icon-btn" title="Close" onClick={onClose}>
            <IconClose />
          </button>
        </div>
      </div>

      {session && (
        <>
          <h1 className="slm-topic">{session.capsule.meta.topic}</h1>
          <div className="slm-header-bottom">
            <div className="slm-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={view === 'steps'}
                className={`slm-tab ${view === 'steps' ? 'is-active' : ''}`}
                onClick={() => onSetView('steps')}
              >
                <IconLayers /> Steps
              </button>
              <button
                type="button"
                role="tab"
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
