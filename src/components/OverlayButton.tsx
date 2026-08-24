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
import {
  ensureComposerSlot,
  isolateStemLmPointer,
  removeComposerSlot,
  syncComposerSlotGeometry,
  _composerSlotGap,
} from '@/src/lib/composer-slot';

const BTN_SIZE = 32;
const SLOT_GAP = _composerSlotGap;
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
  if (leadingR && leadingR.width > 0) {
    return {
      top: clamp(leadingR.top + (leadingR.height - BTN_SIZE) / 2, PAD, window.innerHeight - BTN_SIZE - PAD),
      left: clamp(leadingR.left - BTN_SIZE - SLOT_GAP, PAD, window.innerWidth - BTN_SIZE - PAD),
    };
  }

  const shell = adapter.getComposerShell() ?? adapter.getComposerBox();
  const boxR = shell?.isConnected ? shell.getBoundingClientRect() : undefined;
  if (boxR && boxR.width > 0) {
    return {
      top: clamp(boxR.top + (boxR.height - BTN_SIZE) / 2, PAD, window.innerHeight - BTN_SIZE - PAD),
      left: clamp(boxR.left - BTN_SIZE - SLOT_GAP, PAD, window.innerWidth - BTN_SIZE - PAD),
    };
  }

  const editor = adapter.findEditor();
  const editorR = editor?.isConnected ? editor.getBoundingClientRect() : undefined;
  if (editorR && editorR.width > 0) {
    return {
      top: clamp(editorR.top + (editorR.height - BTN_SIZE) / 2, PAD, window.innerHeight - BTN_SIZE - PAD),
      left: clamp(editorR.left - BTN_SIZE - SLOT_GAP, PAD, window.innerWidth - BTN_SIZE - PAD),
    };
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
function useInjectMount(): { mode: 'docked'; slot: HTMLElement } | { mode: 'fixed'; top: number; left: number } | { mode: 'hidden' } {
  const adapter = detectAdapter();
  const [path, setPath] = useState(() => (typeof location === 'undefined' ? '/' : location.pathname));
  const [mount, setMount] = useState<
    { mode: 'docked'; slot: HTMLElement } | { mode: 'fixed'; top: number; left: number } | { mode: 'hidden' }
  >(() => {
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

    const enabled = injectControlEnabled(platform.id, path);
    if (!enabled) {
      removeComposerSlot();
      setMount({ mode: 'hidden' });
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    let observer: MutationObserver | null = null;

    const sync = () => {
      if (!injectControlEnabled(platform.id, location.pathname)) {
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
        setMount((prev) =>
          prev.mode === 'docked' && prev.slot === slot ? prev : { mode: 'docked', slot },
        );
        return;
      }

      if (lastDockedAt.current > 0 && now - lastDockedAt.current < FIXED_FALLBACK_MS) return;

      const next = { mode: 'fixed' as const, ...fixedCoords(platform) };
      setMount((prev) =>
        prev.mode === 'fixed' && prev.top === next.top && prev.left === next.left ? prev : next,
      );
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(sync, DOCK_RETRY_MS);
    };

    observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    sync();

    return () => {
      if (timer) clearTimeout(timer);
      observer?.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [adapter?.id ?? 'none', path]);

  return mount;
}

function InjectSpinner() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="28 56"
      />
    </svg>
  );
}

/** Plus (idle) morphs to a tick when the protocol is attached. */
export function InjectGlyph({ attached }: { attached: boolean }) {
  return (
    <span className={`slm-inject-glyph ${attached ? 'is-tick' : 'is-plus'}`} aria-hidden="true">
      <svg className="slm-inject-plus" viewBox="0 0 24 24" width={16} height={16}>
        <path
          d="M12 5v14M5 12h14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <svg className="slm-inject-tick" viewBox="0 0 24 24" width={16} height={16}>
        <path
          d="M20 6 9 17l-5-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function OverlayButton() {
  const mount = useInjectMount();
  const [pasting, setPasting] = useState(false);
  const injected = useStore((s) => s.buttonInjected);
  const panelOpen = useStore((s) => s.panelOpen);
  const togglePanel = useStore((s) => s.togglePanel);
  const wrapRef = useRef<HTMLDivElement>(null);
  const onMainRef = useRef<() => void>(() => {});
  const armedRef = useRef(false);

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
      // composer must still revert to plus (host send clears the box).
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
    if (pasting) return;
    const ctrl = getController();
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
    setPasting(true);
    void ctrl?.inject().finally(() => setPasting(false));
  }

  onMainRef.current = onMain;

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
  }, [mount.mode]);

  if (mount.mode === 'hidden') return null;

  const wrapClass = [
    'slm-fab-wrap',
    mount.mode === 'fixed' ? 'slm-fab-wrap--fixed' : '',
    neutral ? 'slm-fab-wrap--neutral' : '',
    `slm-fab-wrap--${hostScheme}`,
  ]
    .filter(Boolean)
    .join(' ');

  const title = pasting
    ? 'Injecting stemLM protocol'
    : injected
      ? panelOpen
        ? 'stemLM panel open'
        : 'stemLM attached — open panel'
      : 'Solve with stemLM';

  const content = pasting ? (
    <span className="slm-inject-status" aria-live="polite" title={title}>
      <InjectSpinner />
    </span>
  ) : (
    <button
      type="button"
      className={`slm-inject-btn ${injected ? (panelOpen ? 'is-panel-open' : 'is-attached') : ''}`}
      data-stemlm-inject="true"
      data-glyph={injected ? 'tick' : 'plus'}
      onClick={(e) => {
        e.stopPropagation();
        if (armedRef.current) return;
        onMain();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      title={title}
      aria-label={title}
      aria-pressed={injected}
    >
      <InjectGlyph attached={injected} />
    </button>
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
    mount.mode === 'fixed' ? mount : { top: window.innerHeight - 108, left: 24 };

  return (
    <div ref={wrapRef} className={wrapClass} style={{ top, left }}>
      {content}
    </div>
  );
}
