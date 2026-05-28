/**
 * SVG sanitization for AI-generated diagrams.
 *
 * The model returns raw <svg> markup; we never inject it without sanitizing.
 * DOMPurify with the SVG profile strips scripts, event handlers, and dangerous
 * content while keeping the drawing primitives we need. We add a regex backstop
 * for remote href/xlink:href references so external loads can never slip through
 * regardless of DOM implementation quirks.
 */
import DOMPurify from 'dompurify';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    const el = node as Element;
    for (const attr of ['href', 'xlink:href']) {
      const val = el.getAttribute?.(attr);
      if (val && !val.startsWith('#')) {
        el.removeAttribute(attr);
      }
    }
  });
  configured = true;
}

/** Remove any remaining remote href/xlink:href (defense in depth). */
function stripRemoteRefs(svg: string): string {
  return svg.replace(/\s(?:xlink:)?href\s*=\s*(["'])(?!#)[^"']*\1/gi, '');
}

/** Returns sanitized SVG markup, or empty string if nothing usable remains. */
export function sanitizeSvg(svg: string): string {
  if (!svg) return '';
  ensureConfigured();
  const clean = DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['marker', 'use'],
    ADD_ATTR: [
      'marker-end',
      'marker-start',
      'marker-mid',
      'orient',
      'refX',
      'refY',
      'markerWidth',
      'markerHeight',
    ],
    FORBID_TAGS: ['script', 'foreignObject', 'image'],
    FORBID_ATTR: ['onload', 'onclick', 'onmouseover'],
  });
  return stripRemoteRefs(clean).trim();
}

/** Extract the first <svg>...</svg> from arbitrary text, else return as-is. */
export function extractSvg(content: string): string {
  const m = /<svg[\s\S]*?<\/svg>/i.exec(content);
  return m ? m[0] : content;
}
