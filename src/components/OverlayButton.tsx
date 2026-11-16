import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/src/state/store';
import { getController } from '@/src/content/controller';
import { detectAdapter } from '@/src/platforms/detect';
import { injectControlEnabled, watchComposerRoute } from '@/src/platforms/routes';
import {
  composerTextHasProtocol,
  pageThreadHasProtocol,
  shouldReinjectOnNewQuestion,
} from '@/src/protocol/builder';
import { cleanSessionQuestion } from '@/src/lib/session-question';
import { detectHostScheme } from '@/src/lib/theme';
import { injectControlCss } from '@/src/lib/inject-control-css';
import {
  ensureComposerSlot,
  isolateStemLmPointer,
  outsideShellCoords,
  removeComposerSlot,
  resolveComposerFrame,
  syncComposerSlotGeometry,
} from '@/src/lib/composer-slot';

const BTN_SIZE = 32;
/** The control's rules for the shadow root, where it lives when no composer slot can be docked. */
const SHADOW_CONTROL_CSS = injectControlCss('', (scheme) => `.slm-fab-wrap--${scheme}`);
const DOCK_RETRY_MS = 400;
const FIXED_FALLBACK_MS = 900;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function fixedCoords(adapter: NonNullable<ReturnType<typeof detectAdapter>>): {
  top: number;
  left: number;
} {
  const PAD = 8;
  const leading = adapter.getComposerLeadingAnchor();
  const leadingR = leading?.isConnected ? leading.getBoundingClientRect() : undefined;
  const frame = resolveComposerFrame(adapter);
  const frameR = frame?.isConnected ? frame.getBoundingClientRect() : undefined;
  if (frameR && frameR.width > 0) {
    const align = leadingR && leadingR.width > 0 ? leadingR : frameR;
    return outsideShellCoords(frameR, align, BTN_SIZE);
  }
  if (leadingR && leadingR.width > 0) {
    return outsideShellCoords(leadingR, leadingR, BTN_SIZE);
  }

  const shell = adapter.getComposerShell() ?? adapter.getComposerBox();
  const boxR = shell?.isConnected ? shell.getBoundingClientRect() : undefined;
  if (boxR && boxR.width > 0) {
    return outsideShellCoords(boxR, boxR, BTN_SIZE);
  }

  const editor = adapter.findEditor();
  const editorR = editor?.isConnected ? editor.getBoundingClientRect() : undefined;
  if (editorR && editorR.width > 0) {
    return outsideShellCoords(editorR, editorR, BTN_SIZE);
  }

  return {
    top: clamp(window.innerHeight - BTN_SIZE - 72, PAD, window.innerHeight - BTN_SIZE - PAD),
    left: clamp(24, PAD, window.innerWidth - BTN_SIZE - PAD),
  };
}

/**
 * Keep the inject button in one stable portal target. Only fall back to fixed
 * positioning after the composer slot has been missing for a sustained period —
 * avoids flicker when Gemini briefly rebuilds the composer row.
 */
function useInjectMount(
  stemlmEnabled: boolean,
): { mode: 'docked'; slot: HTMLElement } | { mode: 'fixed'; top: number; left: number } | { mode: 'hidden' } {
  const adapter = detectAdapter();
  const [path, setPath] = useState(() => (typeof location === 'undefined' ? '/' : location.pathname));
  const [mount, setMount] = useState<
    { mode: 'docked'; slot: HTMLElement } | { mode: 'fixed'; top: number; left: number } | { mode: 'hidden' }
  >(() => {
    if (!stemlmEnabled) return { mode: 'hidden' };
    if (adapter && !injectControlEnabled(adapter.id, path)) return { mode: 'hidden' };
    return adapter
      ? { mode: 'fixed', ...fixedCoords(adapter) }
      : { mode: 'fixed', top: window.innerHeight - 108, left: 24 };
  });
  const lastDockedAt = useRef(0);

  useEffect(() => watchComposerRoute(() => setPath(location.pathname)), []);

  useEffect(() => {
    const platform = detectAdapter();
    if (!platform) return;

    const enabled = stemlmEnabled && injectControlEnabled(platform.id, path);
    if (!enabled) {
      removeComposerSlot();
      setMount({ mode: 'hidden' });
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    let observer: MutationObserver | null = null;

    const syncGeometry = () => {
      if (!stemlmEnabled || !injectControlEnabled(platform.id, location.pathname)) return;
      syncComposerSlotGeometry(platform);
    };

    const sync = () => {
      if (!stemlmEnabled || !injectControlEnabled(platform.id, location.pathname)) {
        removeComposerSlot();
        setMount({ mode: 'hidden' });
        return;
      }
      const scheme = detectHostScheme();
      const slot = ensureComposerSlot(platform, scheme);
      const now = Date.now();

      if (slot?.isConnected) {
        lastDockedAt.current = now;
        syncComposerSlotGeometry(platform);
        // The shared slot is re-inserted when the host rebuilds its composer (SPA navigation). If the
        // control left it meanwhile (a render saw it detached), the same slot needs a fresh render.
        setMount((prev) =>
          prev.mode === 'docked' && prev.slot === slot && slot.childElementCount > 0
            ? prev
            : { mode: 'docked', slot },
        );
        return;
      }

      if (lastDockedAt.current > 0 && now - lastDockedAt.current < FIXED_FALLBACK_MS) return;

      const next = { mode: 'fixed' as const, ...fixedCoords(platform) };
      setMount((prev) =>
        prev.mode === 'fixed' && prev.top === next.top && prev.left === next.left ? prev : next,
      );
    };

    // A throttle, not a debounce: a host that mutates without pause (streaming, loading) must not
    // postpone the dock check indefinitely.
    const schedule = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        sync();
      }, DOCK_RETRY_MS);
    };

    const onResize = () => {
      syncGeometry();
      schedule();
    };

    observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('scroll', syncGeometry, true);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener('resize', syncGeometry);
    visualViewport?.addEventListener('scroll', syncGeometry);
    const layoutTimers: number[] = [];
    const unsubLayout = useStore.subscribe((state, prev) => {
      if (
        state.panelOpen === prev.panelOpen &&
        state.splitRatio === prev.splitRatio &&
        state.splitDragging === prev.splitDragging
      ) {
        return;
      }
      syncGeometry();
      requestAnimationFrame(syncGeometry);
      layoutTimers.push(window.setTimeout(syncGeometry, 300));
    });
    sync();

    return () => {
      if (timer) clearTimeout(timer);
      for (const id of layoutTimers) clearTimeout(id);
      observer?.disconnect();
      window.removeEventListener('scroll', syncGeometry, true);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      visualViewport?.removeEventListener('resize', syncGeometry);
      visualViewport?.removeEventListener('scroll', syncGeometry);
      unsubLayout();
    };
  }, [adapter?.id ?? 'none', path, stemlmEnabled]);

  return mount;
}

/** The therefore-mark at glyph size: two premises on the baseline, the conclusion above them. */
const MARK_SHAPES = (
  <>
    <circle className="slm-inject-dot" cx="5.4" cy="17.4" r="3.3" />
    <circle className="slm-inject-dot" cx="18.6" cy="17.4" r="3.3" />
    <rect className="slm-inject-apex" x="8.6" y="3.2" width="6.8" height="6.8" rx="2.05" />
  </>
);

/** While the guide is being attached the three shapes rise in turn. */
function InjectSpinner() {
  return (
    <svg className="slm-inject-spinner" width={18} height={18} viewBox="0 0 24 24" aria-hidden="true">
      {MARK_SHAPES}
    </svg>
  );
}

/** The mark (idle) gives way to a tick once the guide is attached. */
export function InjectGlyph({ attached }: { attached: boolean }) {
  return (
    <span className={`slm-inject-glyph ${attached ? 'is-tick' : 'is-mark'}`} aria-hidden="true">
      <svg className="slm-inject-mark" viewBox="0 0 24 24" width={18} height={18}>
        {MARK_SHAPES}
      </svg>
      <svg className="slm-inject-tick" viewBox="0 0 24 24" width={18} height={18}>
        <path
          d="M19.5 6.5 9.6 17 4.5 11.9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

const PANEL_UNAVAILABLE = "stemlm couldn't open its panel. Refresh this tab.";

export function OverlayButton({ panelUnavailable = false }: { panelUnavailable?: boolean }) {
  const stemlmEnabled = useStore((s) => s.settings.stemlmEnabled !== false);
  const mount = useInjectMount(stemlmEnabled);
  const [pasting, setPasting] = useState(false);
  const injected = useStore((s) => s.buttonInjected);
  const panelOpen = useStore((s) => s.panelOpen);
  const togglePanel = useStore((s) => s.togglePanel);
  const wrapRef = useRef<HTMLDivElement>(null);
  const onMainRef = useRef<() => void>(() => {});
  const armedRef = useRef(false);
  const pastingRef = useRef(false);

  const adapter = detectAdapter();
  const hostScheme = detectHostScheme();
  const neutral = adapter?.brand.neutral ?? false;

  useEffect(() => {
    if (!injected || !adapter) return;
    const ctrl = getController();
    if (!ctrl) return;

    const tick = () => {
      const text = adapter.getEditorText().trim();
      // inject()/followUp set status 'loading' with buttonInjected; empty
      // composer must still revert to the mark (host send clears the box).
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

  function onMain() {
    if (pastingRef.current) return;
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
    void (async () => {
      try {
        await ctrl.inject();
      } catch {
        const store = useStore.getState();
        store.setStatus('error', 'Could not finish attaching the stemlm guide. Try the stemlm button again.');
        store.openPanel();
      } finally {
        pastingRef.current = false;
        setPasting(false);
      }
    })();
  }

  onMainRef.current = onMain;

  const docked = mount.mode === 'docked' && mount.slot.isConnected;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const activate = () => {
      if (armedRef.current) return;
      armedRef.current = true;
      queueMicrotask(() => {
        armedRef.current = false;
      });
      onMainRef.current();
    };
    return isolateStemLmPointer(wrap, activate, true);
  }, [docked]);

  if (!stemlmEnabled || mount.mode === 'hidden') return null;

  const wrapClass = [
    'slm-fab-wrap',
    docked ? '' : 'slm-fab-wrap--fixed',
    neutral ? 'slm-fab-wrap--neutral' : '',
    `slm-fab-wrap--${hostScheme}`,
  ]
    .filter(Boolean)
    .join(' ');

  const title = pasting
    ? 'Attaching the stemlm guide'
    : panelUnavailable
      ? PANEL_UNAVAILABLE
      : injected
      ? panelOpen
        ? 'stemlm panel open'
        : 'stemlm guide attached. Open the panel'
      : 'Study with stemlm: attach the guide to this question';

  const content = (
    <>
      <button
        type="button"
        className={`slm-inject-btn ${pasting ? 'is-loading' : ''} ${injected ? (panelOpen ? 'is-panel-open' : 'is-attached') : ''}`}
        data-stemlm-inject="true"
        data-glyph={injected ? 'tick' : 'mark'}
        onClick={(e) => {
          e.stopPropagation();
          if (armedRef.current || pastingRef.current) return;
          onMain();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        title={title}
        aria-label={title}
        aria-pressed={injected}
        aria-busy={pasting}
        aria-disabled={pasting}
      >
        {pasting ? <InjectSpinner /> : <InjectGlyph attached={injected} />}
      </button>
      <span className="slm-inject-live" role="status" aria-live="polite">
        {pasting ? 'Attaching the stemlm guide' : panelUnavailable ? PANEL_UNAVAILABLE : injected ? 'stemlm guide attached' : ''}
      </span>
    </>
  );

  const shell = (
    <div ref={wrapRef} className={wrapClass}>
      {content}
    </div>
  );

  if (mount.mode === 'docked' && mount.slot.isConnected) {
    return createPortal(shell, mount.slot);
  }

  const { top, left } =
    mount.mode === 'fixed'
      ? mount
      : adapter
        ? fixedCoords(adapter)
        : { top: window.innerHeight - 108, left: 24 };

  return (
    <div ref={wrapRef} className={wrapClass} style={{ top, left }}>
      <style>{SHADOW_CONTROL_CSS}</style>
      {content}
    </div>
  );
}
