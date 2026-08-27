import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore, useActiveSession } from '@/src/state/store';
import { PanelHeader } from './PanelHeader';
import { StepCard } from './StepCard';
import { StepList } from './StepList';
import { FollowupCard } from './FollowupCard';
import { buildStepEntries, SOLUTION_ANCHOR_ID } from '@/src/lib/step-entries';
import { SolutionView } from './SolutionView';
import { Loading } from './Loading';
import { EmptyState } from './EmptyState';
import { SelectionPopover } from './SelectionPopover';
import { ResizeHandle } from './ResizeHandle';
import { IconClose, IconNavNext, IconNavPrev } from './icons';
import {
  saveSession,
  deleteSavedSession,
  isSessionSaved,
  refreshSavedSession,
} from '@/src/lib/saved-sessions';
import { StorageQuotaError } from '@/src/lib/storage-errors';
import { setSettings } from '@/src/lib/settings';
import { exportSessionPdf } from '@/src/lib/pdf';
import { trackEvent } from '@/src/lib/analytics';
import { applyTheme } from '@/src/lib/theme';

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
    closePanel,
    setView,
    setActiveStep,
    nextStep,
    prevStep,
    setActiveSession,
    removeSession,
    setSettings: setStoreSettings,
    setTheme,
    splitRatio,
  } = useStore();
  const session = useActiveSession();
  const [saved, setSaved] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  /** Ignore in-flight isSessionSaved results after a session switch or Save toggle. */
  const saveEpoch = useRef(0);

  useEffect(() => {
    if (!session) {
      setSaved(false);
      return;
    }
    const current = session;
    const epoch = ++saveEpoch.current;
    let cancelled = false;
    void (async () => {
      const already = await isSessionSaved(current.id);
      if (cancelled || epoch !== saveEpoch.current) return;
      setSaved(already);
      if (!already) return;
      try {
        await refreshSavedSession(current);
      } catch {
        /* keep the previous snapshot if auto-refresh fails */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  // Focus the panel when it opens so keyboard nav works immediately.
  useEffect(() => {
    if (panelOpen) panelRef.current?.focus({ preventScroll: true });
  }, [panelOpen]);

  useEffect(() => {
    const el = panelRef.current;
    if (el) applyTheme(el, theme);
  }, [theme, panelOpen]);

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

  const entries = useMemo(() => buildStepEntries(session), [session]);
  const total = entries.length;
  const activeEntry = entries[activeStepIndex];
  const step =
    activeEntry?.kind === 'step'
      ? activeEntry.step
      : activeEntry?.kind === 'followup'
        ? session?.capsule.steps[activeEntry.anchorStepIndex]
        : undefined;
  async function onToggleSave() {
    if (!session) return;
    saveEpoch.current += 1;
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

  function onPanelPointerDown(e: React.PointerEvent) {
    if (panelRef.current?.contains(e.target as Node)) {
      panelRef.current.focus({ preventScroll: true });
    }
  }

  return (
    <motion.aside
      ref={panelRef}
      className="slm-panel"
      data-stemlm-theme={theme}
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
            <div
              key={s.id}
              className={`slm-session-chip ${s.id === session?.id ? 'is-active' : ''}`}
            >
              <button
                type="button"
                className={`slm-session-pill ${s.id === session?.id ? 'is-active' : ''}`}
                onClick={() => setActiveSession(s.id)}
                title={s.capsule.meta.topic}
              >
                {i + 1}. {s.capsule.meta.topic}
              </button>
              <button
                type="button"
                className="slm-session-pill-remove"
                title="Remove question"
                aria-label={`Remove ${s.capsule.meta.topic}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeSession(s.id);
                }}
              >
                <span className="slm-session-pill-remove-hit" aria-hidden="true">
                  <IconClose width={12} height={12} strokeWidth={2.25} />
                </span>
              </button>
            </div>
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
        {status === 'loading' && !session && <Loading theme={theme} />}

        {!session && status !== 'loading' && <EmptyState />}

        {session && view === 'steps' && (
          <div className="slm-steps-hero" role="tabpanel" id="slm-panel-steps" aria-labelledby="slm-tab-steps">
            <div className="slm-steps-layout">
              <StepList
                entries={entries}
                activeIndex={activeStepIndex}
                onSelect={setActiveStep}
              />
              <div className="slm-steps-detail">
                <div className="slm-read">
                  <AnimatePresence mode="wait">
                    {activeEntry?.kind === 'step' && (
                      <StepCard
                        key={activeEntry.key}
                        session={session}
                        index={activeEntry.stepIndex}
                        theme={theme}
                      />
                    )}
                    {activeEntry?.kind === 'followup' && (
                      <FollowupCard
                        key={activeEntry.key}
                        session={session}
                        followup={activeEntry.followup}
                        anchorStepNumber={activeEntry.anchorStepIndex + 1}
                        ordinal={activeEntry.ordinal}
                        theme={theme}
                      />
                    )}
                  </AnimatePresence>
                </div>

                <footer className="slm-stepnav slm-stepnav--overlay" aria-label="Step navigation">
                  <button
                    type="button"
                    className="slm-stepnav-btn"
                    onClick={prevStep}
                    disabled={activeStepIndex === 0}
                    aria-label="Previous step"
                  >
                    <IconNavPrev /> Prev
                  </button>
                  <button
                    type="button"
                    className="slm-stepnav-btn"
                    onClick={nextStep}
                    disabled={activeStepIndex >= total - 1}
                    aria-label="Next step"
                  >
                    Next <IconNavNext />
                  </button>
                </footer>
              </div>
            </div>
          </div>
        )}

        {session && view === 'solution' && (
          <div
            className="slm-solution-wrap"
            role="tabpanel"
            id="slm-panel-solution"
            aria-labelledby="slm-tab-solution"
          >
            <SolutionView session={session} theme={theme} />
          </div>
        )}
      </div>

      {session && (
        <SelectionPopover
          containerRef={panelRef}
          subject={session.capsule.meta.subject}
          stepTitle={view === 'steps' ? step?.title : undefined}
          intent={view === 'solution' ? 'ask-solution' : 'ask'}
          anchor={
            view === 'steps' && step
              ? { sessionId: session.id, anchorStepId: step.id }
              : { sessionId: session.id, anchorStepId: SOLUTION_ANCHOR_ID }
          }
        />
      )}
    </motion.aside>
  );
}
