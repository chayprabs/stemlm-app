import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useStore } from '@/src/state/store';
import { OverlayButton } from '@/src/components/OverlayButton';
import { Panel } from '@/src/components/Panel';
import { detectAdapter } from '@/src/platforms/detect';

const SPLIT_STYLE_ID = 'stemlm-split-style';

/**
 * Apply (or remove) a true split-screen: the host page (<body>) is shrunk to
 * the left portion of the viewport while the study panel occupies the right.
 *
 * We shrink <body> and give it a `transform`, which makes the site's own
 * `position: fixed` elements (headers, composer) become positioned relative to
 * the shrunk body instead of the viewport — so they reflow into the left pane
 * like a normal responsive split, rather than sliding under the panel. The
 * panel itself lives outside <body> (anchored to <html>) so it stays fixed to
 * the viewport. Per-adapter layout roots get an extra max-width clamp for
 * stubborn layouts.
 */
function applySplit(ratio: number) {
  const panelVw = +(ratio * 100).toFixed(3);
  const pageVw = +(100 - panelVw).toFixed(3);
  const layoutRoots = detectAdapter()?.layoutRoots ?? ['main'];
  const rootClamp = layoutRoots
    .map((sel) => `${sel}{max-width:calc(100vw - ${panelVw}vw)!important;}`)
    .join('');

  const css = `
html.stemlm-split { overflow-x: hidden !important; }
html.stemlm-split > body {
  width: ${pageVw}vw !important;
  min-width: 0 !important;
  max-width: ${pageVw}vw !important;
  transform: translateZ(0);
  transition: width 0.28s cubic-bezier(0.22,1,0.36,1);
}
${rootClamp}
`;

  let style = document.getElementById(SPLIT_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = SPLIT_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = css;
  document.documentElement.classList.add('stemlm-split');
}

function removeSplit() {
  document.documentElement.classList.remove('stemlm-split');
  document.getElementById(SPLIT_STYLE_ID)?.remove();
}

/**
 * Root content-script app: the docked overlay button + the split-screen study
 * panel. When the panel is open the host page is shrunk to the left so the two
 * sit side-by-side (resizable, ratio persisted).
 */
export default function App() {
  const panelOpen = useStore((s) => s.panelOpen);
  const splitRatio = useStore((s) => s.splitRatio);

  useEffect(() => {
    if (panelOpen) applySplit(splitRatio);
    else removeSplit();
    return () => {
      if (!useStore.getState().panelOpen) removeSplit();
    };
  }, [panelOpen, splitRatio]);

  return (
    <>
      <OverlayButton />
      <AnimatePresence>{panelOpen && <Panel />}</AnimatePresence>
    </>
  );
}
