import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/src/state/store';
import { getController } from '@/src/content/controller';
import { detectAdapter } from '@/src/platforms/detect';
import { SUBJECTS, type Subject } from '@/src/protocol/types';
import { IconCheck, IconChevronDown } from './icons';

const BTN_GAP = 6;

interface Pos {
  top: number;
  left: number;
  visible: boolean;
}

/**
 * Track the composer send-button anchor so the ✦ stemLM pill sits just inside
 * the composer box, immediately to the left of the send button.
 */
function useComposerPosition(wrapRef: React.RefObject<HTMLDivElement | null>): Pos {
  const [pos, setPos] = useState<Pos>({ top: 0, left: 0, visible: false });
  const injected = useStore((s) => s.buttonInjected);

  const update = useCallback(() => {
    const adapter = detectAdapter();
    const wrap = wrapRef.current;
    if (!adapter) {
      setPos((p) => (p.visible ? { ...p, visible: false } : p));
      return;
    }

    const anchor = adapter.getComposerAnchor();
    if (!anchor) {
      setPos((p) => (p.visible ? { ...p, visible: false } : p));
      return;
    }

    const r = anchor.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) {
      setPos((p) => (p.visible ? { ...p, visible: false } : p));
      return;
    }

    const fabEl = wrap?.querySelector<HTMLElement>('.slm-fab');
    const btnW = wrap?.offsetWidth ?? 72;
    const fabH = fabEl?.offsetHeight ?? 32;

    const centerY = r.top + r.height / 2;
    const top = Math.min(
      window.innerHeight - fabH - 8,
      Math.max(8, centerY - fabH / 2),
    );
    const left = Math.min(
      window.innerWidth - btnW - 8,
      Math.max(8, r.left - btnW - BTN_GAP),
    );
    setPos({ top, left, visible: true });
  }, [wrapRef]);

  useEffect(() => {
    const adapter = detectAdapter();
    if (!adapter) return;

    let raf = 0;
    let observer: ResizeObserver | null = null;
    let observed: HTMLElement | null = null;

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    const attachObserver = () => {
      const el = adapter.getComposerAnchor();
      if (el && el !== observed) {
        observer?.disconnect();
        observed = el;
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
    }, 400);

    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(poll);
      observer?.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [update]);

  // Re-measure when button content changes (inject state, subject pill).
  useEffect(() => {
    const id = requestAnimationFrame(update);
    return () => cancelAnimationFrame(id);
  }, [injected, update]);

  return pos;
}

export function OverlayButton() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pos = useComposerPosition(wrapRef);
  const injected = useStore((s) => s.buttonInjected);
  const togglePanel = useStore((s) => s.togglePanel);
  const defaultSubject = useStore((s) => s.settings.defaultSubject);
  const [override, setOverride] = useState<Subject | 'Auto'>('Auto');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setOverride(defaultSubject);
  }, [defaultSubject]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

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
      ref={wrapRef}
      className="slm-fab-wrap"
      style={{
        top: pos.top,
        left: pos.left,
        visibility: pos.visible ? 'visible' : 'hidden',
        pointerEvents: pos.visible ? 'auto' : 'none',
      }}
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
            <span className="slm-fab-label">stemLM</span>
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
