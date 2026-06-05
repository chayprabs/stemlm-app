import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/src/state/store';
import { getController } from '@/src/content/controller';
import { detectAdapter } from '@/src/platforms/detect';
import type { PlatformBrand } from '@/src/platforms/types';
import { detectHostScheme, type ResolvedTheme } from '@/src/lib/theme';
import { ensureComposerSlot } from '@/src/lib/composer-slot';
import { SUBJECTS, type Subject } from '@/src/protocol/types';
import { IconLogo, IconCheck, IconChevronDown } from './icons';

const FAB_SIZE = 32;

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
      const top = rowR.top + (rowR.height - FAB_SIZE) / 2;
      const left = (sendR?.left ?? rowR.right) - FAB_SIZE - GAP;

      const clampedTop = boxR
        ? clamp(top, boxR.top + PAD, boxR.bottom - FAB_SIZE - PAD)
        : clamp(top, PAD, window.innerHeight - FAB_SIZE - PAD);
      const clampedLeft = boxR
        ? clamp(left, boxR.left + PAD, boxR.right - FAB_SIZE - PAD)
        : clamp(left, PAD, window.innerWidth - FAB_SIZE - PAD);

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
      ['--slm-fab-surface' as string]: dark ? '#ffffff' : '#0d0d0d',
      ['--slm-fab-fg' as string]: dark ? '#0d0d0d' : '#ffffff',
      ['--slm-fab-ring' as string]: dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.16)',
    } as React.CSSProperties;
  }
  return {
    ['--slm-fab-surface' as string]: 'linear-gradient(135deg, #7c6bff, #5b46e0)',
    ['--slm-fab-fg' as string]: '#ffffff',
    ['--slm-fab-ring' as string]: hexToRgba('#7c6bff', 0.4),
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

  const palette = useMemo(() => {
    const brand = detectAdapter()?.brand ?? { accent: '#5b46e0' };
    return fabPalette(brand, scheme);
  }, [scheme]);

  if (pos.mode === 'fixed' && !pos.visible) return null;

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
        {injected ? <IconCheck width={16} height={16} /> : <IconLogo />}
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
      <div ref={ref} className="slm-fab-wrap" style={palette}>
        {content}
      </div>,
      pos.slot,
    );
  }

  return (
    <div
      ref={ref}
      className="slm-fab-wrap slm-fab-wrap--fixed"
      style={{ top: pos.top, left: pos.left, ...palette }}
    >
      {content}
    </div>
  );
}
