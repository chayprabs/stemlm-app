import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/src/state/store';
import { getController } from '@/src/content/controller';
import { detectAdapter } from '@/src/platforms/detect';
import type { PlatformBrand } from '@/src/platforms/types';
import { detectHostScheme, type ResolvedTheme } from '@/src/lib/theme';
import { SUBJECTS, type Subject } from '@/src/protocol/types';
import { IconLogo, IconCheck, IconChevronDown } from './icons';

const FAB_SIZE = 34;

interface Pos {
  top: number;
  left: number;
  visible: boolean;
}

/**
 * Track the composer anchor (the send button) so the small circular stemLM
 * button sits just to its left, vertically centred — i.e. it "belongs" in the
 * composer's action row instead of floating detached above it.
 */
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
      // Vertically centre on the anchor; dock just to its left.
      const centerY = r.top + r.height / 2;
      const top = Math.min(
        window.innerHeight - FAB_SIZE - 8,
        Math.max(8, centerY - FAB_SIZE / 2),
      );
      const left = Math.min(
        window.innerWidth - FAB_SIZE - 8,
        Math.max(8, r.left - FAB_SIZE - 10),
      );
      setPos({ top, left, visible: true });
    };

    const loop = () => {
      update();
      raf = window.requestAnimationFrame(() => {
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

/** Build the CSS custom-property palette for the button from brand × host scheme. */
function fabPalette(brand: PlatformBrand, scheme: ResolvedTheme): React.CSSProperties {
  if (brand.neutral) {
    const dark = scheme === 'dark';
    return {
      // Monochrome, matching the host's own send button (e.g. ChatGPT / Grok).
      ['--slm-fab-surface' as string]: dark ? '#ffffff' : '#0d0d0d',
      ['--slm-fab-fg' as string]: dark ? '#0d0d0d' : '#ffffff',
      ['--slm-fab-ring' as string]: dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.16)',
    } as React.CSSProperties;
  }
  return {
    ['--slm-fab-surface' as string]: brand.accent,
    ['--slm-fab-fg' as string]: brand.accentFg ?? '#ffffff',
    ['--slm-fab-ring' as string]: hexToRgba(brand.accent, 0.45),
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

  // Detect (and keep in sync with) the host site's light/dark scheme.
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

  const palette = useMemo(() => {
    const brand = detectAdapter()?.brand ?? { accent: '#5b46e0' };
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
    // Selecting a subject both sets it and fires the request in one action.
    setOverride(s);
    setMenuOpen(false);
    getController()?.inject(s);
  }

  return (
    <div ref={ref} className="slm-fab-wrap" style={{ top: pos.top, left: pos.left, ...palette }}>
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
        whileTap={{ scale: 0.92 }}
        title={
          injected
            ? 'Open stemLM panel'
            : `Solve with stemLM (${override === 'Auto' ? 'Auto-detect subject' : override})`
        }
        aria-label={injected ? 'Open stemLM panel' : 'Solve with stemLM'}
      >
        {injected ? <IconCheck width={18} height={18} /> : <IconLogo />}
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
