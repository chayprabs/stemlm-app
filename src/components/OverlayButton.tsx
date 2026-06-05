import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/src/state/store';
import { getController } from '@/src/content/controller';
import { detectAdapter } from '@/src/platforms/detect';
import { SUBJECTS, type Subject } from '@/src/protocol/types';
import { IconCheck, IconChevronDown } from './icons';

const ROW_H = 36;
const PAD = 10;
const BTN_GAP = 6;

interface Pos {
  top: number;
  left: number;
  visible: boolean;
}

/**
 * Position the ✦ stemLM pill inside the composer shell — bottom-right, just
 * left of the host send button, vertically centred on the action row.
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

    const shell = adapter.getComposerShell();
    const anchor = adapter.getComposerAnchor();
    if (!shell) {
      setPos((p) => (p.visible ? { ...p, visible: false } : p));
      return;
    }

    const sr = shell.getBoundingClientRect();
    if (sr.width < 40 || sr.height < 20) {
      setPos((p) => (p.visible ? { ...p, visible: false } : p));
      return;
    }

    const rowW = wrap?.offsetWidth ?? 72;
    const fabEl = wrap?.querySelector<HTMLElement>('.slm-fab');
    const fabH = fabEl?.offsetHeight ?? 32;

    const ar = anchor?.getBoundingClientRect();
    const centerY =
      ar && ar.height > 0 ? ar.top + ar.height / 2 : sr.bottom - PAD - ROW_H / 2;

    let left =
      ar && ar.width > 0 ? ar.left - rowW - BTN_GAP : sr.right - rowW - PAD;
    left = Math.max(sr.left + PAD, Math.min(left, sr.right - rowW - PAD));

    const top = Math.min(
      window.innerHeight - fabH - 6,
      Math.max(6, centerY - fabH / 2),
    );

    setPos({ top, left, visible: true });
  }, [wrapRef]);

  useEffect(() => {
    const adapter = detectAdapter();
    if (!adapter) return;

    let raf = 0;
    let observer: ResizeObserver | null = null;
    const observed = new Set<HTMLElement>();

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    const attachObservers = () => {
      const targets = [adapter.getComposerShell(), adapter.getComposerAnchor()].filter(
        Boolean,
      ) as HTMLElement[];
      for (const el of targets) {
        if (!observed.has(el)) {
          observed.add(el);
          if (!observer) observer = new ResizeObserver(schedule);
          observer.observe(el);
          const parent = el.parentElement;
          if (parent) observer.observe(parent);
        }
      }
    };

    schedule();
    attachObservers();

    const poll = window.setInterval(() => {
      attachObservers();
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
