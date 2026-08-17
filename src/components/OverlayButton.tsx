import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/src/state/store';
import { getController } from '@/src/content/controller';
import { detectAdapter } from '@/src/platforms/detect';
import { composerTextHasProtocol } from '@/src/protocol/builder';
import { detectHostScheme } from '@/src/lib/theme';
import { ensureComposerSlot, _composerSlotGap } from '@/src/lib/composer-slot';
import { IconCheck, StemMark } from './icons';

const BTN_SIZE = 36;
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
      top: clamp(boxR.bottom - BTN_SIZE - 10, PAD, window.innerHeight - BTN_SIZE - PAD),
      left: clamp(boxR.left - BTN_SIZE - SLOT_GAP, PAD, window.innerWidth - BTN_SIZE - PAD),
    };
  }

  const editor = adapter.findEditor();
  const editorR = editor?.isConnected ? editor.getBoundingClientRect() : undefined;
  if (editorR && editorR.width > 0) {
    return {
      top: clamp(editorR.bottom - BTN_SIZE - 10, PAD, window.innerHeight - BTN_SIZE - PAD),
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
function useInjectMount(): { mode: 'docked'; slot: HTMLElement } | { mode: 'fixed'; top: number; left: number } {
  const adapter = detectAdapter();
  const [mount, setMount] = useState<
    { mode: 'docked'; slot: HTMLElement } | { mode: 'fixed'; top: number; left: number }
  >(() =>
    adapter
      ? { mode: 'fixed', ...fixedCoords(adapter) }
      : { mode: 'fixed', top: window.innerHeight - 108, left: 24 },
  );
  const lastDockedAt = useRef(0);

  useEffect(() => {
    const platform = detectAdapter();
    if (!platform) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let observer: MutationObserver | null = null;

    const sync = () => {
      const scheme = detectHostScheme();
      const slot = ensureComposerSlot(platform, scheme);
      const now = Date.now();

      if (slot?.isConnected) {
        lastDockedAt.current = now;
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
  }, [adapter?.id ?? 'none']);

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

export function OverlayButton() {
  const mount = useInjectMount();
  const [pasting, setPasting] = useState(false);
  const injected = useStore((s) => s.buttonInjected);
  const panelOpen = useStore((s) => s.panelOpen);
  const togglePanel = useStore((s) => s.togglePanel);

  const adapter = detectAdapter();
  const hostScheme = detectHostScheme();
  const neutral = adapter?.brand.neutral ?? false;

  useEffect(() => {
    if (!injected || !adapter) return;
    const ctrl = getController();
    if (!ctrl) return;

    const tick = () => {
      if (useStore.getState().status === 'loading') return;
      const text = adapter.getEditorText().trim();
      if (text.length === 0) {
        ctrl.resetInjection();
        return;
      }
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
    if (injected) {
      togglePanel();
      return;
    }
    setPasting(true);
    void getController()
      ?.inject()
      .finally(() => setPasting(false));
  }

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
      onClick={onMain}
      title={title}
      aria-label={title}
    >
      {injected ? <IconCheck width={14} height={14} /> : <StemMark width={14} height={14} />}
    </button>
  );

  const shell = <div className={wrapClass}>{content}</div>;

  if (mount.mode === 'docked' && mount.slot.isConnected) {
    return createPortal(shell, mount.slot);
  }

  const { top, left } =
    mount.mode === 'fixed' ? mount : { top: window.innerHeight - 108, left: 24 };

  return (
    <div className={wrapClass} style={{ top, left }}>
      {content}
    </div>
  );
}
