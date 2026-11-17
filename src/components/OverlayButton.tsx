import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type SyntheticEvent } from 'react';
import { useStore } from '@/src/state/store';
import { getController, type AttachNotice } from '@/src/content/controller';
import { detectAdapter } from '@/src/platforms/detect';
import { injectControlEnabled } from '@/src/platforms/routes';
import {
  composerTextHasProtocol,
  pageThreadHasProtocol,
  shouldReinjectOnNewQuestion,
} from '@/src/protocol/builder';
import { cleanSessionQuestion } from '@/src/lib/session-question';
import { injectControlCss } from '@/src/lib/inject-control-css';
import { noteSlot, trackComposerControl, type ControlPlacement } from '@/src/lib/composer-anchor';
import { dismissFirstRunHint, firstRunHintPending, onFirstRunHintDismissed } from '@/src/lib/first-run-hint';
import { InjectGlyph, InjectSpinner } from './InjectGlyph';
import { IconClose } from './icons';

/** The control's rules, for the shadow root it is drawn in. */
const CONTROL_CSS = injectControlCss('', (scheme) => `.slm-fab-wrap[data-scheme="${scheme}"]`);
const PANEL_UNAVAILABLE = "stemLM couldn't open its panel. Refresh this tab.";
/** How long a line about the last press stays beside the control. */
const NOTICE_MS = 7000;

/** Put the control's box on its anchor. Written to the element: a position is not React state. */
function paint(wrap: HTMLElement | null, place: ControlPlacement | null): void {
  if (!wrap || !place) return;
  wrap.style.left = `${place.left}px`;
  wrap.style.top = `${place.top}px`;
  wrap.style.setProperty('--slm-inject-size', `${place.size}px`);
  wrap.style.setProperty('--slm-inject-radius', place.radius);
  if (place.ink) wrap.style.setProperty('--slm-inject-host-ink', place.ink);
  else wrap.style.removeProperty('--slm-inject-host-ink');
  wrap.dataset.scheme = place.scheme;
  // The line about the control goes above it, or below when the composer is at the top of the window.
  wrap.dataset.tip = place.top < 56 ? 'below' : 'above';
  // The first-run hint keeps clear of the chat box and the chat's controls; with no such place it waits unseen.
  const hint = wrap.querySelector<HTMLElement>('.slm-first-hint');
  if (!hint) return;
  const slot = noteSlot(place, detectAdapter()?.findEditor() ?? null, hint.offsetWidth, hint.offsetHeight);
  if (!slot) {
    delete hint.dataset.side;
    return;
  }
  hint.dataset.side = slot.top > place.top ? 'below' : 'above';
  hint.style.left = `${slot.left}px`;
  hint.style.top = `${slot.top}px`;
  hint.style.setProperty('--slm-hint-caret', `${place.left + place.size / 2 - slot.left}px`);
}

/**
 * The control exists only while the chat's own attach button can be vouched for; its place is
 * that button's (src/lib/composer-anchor.ts). Returns the element to draw into, or null.
 */
function useComposerPlace(enabled: boolean) {
  const host = detectAdapter()?.id;
  const wrapRef = useRef<HTMLDivElement>(null);
  const place = useRef<ControlPlacement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const adapter = detectAdapter();
    if (!adapter || !enabled) return;
    const stop = trackComposerControl(
      adapter,
      () => injectControlEnabled(adapter.id, location.pathname),
      (next) => {
        place.current = next;
        paint(wrapRef.current, next);
        setShown(next !== null);
      },
    );
    return () => {
      stop();
      place.current = null;
      setShown(false);
    };
  }, [host, enabled]);

  useLayoutEffect(() => paint(wrapRef.current, place.current), [shown]);

  return { shown: shown && enabled, wrapRef, place };
}

/** Events on the control stay stemLM's: the chat's page-wide listeners never see them. */
const keepFromHost = (event: SyntheticEvent) => event.stopPropagation();

export function OverlayButton({ panelUnavailable = false }: { panelUnavailable?: boolean }) {
  const stemlmEnabled = useStore((s) => s.settings.stemlmEnabled !== false);
  const { shown, wrapRef, place } = useComposerPlace(stemlmEnabled);
  const [pasting, setPasting] = useState(false);
  const [notice, setNotice] = useState<AttachNotice | null>(null);
  const injected = useStore((s) => s.buttonInjected);
  const panelOpen = useStore((s) => s.panelOpen);
  const togglePanel = useStore((s) => s.togglePanel);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pastingRef = useRef(false);
  const [hint, setHint] = useState(false);

  const adapter = detectAdapter();

  // Once after install, the control says how it is used, until it is pressed or the hint is closed.
  useEffect(() => {
    if (!shown) return;
    let live = true;
    void firstRunHintPending().then((pending) => live && setHint(pending));
    const stop = onFirstRunHintDismissed(() => setHint(false));
    return () => {
      live = false;
      stop();
    };
  }, [shown]);

  const hintShown = hint && !injected && !pasting;
  // The hint follows the control, and the chat box it keeps clear of, which grows as the question is typed.
  useLayoutEffect(() => {
    if (!hintShown) return;
    const repaint = () => paint(wrapRef.current, place.current);
    repaint();
    const editor = adapter?.findEditor();
    if (!editor || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(repaint);
    observer.observe(editor);
    return () => observer.disconnect();
  }, [hintShown]);

  function dismissHint() {
    setHint(false);
    dismissFirstRunHint();
  }

  useEffect(() => {
    if (!injected || !adapter) return;
    const ctrl = getController();
    if (!ctrl) return;

    const tick = () => {
      const text = adapter.getEditorText().trim();
      // The chat clears its box when the message is sent (or the student clears it): either
      // way stemlm is no longer on for a draft, and the control goes back to the mark.
      if (text.length === 0) {
        ctrl.resetInjection();
        return;
      }
      if (useStore.getState().status === 'loading') return;
      const last = ctrl.getLastQuestion().trim();
      const hasProtocol = composerTextHasProtocol(text);
      if (!hasProtocol && last.length > 0 && text !== last) {
        ctrl.resetInjection();
      }
    };

    const id = window.setInterval(tick, 500);
    return () => clearInterval(id);
  }, [injected, adapter]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(id);
  }, [notice]);

  // The control is drawn outside the chat's tree, so the keyboard is led to it: Tab from the
  // chat's attach button lands here (and Tab or Shift+Tab here goes on from that button, below).
  useEffect(() => {
    if (!shown) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const anchor = place.current?.anchor;
      if (event.key !== 'Tab' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
      if (!anchor || document.activeElement !== anchor || !buttonRef.current) return;
      event.preventDefault();
      buttonRef.current.focus();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [shown, place]);

  function onMain() {
    if (pastingRef.current) return;
    if (hint) dismissHint();
    const ctrl = getController();
    if (!ctrl) return;
    const text = adapter?.getEditorText().trim() ?? '';
    const question = cleanSessionQuestion(text);
    const last = ctrl?.getLastQuestion().trim() ?? '';
    const hasProtocol =
      composerTextHasProtocol(text) ||
      pageThreadHasProtocol(document, adapter?.findEditor() ?? null);
    if (
      injected &&
      !shouldReinjectOnNewQuestion({
        buttonInjected: true,
        question,
        lastQuestion: last,
        hasProtocol,
      })
    ) {
      togglePanel();
      return;
    }
    pastingRef.current = true;
    setPasting(true);
    setNotice(null);
    void (async () => {
      try {
        await ctrl.inject();
        setNotice(ctrl.takeAttachNotice());
      } catch {
        useStore.getState().setStatus('error', 'Could not finish attaching the stemLM guide. Try the stemLM button again.');
        setNotice({ tone: 'error', text: 'stemLM could not add its guide. Try again.' });
      } finally {
        pastingRef.current = false;
        setPasting(false);
      }
    })();
  }

  /** Tab moves on from the chat's attach button, which the control sits beside; Shift+Tab returns to it. */
  function onKeyDown(event: KeyboardEvent) {
    event.stopPropagation();
    if (event.key === 'Escape' && hintShown) {
      dismissHint();
      return;
    }
    const anchor = place.current?.anchor;
    if (event.key !== 'Tab' || !anchor?.isConnected) return;
    if (event.shiftKey) event.preventDefault();
    anchor.focus();
  }

  if (!shown) return null;

  const failed = !pasting && notice?.tone === 'error';
  const state = pasting ? 'busy' : failed ? 'error' : injected ? 'attached' : 'idle';
  const label = pasting
    ? 'Attaching the stemLM guide'
    : panelUnavailable
      ? PANEL_UNAVAILABLE
      : injected
        ? `stemLM is on for this question. ${panelOpen ? 'Close' : 'Open'} the panel`
        : 'Add the stemLM guide to this question';
  const stateClass = pasting ? 'is-loading' : failed ? 'is-error' : injected ? (panelOpen ? 'is-panel-open' : 'is-attached') : '';

  return (
    <div
      ref={wrapRef}
      className={`slm-fab-wrap${hintShown ? ' has-hint' : ''}`}
      onClick={keepFromHost}
      onPointerDown={keepFromHost}
      onMouseDown={keepFromHost}
    >
      <style>{CONTROL_CSS}</style>
      <button
        ref={buttonRef}
        type="button"
        className={`slm-inject-btn ${stateClass}`}
        data-stemlm-inject="true"
        data-state={state}
        data-glyph={failed ? 'alert' : injected ? 'tick' : 'mark'}
        onClick={onMain}
        onKeyDown={onKeyDown}
        aria-label={label}
        aria-describedby={hintShown ? 'slm-first-hint-text' : undefined}
        aria-pressed={injected}
        aria-busy={pasting}
        aria-disabled={pasting}
      >
        {pasting ? <InjectSpinner /> : <InjectGlyph attached={injected} failed={failed} />}
      </button>
      {/* What the control does, in the words of its name; after a press, a line about what happened,
          which stays open for a few seconds and is announced by the status below. */}
      <span className={`slm-inject-tip ${notice && !pasting ? 'is-open' : ''}`} aria-hidden="true">
        {(!pasting && notice?.text) || label}
      </span>
      <span className="slm-inject-live" role="status" aria-live="polite">
        {pasting ? 'Attaching the stemLM guide' : notice ? notice.text : panelUnavailable ? PANEL_UNAVAILABLE : injected ? 'stemLM is on for this question' : ''}
      </span>
      {hintShown && (
        <div className="slm-first-hint">
          <span id="slm-first-hint-text">Type your question, press this, then Send.</span>
          <button type="button" className="slm-first-hint-close" aria-label="Close tip" onClick={dismissHint}>
            <IconClose width={14} height={14} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}
