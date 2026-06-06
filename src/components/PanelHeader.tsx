import type { Session } from '@/src/protocol/types';
import type { PanelView } from '@/src/state/store';
import type { ResolvedTheme } from '@/src/lib/theme';
import { BrandWordmark } from './BrandWordmark';
import {
  IconBook,
  IconClose,
  IconLayers,
  IconMoon,
  IconPdf,
  IconSave,
  IconSun,
  StemMark,
} from './icons';

export function PanelHeader({
  session,
  view,
  activeStepIndex,
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
  activeStepIndex: number;
  reviewedCount: number;
  theme: ResolvedTheme;
  saved: boolean;
  onSetView: (v: PanelView) => void;
  onSave: () => void;
  onExportPdf: () => void;
  onClose: () => void;
  onToggleTheme: () => void;
}) {
  const total = session?.capsule.steps.length ?? 0;
  const activeStep = session?.capsule.steps[activeStepIndex];
  const heading =
    view === 'steps' && activeStep ? activeStep.title : session?.capsule.meta.topic ?? '';

  return (
    <header className="slm-header">
      <div className="slm-header-top">
        <div className="slm-brand">
          <span className="slm-brand-mark" aria-hidden="true">
            <StemMark width={13} height={13} />
          </span>
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
            aria-label={saved ? 'Session saved' : 'Save session'}
            onClick={onSave}
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
            <h1 className="slm-topic">{heading}</h1>
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
