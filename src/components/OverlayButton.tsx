import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/src/state/store';
import { getController } from '@/src/content/controller';
import { detectAdapter } from '@/src/platforms/detect';
import { SUBJECTS, type Subject } from '@/src/protocol/types';
import { IconCheck, IconChevronDown } from './icons';

const BTN_HEIGHT = 32;
const BTN_GAP = 6;

interface Pos {
  top: number;
  left: number;
  visible: boolean;
}

/**
 * Track the composer send-button anchor so the ✦ stemLM pill sits just inside
 * the composer box, immediately to the left of the send button — matching
 * stemlm.app's injection placement across all supported AI platforms.
 */
function useComposerPosition(): Pos {
  const [pos, setPos] = useState<Pos>({ top: 0, left: 0, visible: false });

  useEffect(() => {
    const adapter = detectAdapter();
    if (!adapter) return;

    let raf = 0;
    let observer: ResizeObserver | null = null;
    let anchor: HTMLElement | null = null;

    const update = () => {
      anchor = adapter.getComposerAnchor();
      if (!anchor) {
        setPos((p) => (p.visible ? { ...p, visible: false } : p));
        return;
      }
      const r = anchor.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) {
        setPos((p) => (p.visible ? { ...p, visible: false } : p));
        return;
      }

      const btnH = BTN_HEIGHT;
      const centerY = r.top + r.height / 2;
      const top = Math.min(
        window.innerHeight - btnH - 8,
        Math.max(8, centerY - btnH / 2),
      );
      // Right-align with the send button: position so button's right edge is BTN_GAP left of anchor.
      const estimatedWidth = 72;
      const left = Math.min(
        window.innerWidth - estimatedWidth - 8,
        Math.max(8, r.left - estimatedWidth - BTN_GAP),
      );
      setPos({ top, left, visible: true });
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    const attachObserver = () => {
      const el = adapter.getComposerAnchor();
      if (el && el !== anchor) {
        observer?.disconnect();
        anchor = el;
        observer = new ResizeObserver(schedule);
        observer.observe(el);
        const parent = el.parentElement;
        if (parent) observer.observe(parent);
      }
    };

    schedule();
    attachObserver();

    const poll = window.setInterval(() => {
      attachObserver();
      schedule();
    }, 500);

    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(poll);
      observer?.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
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

  if (!pos.visible) return null;

  function onMain() {
    if (injected) {
      togglePanel();
      return;
    }
    getController()?.inject(override);
  }

  function chooseSubject(s: Subject | 'Auto') {
    setOverride(s);
    setMenuOpen(false);
    getController()?.inject(s);
  }

  return (
    <div
      ref={ref}
      className="slm-fab-wrap"
      style={{ top: pos.top, left: pos.left }}
    >
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
        className={`slm-fab ${injected ? 'is-done' : ''}`}
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
          <IconCheck width={16} height={16} />
        ) : (
          <>
            <span className="slm-fab-spark" aria-hidden="true">
              ✦
            </span>
            <span className="slm-fab-label">
              stem<span style={{ color: 'inherit' }}>LM</span>
            </span>
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
    </div>
  );
}
