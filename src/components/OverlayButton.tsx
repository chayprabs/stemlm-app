import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/src/state/store';
import { getController } from '@/src/content/controller';
import { detectAdapter } from '@/src/platforms/detect';
import { detectHostScheme } from '@/src/lib/theme';
import { ensureComposerSlot, _composerSlotGap } from '@/src/lib/composer-slot';
import { SUBJECTS, type Subject } from '@/src/protocol/types';
import { IconCheck, IconChevronDown, StemMark } from './icons';

const BTN_W = 76;
const FAB_STACK_H = 44;
const SLOT_GAP = _composerSlotGap;

type PosMode =
  | { mode: 'docked'; slot: HTMLElement }
  | { mode: 'fixed'; top: number; left: number; visible: boolean };

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function useComposerPosition(): PosMode {
  const [pos, setPos] = useState<PosMode>({ mode: 'fixed', top: 0, left: 0, visible: false });

  useEffect(() => {
    const adapter = detectAdapter();
    if (!adapter) return;

    let raf = 0;

    const update = () => {
      const slot = ensureComposerSlot(adapter, detectHostScheme());
      if (slot) {
        setPos((p) =>
          p.mode === 'docked' && p.slot === slot ? p : { mode: 'docked', slot },
        );
        return;
      }

      const shell = adapter.getComposerShell();
      const box = adapter.getComposerBox();
      const anchor = shell ?? box;
      const leading = adapter.getComposerLeadingAnchor();

      if (!anchor) {
        setPos((p) => (p.mode === 'fixed' && !p.visible ? p : { mode: 'fixed', top: 0, left: 0, visible: false }));
        return;
      }

      const boxR = anchor.getBoundingClientRect();
      const leadingR = leading?.getBoundingClientRect();

      if (boxR.width === 0) {
        setPos((p) => (p.mode === 'fixed' && !p.visible ? p : { mode: 'fixed', top: 0, left: 0, visible: false }));
        return;
      }

      const PAD = 8;
      const alignR = leadingR && leadingR.height > 0 ? leadingR : boxR;
      const top = alignR.top + (alignR.height - FAB_STACK_H) / 2;
      const left = boxR.left - BTN_W - SLOT_GAP;

      const clampedTop = clamp(top, PAD, window.innerHeight - FAB_STACK_H - PAD);
      const clampedLeft = clamp(left, PAD, window.innerWidth - BTN_W - PAD);

      setPos({ mode: 'fixed', top: clampedTop, left: clampedLeft, visible: true });
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
    <svg width={12} height={12} viewBox="0 0 24 24" aria-hidden="true">
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
  const injected = useStore((s) => s.buttonInjected);
  const status = useStore((s) => s.status);
  const panelOpen = useStore((s) => s.panelOpen);
  const hasSession = useStore((s) => s.sessions.length > 0);
  const togglePanel = useStore((s) => s.togglePanel);
  const defaultSubject = useStore((s) => s.settings.defaultSubject);
  const [override, setOverride] = useState<Subject | 'Auto'>('Auto');
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const adapter = detectAdapter();
  const hostScheme = detectHostScheme();
  const neutral = adapter?.brand.neutral ?? false;

  useEffect(() => {
    setOverride(defaultSubject);
  }, [defaultSubject]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  if (pos.mode === 'fixed' && !pos.visible) return null;

  const isInjecting = injected && status === 'loading' && !hasSession;

  function onMain() {
    if (isInjecting) return;
    if (injected) {
      togglePanel();
      return;
    }
    void getController()?.inject(override);
  }

  function chooseSubject(s: Subject | 'Auto') {
    setOverride(s);
    setMenuOpen(false);
    void getController()?.inject(s);
  }

  const wrapClass = [
    'slm-fab-wrap',
    pos.mode === 'fixed' ? 'slm-fab-wrap--fixed' : '',
    neutral ? 'slm-fab-wrap--neutral' : '',
    `slm-fab-wrap--${hostScheme}`,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <AnimatePresence>
        {menuOpen && !injected && (
          <motion.ul
            className="slm-fab-menu"
            role="listbox"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
          >
            {(['Auto', ...SUBJECTS] as (Subject | 'Auto')[]).map((s) => (
              <li key={s}>
                <button
                  type="button"
                  role="option"
                  aria-selected={override === s}
                  className={`slm-fab-menu-item ${override === s ? 'is-active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    chooseSubject(s);
                  }}
                >
                  {s === 'Auto' ? 'Auto · recommended' : s}
                  {override === s && <IconCheck width={13} height={13} />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      {isInjecting ? (
        <span className="slm-inject-status" aria-live="polite">
          <InjectSpinner />
          <span>Injecting...</span>
        </span>
      ) : (
        <motion.button
          type="button"
          className={`slm-inject-btn ${injected ? (panelOpen ? 'is-panel-open' : 'is-attached') : ''}`}
          onClick={onMain}
          whileTap={{ scale: 0.96 }}
          title={
            injected
              ? 'Open stemLM panel'
              : `Solve with stemLM (${override === 'Auto' ? 'Auto-detect subject' : override})`
          }
          aria-label={injected ? 'Open stemLM panel' : 'Solve with stemLM'}
        >
          {injected ? (
            <>
              <IconCheck width={12} height={12} />
              <span>{panelOpen ? 'stemLM' : 'Attached'}</span>
            </>
          ) : (
            <>
              <span className="slm-inject-btn-mark" aria-hidden="true">
                <StemMark width={11} height={11} />
              </span>
              <span>stemLM</span>
            </>
          )}
        </motion.button>
      )}

      {!injected && (
        <button
          type="button"
          className="slm-fab-subject"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          aria-haspopup="listbox"
          aria-expanded={menuOpen}
          title="Choose subject"
        >
          <span className="slm-fab-subject-text">{override === 'Auto' ? 'Auto' : override}</span>
          <IconChevronDown />
        </button>
      )}
    </>
  );

  if (pos.mode === 'docked') {
    return createPortal(
      <div ref={ref} className={wrapClass}>
        {content}
      </div>,
      pos.slot,
    );
  }

  return (
    <div
      ref={ref}
      className={wrapClass}
      style={{ top: pos.top, left: pos.left }}
    >
      {content}
    </div>
  );
}
