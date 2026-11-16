import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { Session } from '@/src/protocol/types';
import type { PanelView } from '@/src/state/store';
import type { ResolvedTheme } from '@/src/lib/theme';
import { sessionQuestionHeading } from '@/src/lib/session-question';
import { MathMarkdown } from './MathMarkdown';
import { BrandWordmark, themeToBrandVariant } from './brand';
import {
  IconBook,
  IconChevronDown,
  IconClose,
  IconLayers,
  IconPdf,
  IconSave,
  IconTextLarger,
  IconTextSmaller,
  IconTheme,
} from './icons';

/** The question block: what is being studied, in the student's own words. */
function QuestionBlock({ session }: { session: Session }) {
  const heading = sessionQuestionHeading(session);
  const { subject, topic } = session.capsule.meta;
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const regionId = `slm-question-${useId().replaceAll(':', '')}`;
  // The topic line repeats nothing: it is dropped when the question already is the topic.
  const showTopic = Boolean(topic) && topic.trim().toLowerCase() !== heading.trim().toLowerCase();

  useEffect(() => setExpanded(false), [session.id]);

  // Offer "Show more" only when the clamped text is actually cut.
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const measure = () => {
      if (!expanded) setOverflows(el.scrollHeight - el.clientHeight > 2);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [heading, expanded]);

  return (
    <div className="slm-header-title slm-topic-row">
      <div className="slm-question-meta">
        <span className="slm-question-subject">{subject}</span>
        {showTopic && <span className="slm-question-topic">{topic}</span>}
      </div>
      <div className="slm-question-body">
        <div
          ref={textRef}
          id={regionId}
          className={`slm-topic-scroll ${expanded ? 'is-expanded' : 'is-single'}`}
        >
          <MathMarkdown content={heading} className="slm-topic" />
        </div>
        {(overflows || expanded) && (
          <button
            type="button"
            className="slm-question-toggle"
            aria-expanded={expanded}
            aria-controls={regionId}
            onClick={() => setExpanded((open) => !open)}
          >
            {expanded ? 'Show less' : 'Show more'}
            <IconChevronDown width={13} height={13} />
          </button>
        )}
      </div>
    </div>
  );
}

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

  /** Left/Right move between the two views, as a tablist should. */
  function onTabKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    e.stopPropagation();
    const next = view === 'steps' ? 'solution' : 'steps';
    onSetView(next);
    (e.currentTarget.querySelector(`#slm-tab-${next}`) as HTMLElement | null)?.focus();
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
              <div className="slm-tabs" role="tablist" aria-label="Study view" data-view={view} onKeyDown={onTabKeyDown}>
                <span className="slm-tabs-thumb" aria-hidden="true" />
                <button
                  type="button"
                  role="tab"
                  id="slm-tab-steps"
                  aria-controls="slm-panel-steps"
                  aria-selected={view === 'steps'}
                  tabIndex={view === 'steps' ? 0 : -1}
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
                  tabIndex={view === 'solution' ? 0 : -1}
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
              title="Smaller text"
              onClick={() => changeScale(-1)}
              disabled={contentScaleBusy || contentScale <= 1}
            >
              <IconTextSmaller />
            </button>
            <span className="slm-content-scale-divider" aria-hidden="true" />
            <button
              ref={increaseRef}
              type="button"
              className="slm-content-scale-btn"
              aria-label={`Increase content size from level ${contentScale}`}
              title="Larger text"
              onClick={() => changeScale(1)}
              disabled={contentScaleBusy || contentScale >= 5}
            >
              <IconTextLarger />
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
          <span className="slm-header-sep" aria-hidden="true" />
          <button
            type="button"
            className="slm-icon-btn slm-icon-btn--close"
            aria-label="Close panel"
            title="Close panel (Esc)"
            onClick={onClose}
          >
            <IconClose width={18} height={18} />
          </button>
        </div>
      </div>

      {session && <QuestionBlock session={session} />}
    </header>
  );
}
