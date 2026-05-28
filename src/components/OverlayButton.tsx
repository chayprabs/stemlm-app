import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/src/state/store';
import { getController } from '@/src/content/controller';
import { detectAdapter } from '@/src/platforms/detect';
import { SUBJECTS, type Subject } from '@/src/protocol/types';
import { IconSpark, IconCheck } from './icons';

interface Pos {
  top: number;
  left: number;
  visible: boolean;
}

/** Track the composer anchor's position so the button "belongs" beside it. */
function useComposerPosition(): Pos {
  const [pos, setPos] = useState<Pos>({ top: 0, left: 0, visible: false });

  useEffect(() => {
    const adapter = detectAdapter();
    let raf = 0;

    const update = () => {
      const anchor = adapter?.getComposerAnchor();
      if (!anchor) {
        setPos((p) => (p.visible ? { ...p, visible: false } : p));
        return;
      }
      const r = anchor.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) {
        setPos((p) => (p.visible ? { ...p, visible: false } : p));
        return;
      }
      const top = Math.max(10, r.top - 46);
      const left = Math.min(window.innerWidth - 168, Math.max(12, r.right - 150));
      setPos({ top, left, visible: true });
    };

    const loop = () => {
      update();
      raf = window.requestAnimationFrame(() => {
        // throttle to ~3fps; cheap and smooth enough for layout tracking
        setTimeout(loop, 320);
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

  if (!pos.visible) return null;

  function onMain() {
    if (injected) {
      togglePanel();
      return;
    }
    getController()?.inject(override);
  }

  return (
    <div
      ref={ref}
      className="slm-fab-wrap"
      style={{ top: pos.top, left: pos.left }}
    >
      <motion.button
        type="button"
        className={`slm-fab ${injected ? 'is-done' : ''}`}
        onClick={onMain}
        whileTap={{ scale: 0.96 }}
        title={injected ? 'Open stemLM panel' : 'Add stemLM structured-answer prompt'}
      >
        {injected ? <IconCheck /> : <IconSpark />}
        <span>{injected ? 'Added' : 'stemLM'}</span>
      </motion.button>

      {!injected && (
        <button
          type="button"
          className="slm-fab-caret"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          title="Choose subject"
          aria-haspopup="listbox"
          aria-expanded={menuOpen}
        >
          {override === 'Auto' ? 'Auto' : override}
        </button>
      )}

      <AnimatePresence>
        {menuOpen && (
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
                  onClick={() => {
                    setOverride(s);
                    setMenuOpen(false);
                  }}
                >
                  {s}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
