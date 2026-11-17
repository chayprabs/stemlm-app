import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useStore, useActiveSession, chatSessions } from '@/src/state/store';
import { PanelHeader } from './PanelHeader';
import { StepCard } from './StepCard';
import { StepList } from './StepList';
import { FollowupCard } from './FollowupCard';
import { buildStepEntries, SOLUTION_ANCHOR_ID } from '@/src/lib/step-entries';
import { SolutionView } from './SolutionView';
import { Loading } from './Loading';
import { EmptyState } from './EmptyState';
import { useViewportWidth } from './use-viewport-width';
import { isOverlayViewport, layoutPanelWidthVw } from '@/src/lib/split-ratio';
import { ErrorBanner } from './ErrorBanner';
import { ErrorBoundary } from './ErrorBoundary';
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
import { normalizeContentScale, setSettings } from '@/src/lib/settings';
import { requestSessionPdf } from '@/src/lib/pdf-export-request';
import { trackEvent } from '@/src/lib/analytics';
import { applyTheme } from '@/src/lib/theme';
import { unlessUpdated } from '@/src/lib/extension-context';
import { panelSelectionRange, selectionText } from '@/src/lib/followup-selection';
import { focusPanel } from './move-focus';
import { panelMotion, type StepDirection } from './step-motion';

function isArrowKey(key: string) {
  return key === 'ArrowLeft' || key === 'ArrowRight';
}

/** What has focus, looked up through shadow roots: from the page, focus inside the panel reads as its host element. */
function focusedElement(): Element | null {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

/** A text field the student has typed in. */
function holdsDraft(el: Element | null): boolean {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el.value.trim() !== '';
  return el instanceof HTMLElement && el.isContentEditable && (el.textContent ?? '').trim() !== '';
}

/** A locale the model wrote, kept only when it reads as a language tag (`en`, `pt-BR`). */
function answerLang(locale: string | undefined): string | undefined {
  const tag = locale?.trim().replace('_', '-');
  return tag && /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(tag) ? tag : undefined;
}

function shouldHandleStepArrow(e: KeyboardEvent, panel: HTMLElement): boolean {
  if (e.repeat) return false;
  if (!isArrowKey(e.key)) return false;
  if (!e.composedPath().includes(panel)) return false;
  const target = e.target as HTMLElement | null;
  const tag = target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return false;
  if (target?.isContentEditable) return false;
  // Text is selected in the panel: the arrows belong to the selection, not to the pages.
  return panelSelectionRange(panel) === null;
}

export function Panel() {
  const {
    panelOpen,
    panelTakesFocus,
    status,
    errorMessage,
    view,
    theme,
    sessions: allSessions,
    chat,
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
    hostSidebarPx,
    settings,
    writingId,
  } = useStore();
  // Questions belong to the chat they were asked in: the strip shows this chat's.
  const sessions = useMemo(() => chatSessions({ sessions: allSessions, chat }), [allSessions, chat]);
  const session = useActiveSession();
  const reducedMotion = useReducedMotion();
  const viewport = useViewportWidth();
  const [saved, setSaved] = useState(false);
  const [contentScaleBusy, setContentScaleBusy] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
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

  // Focus moves into the panel when the student opens it (the stemlm button, the toolbar popup)
  // and back to the opener when it closes, but it is never taken from where the student is
  // working: a panel that opens by itself on an answer leaves the keyboard in the chat box, a
  // half-typed chat message is left alone, and closing leaves focus that has since moved on.
  useEffect(() => {
    const panel = panelRef.current;
    const active = focusedElement();
    if (panelOpen) {
      if (panel?.contains(active)) return;
      openerRef.current = active instanceof HTMLElement ? active : null;
      if (panelTakesFocus && !holdsDraft(active)) focusPanel(panel);
    } else {
      if (openerRef.current?.isConnected && panel?.contains(active)) openerRef.current.focus({ preventScroll: true });
      openerRef.current = null;
    }
  }, [panelOpen, panelTakesFocus]);

  // Focus parked on the panel while there was nothing to read moves to the reading area when it
  // arrives (an answer loaded, the other view chosen), so the keys that scroll have something to scroll.
  useEffect(() => {
    if (focusedElement() === panelRef.current) focusPanel(panelRef.current);
  }, [session?.id, view]);

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
  // Which way the reader last moved; a page arrives from that side. Derived during render so the
  // very first animation after a move already knows its direction.
  const travel = useRef<{ index: number; direction: StepDirection }>({ index: activeStepIndex, direction: 1 });
  if (travel.current.index !== activeStepIndex) {
    travel.current = { index: activeStepIndex, direction: activeStepIndex > travel.current.index ? 1 : -1 };
  }
  const direction = travel.current.direction;
  const readRef = useRef<HTMLDivElement>(null);
  const switchRef = useRef<HTMLDivElement>(null);
  // The question being read is never off the end of a narrow question strip. Only the strip scrolls.
  useEffect(() => {
    const strip = switchRef.current;
    const chip = strip?.querySelector('.slm-session-chip.is-active');
    if (!strip || !chip) return;
    const box = strip.getBoundingClientRect();
    const at = chip.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(strip).paddingLeft) || 0;
    const left = at.left < box.left + pad ? at.left - box.left - pad : at.right > box.right - pad ? at.right - box.right + pad : 0;
    if (left) strip.scrollBy?.({ left });
  }, [session?.id, sessions.length]);
  // A new step starts at its top, wherever the previous one was scrolled to.
  // A short panel scrolls as a whole (assets/panel.css): there the strip comes back under the bar.
  useEffect(() => {
    readRef.current?.scrollTo?.({ top: 0 });
    const panel = panelRef.current;
    const strip = panel?.querySelector('.slm-step-rail');
    const bar = panel?.querySelector('.slm-header-bar');
    if (!panel?.scrollTop || !strip || !bar) return;
    const above = strip.getBoundingClientRect().top - bar.getBoundingClientRect().bottom;
    if (above < 0) panel.scrollBy?.({ top: above });
  }, [activeStepIndex, session?.id]);
  // The page reserves a gutter for its scrollbar where scrollbars take room. The step strip above
  // it has none, so it is told the width and can stay exactly on the reading column's edge.
  const hasReadingPage = Boolean(session) && view === 'steps';
  useLayoutEffect(() => {
    const read = readRef.current;
    const panel = panelRef.current;
    if (!read || !panel) return;
    panel.style.setProperty('--slm-scroll-gutter', `${Math.max(0, read.offsetWidth - read.clientWidth)}px`);
  }, [hasReadingPage, panelOpen]);
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
        if (useStore.getState().activeSessionId === session.id) setSaved(false);
        void trackEvent('session_unsaved', { platform: session.platform });
        return;
      }
      await saveSession(session);
      void trackEvent('session_saved', { platform: session.platform });
      if (useStore.getState().activeSessionId !== session.id) return;
      setSaved(true);
    } catch (err) {
      if (useStore.getState().activeSessionId !== session.id) return;
      if (!saved) setSaved(false);
      const msg =
        err instanceof StorageQuotaError
          ? err.message
          : saved
            ? 'Could not remove the saved question. Try again.'
            : 'Could not save the question. Try again.';
      useStore.getState().setStatus('error', unlessUpdated(msg));
    }
  }

  async function onToggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      const updated = await setSettings({ theme: next });
      setStoreSettings(updated);
    } catch {
      setTheme(theme);
      useStore.getState().setStatus('error', 'Could not save theme. Try again.');
    }
  }

  async function onChangeContentScale(direction: -1 | 1) {
    if (contentScaleBusy) return;
    const previous = settings.contentScale;
    const next = normalizeContentScale(previous + direction);
    if (next === previous) return;
    setContentScaleBusy(true);
    setStoreSettings({ ...settings, contentScale: next });
    try {
      const updated = await setSettings({ contentScale: next });
      setStoreSettings(updated);
    } catch {
      setStoreSettings({ ...settings, contentScale: previous });
      useStore.getState().setStatus('error', 'Could not save the text size. Try again.');
    } finally {
      setContentScaleBusy(false);
    }
  }

  async function onExportPdf() {
    if (!session) return;
    // pdf.html builds and downloads the file in its own window (D7).
    if (await requestSessionPdf(session)) return;
    if (useStore.getState().status !== 'error') {
      useStore.getState().setStatus('error', unlessUpdated('Could not start the PDF export. Reload this tab and try again.'));
    }
  }

  // A key pressed in the panel is the panel's. Left to bubble, the chat page acts on it too:
  // its own Escape and shortcuts fire, and a page that sends stray typing to its chat box takes
  // the keyboard away from the follow-up field.
  function keepFromPage(e: React.KeyboardEvent) {
    e.stopPropagation();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    keepFromPage(e);
    if (e.key === 'Escape') {
      // Escape that cancels an IME composition is not a request to leave.
      if (!e.nativeEvent.isComposing) closePanel();
      return;
    }
    if (!session || view !== 'steps') return;
    const panel = panelRef.current;
    if (!panel || !shouldHandleStepArrow(e.nativeEvent, panel)) return;
    if (e.key === 'ArrowRight') {
      nextStep();
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      prevStep();
      e.preventDefault();
    }
  }

  // A formula is drawn as a stack of positioned spans: copied as the browser reads it, it is one
  // symbol per line. A selection that holds maths goes to the clipboard with each formula as its
  // LaTeX; plain text is left to the browser.
  function onCopy(e: React.ClipboardEvent) {
    const panel = panelRef.current;
    if (!panel || (e.target as HTMLElement).closest?.('input, textarea')) return;
    const range = panelSelectionRange(panel);
    const copied = range && selectionText(range);
    if (!copied?.hasMath) return;
    e.clipboardData.setData('text/plain', copied.text);
    e.preventDefault();
  }

  function onPanelPointerDown(e: React.PointerEvent) {
    const target = e.target as HTMLElement | null;
    if (!target || !panelRef.current?.contains(target)) return;
    if (target.closest('button,a,input,textarea,select,[contenteditable="true"],[role="button"],[role="separator"]')) return;
    focusPanel(panelRef.current);
  }

  return (
    <motion.aside
      ref={panelRef}
      className="slm-panel"
      data-stemlm-theme={theme}
      data-content-scale={settings.contentScale}
      style={{ width: `${layoutPanelWidthVw(splitRatio, viewport, hostSidebarPx)}vw` }}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onKeyUp={keepFromPage}
      onCopy={onCopy}
      onPointerDown={onPanelPointerDown}
      {...panelMotion(Boolean(reducedMotion))}
      role="complementary"
      aria-label="stemLM study panel"
      // The answer's language when the model named it, else the chat page's.
      lang={answerLang(session?.capsule.meta.locale) ?? (document.documentElement.lang || undefined)}
    >
      {!isOverlayViewport(viewport) && <ResizeHandle />}
      <PanelHeader
        session={session}
        view={view}
        theme={theme}
        saved={saved}
        contentScale={settings.contentScale}
        contentScaleBusy={contentScaleBusy}
        onChangeContentScale={onChangeContentScale}
        onSetView={setView}
        onToggleTheme={onToggleTheme}
        onToggleSave={onToggleSave}
        onExportPdf={onExportPdf}
        onClose={closePanel}
      >
        {sessions.length > 1 && (
          <div className="slm-session-switch" ref={switchRef} role="group" aria-label="Questions in this chat">
            {sessions.map((s, i) => (
              <div
                key={s.id}
                className={`slm-session-chip ${s.id === session?.id ? 'is-active' : ''}`}
              >
                <button
                  type="button"
                  className={`slm-session-pill ${s.id === session?.id ? 'is-active' : ''}`}
                  onClick={() => setActiveSession(s.id)}
                  aria-current={s.id === session?.id ? 'true' : undefined}
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
      </PanelHeader>

      {errorMessage && <ErrorBanner message={errorMessage} tone={status === 'error' ? 'error' : 'info'} />}
      {/* The chat has not finished this answer: the steps shown are the ones it has finished. */}
      {session && session.id === writingId && (
        <div className="slm-banner slm-banner-info" role="status">
          <span>The chat is still writing this answer. Each step appears here when it is finished.</span>
        </div>
      )}

      <div className="slm-body">
        {/* What is drawn from an answer can fail to render. It fails here, inside the frame: the
            header keeps its close button and the composer control outside the panel is untouched.
            Another question or the other view starts clean. */}
        <ErrorBoundary key={`${session?.id}:${view}`}>
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
                  {/* The element that scrolls holds the focus, so the keyboard scrolls it. */}
                  <div className="slm-read" ref={readRef} tabIndex={0} role="region" aria-label="Step text">
                    <AnimatePresence mode="wait" custom={direction} initial={false}>
                      {activeEntry?.kind === 'step' && (
                        <StepCard
                          key={activeEntry.key}
                          session={session}
                          index={activeEntry.stepIndex}
                          theme={theme}
                          direction={direction}
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
                          direction={direction}
                        />
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="slm-stepnav-slot">
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
                        className="slm-stepnav-btn slm-stepnav-btn--next"
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
            </div>
          )}

          {session && view === 'solution' && (
            <div
              className="slm-solution-wrap"
              role="tabpanel"
              id="slm-panel-solution"
              aria-labelledby="slm-tab-solution"
              tabIndex={0}
            >
              <SolutionView session={session} theme={theme} />
            </div>
          )}
        </ErrorBoundary>
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
