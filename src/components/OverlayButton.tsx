import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useStore } from '@/src/state/store';
import { getController } from '@/src/content/controller';
import { detectAdapter } from '@/src/platforms/detect';
import { detectHostScheme } from '@/src/lib/theme';
import { ensureComposerSlot, _composerSlotGap } from '@/src/lib/composer-slot';
import { IconCheck, StemMark } from './icons';

const BTN_SIZE = 36;
const SLOT_GAP = _composerSlotGap;

type PosMode =
  | { mode: 'docked'; slot: HTMLElement }
  | { mode: 'fixed'; top: number; left: number };

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function fallbackFixedPosition(adapter: NonNullable<ReturnType<typeof detectAdapter>>): {
  top: number;
  left: number;
} {
  const PAD = 8;
  const editor = adapter.findEditor();
  const editorR = editor?.getBoundingClientRect();
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

function initialFixedPosition(): { top: number; left: number } {
  const adapter = detectAdapter();
  if (adapter) return fallbackFixedPosition(adapter);
  return {
    top: clamp(window.innerHeight - BTN_SIZE - 72, 8, window.innerHeight - BTN_SIZE - 8),
    left: 24,
  };
}

function useComposerPosition(): PosMode {
  const [pos, setPos] = useState<PosMode>(() => ({
    mode: 'fixed',
    ...initialFixedPosition(),
  }));
  const lastFixed = useRef<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const adapter = detectAdapter();
    if (!adapter) return;

    let raf = 0;

    const update = () => {
      const scheme = detectHostScheme();
      const slot = ensureComposerSlot(adapter, scheme);
      if (slot?.isConnected) {
        setPos((p) =>
          p.mode === 'docked' && p.slot === slot ? p : { mode: 'docked', slot },
        );
        return;
      }

      const leading = adapter.getComposerLeadingAnchor();
      const leadingR = leading?.isConnected ? leading.getBoundingClientRect() : undefined;
      const shell = adapter.getComposerShell() ?? adapter.getComposerBox();
      const boxR = shell?.isConnected ? shell.getBoundingClientRect() : undefined;

      const PAD = 8;
      let top: number;
      let left: number;

      if (leadingR && leadingR.width > 0) {
        top = leadingR.top + (leadingR.height - BTN_SIZE) / 2;
        left = leadingR.left - BTN_SIZE - SLOT_GAP;
      } else if (boxR && boxR.width > 0) {
        top = boxR.bottom - BTN_SIZE - 10;
        left = boxR.left - BTN_SIZE - SLOT_GAP;
      } else {
        const fb = lastFixed.current ?? fallbackFixedPosition(adapter);
        top = fb.top;
        left = fb.left;
      }

      const next = {
        mode: 'fixed' as const,
        top: clamp(top, PAD, window.innerHeight - BTN_SIZE - PAD),
        left: clamp(left, PAD, window.innerWidth - BTN_SIZE - PAD),
      };
      lastFixed.current = { top: next.top, left: next.left };
      setPos((p) =>
        p.mode === 'fixed' && p.top === next.top && p.left === next.left ? p : next,
      );
    };

    const loop = () => {
      update();
      raf = window.requestAnimationFrame(() => {
        setTimeout(loop, 280);
      });
    };
    loop();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, []);

  return pos;
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
  const pos = useComposerPosition();
  const [pasting, setPasting] = useState(false);
  const injected = useStore((s) => s.buttonInjected);
  const panelOpen = useStore((s) => s.panelOpen);
  const togglePanel = useStore((s) => s.togglePanel);

  const adapter = detectAdapter();
  const hostScheme = detectHostScheme();
  const neutral = adapter?.brand.neutral ?? false;

  // Return the inject button to its default state once the user sends (composer
  // clears) or starts typing a new question — not only after capture completes.
  useEffect(() => {
    if (!injected || !adapter) return;
    const ctrl = getController();
    if (!ctrl) return;

    const tick = () => {
      const text = adapter.getEditorText().trim();
      if (text.length === 0) {
        ctrl.resetInjection();
        return;
      }
      const last = ctrl.getLastQuestion().trim();
      const hasProtocol = text.includes('stemLM instructions');
      if (!hasProtocol && last.length > 0 && text !== last) {
        ctrl.resetInjection();
      }
    };

    const id = window.setInterval(tick, 500);
    return () => clearInterval(id);
  }, [injected, adapter]);

  const docked =
    pos.mode === 'docked' && pos.slot.isConnected ? pos : null;
  const fixed = pos.mode === 'fixed' ? pos : { mode: 'fixed' as const, ...initialFixedPosition() };

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
    !docked ? 'slm-fab-wrap--fixed' : '',
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
    <motion.button
      type="button"
      className={`slm-inject-btn ${injected ? (panelOpen ? 'is-panel-open' : 'is-attached') : ''}`}
      onClick={onMain}
      whileTap={{ scale: 0.96 }}
      title={title}
      aria-label={title}
    >
      {injected ? (
        <IconCheck width={14} height={14} />
      ) : (
        <StemMark width={14} height={14} />
      )}
    </motion.button>
  );

  if (docked) {
    return createPortal(<div className={wrapClass}>{content}</div>, docked.slot);
  }

  return (
    <div className={wrapClass} style={{ top: fixed.top, left: fixed.left }}>
      {content}
    </div>
  );
}
