import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore, useActiveSession } from '@/src/state/store';
import { PanelHeader } from './PanelHeader';
import { StepCard } from './StepCard';
import { StepList } from './StepList';
import { SolutionView } from './SolutionView';
import { Loading } from './Loading';
import { EmptyState } from './EmptyState';
import { SelectionPopover } from './SelectionPopover';
import { ResizeHandle } from './ResizeHandle';
import { IconChevronLeft, IconChevronRight } from './icons';
import { saveSession, deleteSavedSession, isSessionSaved } from '@/src/lib/saved-sessions';
import { StorageQuotaError } from '@/src/lib/storage-errors';
import { setSettings } from '@/src/lib/settings';
import { exportSessionPdf } from '@/src/lib/pdf';
import { trackEvent } from '@/src/lib/analytics';
import { shortcutActionFromEvent, shortcutLabel } from '@/src/lib/keyboard-shortcuts';

function isArrowKey(key: string) {
  return key === 'ArrowLeft' || key === 'ArrowRight';
}

function shouldHandleStepArrow(e: KeyboardEvent, panel: HTMLElement): boolean {
  if (e.repeat) return false;
  if (!isArrowKey(e.key)) return false;
  if (!e.composedPath().includes(panel)) return false;
  const target = e.target as HTMLElement | null;
  const tag = target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return false;
  if (target?.isContentEditable) return false;
  const sel = window.getSelection();
  if (sel && !sel.isCollapsed && panel.contains(sel.anchorNode)) return false;
  return true;
}

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
    splitRatio,
  } = useStore();
  const session = useActiveSession();
  const [saved, setSaved] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!session) {
      setSaved(false);
      return;
    }
    const id = session.id;
    let cancelled = false;
    void isSessionSaved(id).then((value) => {
      if (!cancelled) setSaved(value);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  // Focus the panel when it opens so keyboard nav works immediately.
  useEffect(() => {
    if (panelOpen) panelRef.current?.focus({ preventScroll: true });
  }, [panelOpen]);

  // Make the panel responsive to its own (variable) width: tag it narrow/mid/
  // wide so CSS can adapt layout density independent of the viewport.
  useEffect(() => {
    const el = panelRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const apply = (w: number) => {
      el.dataset.width = w < 430 ? 'narrow' : w < 640 ? 'mid' : 'wide';
    };
    apply(el.getBoundingClientRect().width);
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) apply(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [panelOpen]);

  const total = session?.capsule.steps.length ?? 0;
  const step = session?.capsule.steps[activeStepIndex];
  const reviewedCount = session?.reviewedStepIds.length ?? 0;
  async function onToggleSave() {
    if (!session) return;
    try {
      if (saved) {
        await deleteSavedSession(session.id);
        setSaved(false);
        void trackEvent('session_unsaved', { platform: session.platform });
        return;
      }
      const { prunedCount } = await saveSession(session);
      setSaved(true);
      void trackEvent('session_saved', { platform: session.platform });
      if (prunedCount > 0) {
        useStore
          .getState()
          .setStatus(
            'ready',
            `Saved. Removed ${prunedCount} older save${prunedCount === 1 ? '' : 's'} to free storage.`,
          );
      }
    } catch (err) {
      if (!saved) setSaved(false);
      const msg =
        err instanceof StorageQuotaError
          ? err.message
          : saved
            ? 'Could not remove saved session. Try again.'
            : 'Could not save session. Try again.';
      useStore.getState().setStatus('error', msg);
    }
  }

  async function onToggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    const updated = await setSettings({ theme: next });
    setStoreSettings(updated);
  }

  async function onExportPdf() {
    if (!session) return;
    const result = await exportSessionPdf(session);
    if (!result.ok) {
      useStore.getState().setStatus('error', 'PDF export failed. Try again or use Print from the dialog.');
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      closePanel();
      return;
    }
    if (!session || view !== 'steps') return;
    const panel = panelRef.current;
    if (!panel || !shouldHandleStepArrow(e.nativeEvent, panel)) return;
    if (e.key === 'ArrowRight') {
      nextStep();
      e.preventDefault();
      e.stopPropagation();
    } else if (e.key === 'ArrowLeft') {
      prevStep();
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function runShortcutAction(action: ReturnType<typeof shortcutActionFromEvent>): boolean {
    if (!action || action === 'toggle-panel') return false;
    if (action === 'toggle-theme') {
      void onToggleTheme();
      return true;
    }
    if (!session) return false;
    if (action === 'previous-step') {
      setView('steps');
      prevStep();
      return true;
    }
    if (action === 'next-step') {
      setView('steps');
      nextStep();
      return true;
    }
    if (action === 'steps-view') {
      setView('steps');
      return true;
    }
    if (action === 'solution-view') {
      setView('solution');
      return true;
    }
    if (action === 'toggle-reviewed') {
      const activeStep = session.capsule.steps[activeStepIndex];
      if (!activeStep) return false;
      toggleReviewed(activeStep.id);
      void trackEvent('step_reviewed', { platform: session.platform });
      return true;
    }
    if (action === 'toggle-save') {
      void onToggleSave();
      return true;
    }
    if (action === 'export-pdf') {
      void onExportPdf();
      return true;
    }
    return false;
  }

  useEffect(() => {
    if (!panelOpen) return;
    const onDocumentKeyDown = (e: KeyboardEvent) => {
      const action = shortcutActionFromEvent(e);
      if (!runShortcutAction(action)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener('keydown', onDocumentKeyDown, true);
    return () => document.removeEventListener('keydown', onDocumentKeyDown, true);
  }, [panelOpen, session, activeStepIndex, view, theme, saved]);

  function onPanelPointerDown(e: React.PointerEvent) {
    if (panelRef.current?.contains(e.target as Node)) {
      panelRef.current.focus({ preventScroll: true });
    }
  }

  return (
    <motion.aside
      ref={panelRef}
      className="slm-panel"
      style={{ width: `${(splitRatio * 100).toFixed(3)}vw` }}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onPointerDown={onPanelPointerDown}
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      role="complementary"
      aria-label="stemLM study panel"
    >
      <ResizeHandle />
      <PanelHeader
        session={session}
        view={view}
        reviewedCount={reviewedCount}
        theme={theme}
        saved={saved}
        onSetView={setView}
        onToggleTheme={onToggleTheme}
        onToggleSave={onToggleSave}
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

      {errorMessage && (
        <div
          className={`slm-banner ${status === 'error' ? 'slm-banner-error' : 'slm-banner-info'}`}
          role={status === 'error' ? 'alert' : 'status'}
        >
          {errorMessage}
        </div>
      )}

      <div className="slm-body">
        {status === 'loading' && !session && <Loading />}

        {!session && status !== 'loading' && <EmptyState />}

        {session && view === 'steps' && (
          <div className="slm-steps-hero" role="tabpanel" id="slm-panel-steps" aria-labelledby="slm-tab-steps">
            <div className="slm-steps-layout">
              <StepList
                steps={session.capsule.steps}
                activeIndex={activeStepIndex}
                reviewedIds={session.reviewedStepIds}
                onSelect={setActiveStep}
              />
              <div className="slm-steps-detail">
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

              <footer className="slm-stepnav slm-stepnav--sticky">
                <button
                  type="button"
                  className="slm-btn slm-btn-ghost"
                  onClick={prevStep}
                  disabled={activeStepIndex === 0}
                  aria-label={`Previous step (${shortcutLabel('previous-step')})`}
                  title={`Previous step (${shortcutLabel('previous-step')})`}
                >
                  <IconChevronLeft /> Prev
                </button>
                <span
                  className="slm-stepnav-count"
                  title={`Use Left/Right arrows or ${shortcutLabel('previous-step')} / ${shortcutLabel('next-step')}`}
                >
                  {activeStepIndex + 1} / {total}
                </span>
                <button
                  type="button"
                  className="slm-btn slm-btn-soft"
                  onClick={nextStep}
                  disabled={activeStepIndex >= total - 1}
                  aria-label={`Next step (${shortcutLabel('next-step')})`}
                  title={`Next step (${shortcutLabel('next-step')})`}
                >
                  Next <IconChevronRight />
                </button>
              </footer>
              </div>
            </div>
          </div>
        )}

        {session && view === 'solution' && (
          <div role="tabpanel" id="slm-panel-solution" aria-labelledby="slm-tab-solution">
            <SolutionView session={session} theme={theme} />
          </div>
        )}
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
