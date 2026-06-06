import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/src/state/store';
import { getController } from '@/src/content/controller';
import { detectAdapter } from '@/src/platforms/detect';
import { detectHostScheme } from '@/src/lib/theme';
import { ensureComposerSlot } from '@/src/lib/composer-slot';
import { SUBJECTS, type Subject } from '@/src/protocol/types';
import { IconCheck, IconChevronDown } from './icons';

const BTN_W = 76;
const BTN_H = 26;

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

      const box = adapter.getComposerBox();
      const row = adapter.getComposerActionRow();
      const send = adapter.getComposerAnchor();

      if (!box && !send) {
        setPos((p) => (p.mode === 'fixed' && !p.visible ? p : { mode: 'fixed', top: 0, left: 0, visible: false }));
        return;
      }

      const rowR = (row ?? send)?.getBoundingClientRect();
      const boxR = box?.getBoundingClientRect();
      const sendR = send?.getBoundingClientRect();

      if (!rowR || rowR.width === 0) {
        setPos((p) => (p.mode === 'fixed' && !p.visible ? p : { mode: 'fixed', top: 0, left: 0, visible: false }));
        return;
      }

      const PAD = 8;
      const GAP = 6;
      const top = rowR.top + (rowR.height - BTN_H) / 2;
      const left = (sendR?.left ?? rowR.right) - BTN_W - GAP;

      const clampedTop = boxR
        ? clamp(top, boxR.top + PAD, boxR.bottom - BTN_H - PAD)
        : clamp(top, PAD, window.innerHeight - BTN_H - PAD);
      const clampedLeft = boxR
        ? clamp(left, boxR.left + PAD, boxR.right - BTN_W - PAD)
        : clamp(left, PAD, window.innerWidth - BTN_W - PAD);

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

export function OverlayButton() {
  const pos = useComposerPosition();
  const injected = useStore((s) => s.buttonInjected);
  const togglePanel = useStore((s) => s.togglePanel);
  const defaultSubject = useStore((s) => s.settings.defaultSubject);
  const [override, setOverride] = useState<Subject | 'Auto'>('Auto');
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  function onMain() {
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

      <motion.button
        type="button"
        className={`slm-inject-btn ${injected ? 'is-done' : ''}`}
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
            <span>stemLM</span>
          </>
        ) : (
          <>
            <span className="slm-inject-btn-mark" aria-hidden="true">
              ✦
            </span>
            <span>stemLM</span>
          </>
        )}
      </motion.button>

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
      <div ref={ref} className="slm-fab-wrap">
        {content}
      </div>,
      pos.slot,
    );
  }

  return (
    <div
      ref={ref}
      className="slm-fab-wrap slm-fab-wrap--fixed"
      style={{ top: pos.top, left: pos.left }}
    >
      {content}
    </div>
  );
}
