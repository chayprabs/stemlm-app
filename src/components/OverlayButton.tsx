import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/src/state/store';
import { getController } from '@/src/content/controller';
import { detectAdapter } from '@/src/platforms/detect';
import type { PlatformBrand } from '@/src/platforms/types';
import { detectHostScheme, type ResolvedTheme } from '@/src/lib/theme';
import { SUBJECTS, type Subject } from '@/src/protocol/types';
import { IconLogo, IconCheck, IconChevronDown } from './icons';

const FAB = 32;
const ROW_H = 36;
const PAD = 10;

interface Pos {
  top: number;
  left: number;
  visible: boolean;
}

/**
 * Track the composer shell and anchor the stemLM control row inside the prompt
 * box — bottom-right, just left of the host send button, vertically centred
 * on the action row.
 */
function useComposerPosition(): Pos {
  const [pos, setPos] = useState<Pos>({ top: 0, left: 0, visible: false });

  useEffect(() => {
    const adapter = detectAdapter();
    let raf = 0;

    const update = () => {
      const shell = adapter?.getComposerShell();
      const anchor = adapter?.getComposerAnchor();
      if (!shell) {
        setPos((p) => (p.visible ? { ...p, visible: false } : p));
        return;
      }

      const sr = shell.getBoundingClientRect();
      if (sr.width < 40 || sr.height < 20) {
        setPos((p) => (p.visible ? { ...p, visible: false } : p));
        return;
      }

      // Default: bottom-right inside the shell, left of the send anchor.
      const ar = anchor?.getBoundingClientRect();
      const centerY = ar && ar.height > 0 ? ar.top + ar.height / 2 : sr.bottom - PAD - ROW_H / 2;
      const rowWidth = FAB + 72; // fab + subject chip approx
      let left = ar && ar.width > 0 ? ar.left - rowWidth - 6 : sr.right - rowWidth - PAD;
      left = Math.max(sr.left + PAD, Math.min(left, sr.right - rowWidth - PAD));

      const top = Math.min(
        window.innerHeight - ROW_H - 6,
        Math.max(6, centerY - ROW_H / 2),
      );

      setPos({ top, left, visible: true });
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

function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const v =
    h.length === 3
      ? h.split('').map((c) => c + c).join('')
      : h.padEnd(6, '0').slice(0, 6);
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function fabPalette(brand: PlatformBrand, scheme: ResolvedTheme): React.CSSProperties {
  if (brand.neutral) {
    const dark = scheme === 'dark';
    return {
      ['--slm-fab-surface' as string]: dark ? '#fafafa' : '#18181b',
      ['--slm-fab-fg' as string]: dark ? '#18181b' : '#fafafa',
      ['--slm-fab-ring' as string]: dark ? 'rgba(250,250,250,0.2)' : 'rgba(24,24,27,0.15)',
    } as React.CSSProperties;
  }
  return {
    ['--slm-fab-surface' as string]: brand.accent,
    ['--slm-fab-fg' as string]: brand.accentFg ?? '#ffffff',
    ['--slm-fab-ring' as string]: hexToRgba(brand.accent, 0.4),
  } as React.CSSProperties;
}

export function OverlayButton() {
  const pos = useComposerPosition();
  const injected = useStore((s) => s.buttonInjected);
  const togglePanel = useStore((s) => s.togglePanel);
  const defaultSubject = useStore((s) => s.settings.defaultSubject);
  const [override, setOverride] = useState<Subject | 'Auto'>('Auto');
  const [menuOpen, setMenuOpen] = useState(false);
  const [scheme, setScheme] = useState<ResolvedTheme>('light');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOverride(defaultSubject);
  }, [defaultSubject]);

  useEffect(() => {
    const sync = () => setScheme(detectHostScheme());
    sync();
    const id = window.setInterval(sync, 2000);
    let mql: MediaQueryList | null = null;
    try {
      mql = window.matchMedia('(prefers-color-scheme: dark)');
      mql.addEventListener('change', sync);
    } catch {
      /* ignore */
    }
    return () => {
      window.clearInterval(id);
      mql?.removeEventListener('change', sync);
    };
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const palette = useMemo(() => {
    const brand = detectAdapter()?.brand ?? { accent: '#6366f1' };
    return fabPalette(brand, scheme);
  }, [scheme]);

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
      className="slm-fab-wrap slm-fab-wrap--inset"
      style={{ top: pos.top, left: pos.left, ...palette }}
    >
      <AnimatePresence>
        {menuOpen && !injected && (
          <motion.ul
            className="slm-fab-menu"
            role="listbox"
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.14 }}
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

      <div className="slm-fab-row">
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

        <motion.button
          type="button"
          className={`slm-fab ${injected ? 'is-done' : ''}`}
          onClick={onMain}
          whileTap={{ scale: 0.94 }}
          title={
            injected
              ? 'Open stemLM panel'
              : `Solve with stemLM (${override === 'Auto' ? 'Auto-detect subject' : override})`
          }
          aria-label={injected ? 'Open stemLM panel' : 'Solve with stemLM'}
        >
          {injected ? <IconCheck width={16} height={16} /> : <IconLogo />}
        </motion.button>
      </div>
    </div>
  );
}
