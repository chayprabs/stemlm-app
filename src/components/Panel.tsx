import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore, useActiveSession } from '@/src/state/store';
import { PanelHeader } from './PanelHeader';
import { StepCard } from './StepCard';
import { ProgressRail } from './ProgressRail';
import { SolutionView } from './SolutionView';
import { Loading } from './Loading';
import { EmptyState } from './EmptyState';
import { SelectionPopover } from './SelectionPopover';
import { IconChevronLeft, IconChevronRight } from './icons';
import { saveSession, isSessionSaved } from '@/src/lib/saved-sessions';
import { setSettings } from '@/src/lib/settings';
import { exportSessionPdf } from '@/src/lib/pdf';
import { trackEvent } from '@/src/lib/analytics';

export function Panel() {
  const {
    panelOpen,
    status,
    errorMessage,
    view,
    theme,
    sessions,
    activeStepIndex,
    settings,
    closePanel,
    setView,
    setActiveStep,
    nextStep,
    prevStep,
    toggleReviewed,
    setActiveSession,
    setSettings: setStoreSettings,
    setTheme,
  } = useStore();
  const session = useActiveSession();
  const [saved, setSaved] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (session) isSessionSaved(session.id).then(setSaved);
    else setSaved(false);
  }, [session?.id]);

  // Focus the panel when it opens so keyboard nav works immediately.
  useEffect(() => {
    if (panelOpen) panelRef.current?.focus();
  }, [panelOpen]);

  if (!panelOpen) return null;

  const total = session?.capsule.steps.length ?? 0;
  const step = session?.capsule.steps[activeStepIndex];
  const reviewedCount = session?.reviewedStepIds.length ?? 0;

  async function onSave() {
    if (!session) return;
    await saveSession(session);
    setSaved(true);
    void trackEvent('session_saved', { platform: session.platform });
  }

  async function onToggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    const updated = await setSettings({ theme: next });
    setStoreSettings(updated);
  }

  async function onExportPdf() {
    if (!session) return;
    await exportSessionPdf(session);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      closePanel();
      return;
    }
    // Don't hijack arrows while the user is selecting/in a control.
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (session && view === 'steps') {
      if (e.key === 'ArrowRight') {
        nextStep();
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        prevStep();
        e.preventDefault();
      }
    }
  }

  return (
    <motion.aside
      ref={panelRef}
      className="slm-panel"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      role="complementary"
      aria-label="stemLM study panel"
    >
      <PanelHeader
        session={session}
        view={view}
        reviewedCount={reviewedCount}
        theme={theme}
        saved={saved}
        onSetView={setView}
        onToggleTheme={onToggleTheme}
        onSave={onSave}
        onExportPdf={onExportPdf}
        onClose={closePanel}
      />

      {sessions.length > 1 && (
        <div className="slm-session-switch">
          {sessions.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`slm-session-pill ${s.id === session?.id ? 'is-active' : ''}`}
              onClick={() => setActiveSession(s.id)}
              title={s.capsule.meta.topic}
            >
              {i + 1}. {s.capsule.meta.topic}
            </button>
          ))}
        </div>
      )}

      {errorMessage && status === 'error' && (
        <div className="slm-banner slm-banner-error" role="alert">
          {errorMessage}
        </div>
      )}

      <div className="slm-body">
        {status === 'loading' && !session && <Loading subject={settings.defaultSubject} />}

        {!session && status !== 'loading' && <EmptyState />}

        {session && view === 'steps' && (
          <div className="slm-steps-layout">
            <ProgressRail
              steps={session.capsule.steps}
              activeIndex={activeStepIndex}
              reviewedIds={session.reviewedStepIds}
              onJump={setActiveStep}
            />
            <div className="slm-steps-main">
              <AnimatePresence mode="wait">
                {step && (
                  <StepCard
                    key={step.id}
                    session={session}
                    index={activeStepIndex}
                    theme={theme}
                    reviewed={session.reviewedStepIds.includes(step.id)}
                    onToggleReviewed={() => {
                      toggleReviewed(step.id);
                      void trackEvent('step_reviewed', { platform: session.platform });
                    }}
                  />
                )}
              </AnimatePresence>

              <footer className="slm-stepnav">
                <button
                  type="button"
                  className="slm-btn slm-btn-ghost"
                  onClick={prevStep}
                  disabled={activeStepIndex === 0}
                  aria-label="Previous step"
                >
                  <IconChevronLeft /> Prev
                </button>
                <span className="slm-stepnav-count">
                  {activeStepIndex + 1} / {total}
                </span>
                <button
                  type="button"
                  className="slm-btn slm-btn-soft"
                  onClick={nextStep}
                  disabled={activeStepIndex >= total - 1}
                  aria-label="Next step"
                >
                  Next <IconChevronRight />
                </button>
              </footer>
            </div>
          </div>
        )}

        {session && view === 'solution' && <SolutionView session={session} theme={theme} />}
      </div>

      {session && (
        <SelectionPopover
          containerRef={panelRef}
          subject={session.capsule.meta.subject}
          stepTitle={view === 'steps' ? step?.title : undefined}
        />
      )}
    </motion.aside>
  );
}
