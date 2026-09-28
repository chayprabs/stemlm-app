import katex from 'katex';
import type { Overlay } from './types';
import { getDisplayScale, parseViewBox, type DiagramSizeProfile } from '@/src/lib/diagram-bounds';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** KaTeX's `.katex` rule draws at 1.21em of its container. */
const KATEX_EM = 1.21;

/**
 * The overlay's own font size as a share of its frame's width (`cqw`), so a math label draws at the size
 * the label kernel placed it at and scales with the SVG like the figure's own text.
 */
export function overlayMathSize(overlay: Overlay, viewBoxWidth: number): string | undefined {
  if (overlay.kind !== 'katex' || !overlay.fontSize || !(viewBoxWidth > 0)) return undefined;
  return `${Number(((overlay.fontSize / KATEX_EM) * (100 / viewBoxWidth)).toFixed(4))}cqw`;
}

/** Overlay source is always KaTeX-rendered or escaped text — never raw model innerHTML. */
export function renderOverlayHtml(overlay: Overlay, strict = false): string {
  if (overlay.kind === 'katex') {
    const tex = overlay.source.replace(/^\$+|\$+$/g, '').trim();
    try {
      return katex.renderToString(tex, {
        throwOnError: strict,
        output: 'htmlAndMathml',
        displayMode: false,
        trust: false,
      });
    } catch (error) {
      if (strict) throw error;
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

/**
 * PDF labels use percentages of the viewBox so they follow the SVG frame.
 * The panel uses the same anchors with its responsive display-size budget.
 */
export function overlayPrintStyleAttr(
  overlay: Overlay,
  viewBox: string | null | undefined,
): string {
  const parsed = parseViewBox(viewBox) ?? { x: 0, y: 0, w: 300, h: 165 };
  const left = Number((((overlay.x - parsed.x) / parsed.w) * 100).toFixed(3));
  const top = Number((((overlay.y - parsed.y) / parsed.h) * 100).toFixed(3));
  const ax = overlay.anchor === 'start' ? '0%' : overlay.anchor === 'end' ? '-100%' : '-50%';
  const ay =
    overlay.baseline === 'hanging' ? '0%' : overlay.baseline === 'alphabetic' ? '-100%' : '-50%';
  return `position:absolute;left:${left}%;top:${top}%;transform:translate(${ax}, ${ay});pointer-events:none;white-space:nowrap;color:#0f1117;`;
}
