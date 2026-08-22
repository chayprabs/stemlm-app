import katex from 'katex';
import type { Overlay } from './types';
import { getDisplayScale, parseViewBox, type DiagramSizeProfile } from '@/src/lib/diagram-bounds';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Overlay source is always KaTeX-rendered or escaped text — never raw model innerHTML. */
export function renderOverlayHtml(overlay: Overlay): string {
  if (overlay.kind === 'katex') {
    const tex = overlay.source.replace(/^\$+|\$+$/g, '').trim();
    try {
      return katex.renderToString(tex, {
        throwOnError: false,
        output: 'htmlAndMathml',
        displayMode: false,
        trust: false,
      });
    } catch {
      return escapeHtml(overlay.source);
    }
  }
  return escapeHtml(overlay.source);
}

export function overlayStyle(
  overlay: Overlay,
  viewBox: string | null | undefined,
  profile: DiagramSizeProfile,
): { left: number; top: number; transform: string } {
  const parsed = parseViewBox(viewBox) ?? { x: 0, y: 0, w: 300, h: 165 };
  const scale = getDisplayScale(viewBox, profile);
  const left = (overlay.x - parsed.x) * scale;
  const top = (overlay.y - parsed.y) * scale;
  const ax = overlay.anchor === 'start' ? '0%' : overlay.anchor === 'end' ? '-100%' : '-50%';
  const ay = overlay.baseline === 'hanging' ? '0%' : overlay.baseline === 'alphabetic' ? '-100%' : '-50%';
  return { left, top, transform: `translate(${ax}, ${ay})` };
}

export function overlayStyleAttr(
  overlay: Overlay,
  viewBox: string | null | undefined,
  profile: DiagramSizeProfile,
): string {
  const s = overlayStyle(overlay, viewBox, profile);
  return `position:absolute;left:${s.left}px;top:${s.top}px;transform:${s.transform};pointer-events:none;white-space:nowrap;color:#0f1117;`;
}
