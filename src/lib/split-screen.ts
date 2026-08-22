/**
 * Host-page split layout — shrinks Gemini's <body> while the panel sits fixed right.
 */
import { detectAdapter } from '@/src/platforms/detect';
import { pageWidthVw, panelWidthVw } from '@/src/lib/split-ratio';

export const SPLIT_STYLE_ID = 'stemlm-split-style';
/** Matches --slm-panel-inset so Gemini does not cover the rounded panel gap. */
export const PANEL_INSET_PX = 8;

export function applySplit(ratio: number, dragging = false): void {
  const panelVw = panelWidthVw(ratio);
  const pageVw = pageWidthVw(ratio);
  const inset = `${PANEL_INSET_PX}px`;
  const layoutRoots = detectAdapter()?.layoutRoots ?? ['main'];
  const rootClamp = layoutRoots
    .map(
      (sel) =>
        `${sel}{max-width:calc(100vw - ${panelVw}vw - ${inset})!important;width:100%!important;box-sizing:border-box!important;overflow-x:hidden!important;}`,
    )
    .join('');

  const bodyTransition = dragging
    ? 'none'
    : 'width 0.28s cubic-bezier(0.22,1,0.36,1)';

  const css = `
html.stemlm-split { overflow-x: hidden !important; }
html.stemlm-split > body {
  width: calc(${pageVw}vw - ${inset}) !important;
  min-width: 0 !important;
  max-width: calc(${pageVw}vw - ${inset}) !important;
  transform: translateZ(0);
  transition: ${bodyTransition};
}
${rootClamp}
@media (prefers-reduced-motion: reduce) {
  html.stemlm-split > body { transition: none !important; }
}
`;

  let style = document.getElementById(SPLIT_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = SPLIT_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = css;
  document.documentElement.classList.add('stemlm-split');
  document.documentElement.classList.toggle('stemlm-split-dragging', dragging);
}

export function removeSplit(): void {
  document.documentElement.classList.remove('stemlm-split', 'stemlm-split-dragging');
  document.getElementById(SPLIT_STYLE_ID)?.remove();
}
