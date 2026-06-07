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
let preserveInlineStyles = false;

function isDangerousInlineStyle(style: string): boolean {
  return (
    /url\s*\(\s*['"]?(?!#)[^'")]+/i.test(style) ||
    /javascript:/i.test(style) ||
    /expression\s*\(/i.test(style)
  );
}

function ensureConfigured() {
  if (configured) return;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    const el = node as Element;
    for (const attr of Array.from(el.attributes ?? [])) {
      if (/^on/i.test(attr.name)) {
        el.removeAttribute(attr.name);
        continue;
      }
      if (attr.name.toLowerCase() === 'style') {
        if (preserveInlineStyles) {
          if (isDangerousInlineStyle(attr.value)) el.removeAttribute(attr.name);
        } else {
          el.removeAttribute(attr.name);
        }
      }
    }
    if (el.tagName.toLowerCase() === 'svg') {
      el.removeAttribute('width');
      el.removeAttribute('height');
    }
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
function stripRemoteRefs(svg: string, keepSafeStyles = false): string {
  let out = svg
    .replace(/<\s*(?:foreignObject|image)\b[\s\S]*?<\s*\/\s*(?:foreignObject|image)\s*>/gi, '')
    .replace(/<\s*(?:foreignObject|image)\b[^>]*\/?>/gi, '')
    .replace(/\s(?:xlink:)?href\s*=\s*(["'])(?!#)[^"']*\1/gi, '')
    .replace(/\surl\((?!#)[^)]+\)/gi, '');
  if (keepSafeStyles) {
    out = out.replace(/\s+on[a-z]+\s*=\s*(["'])[\s\S]*?\1/gi, '');
    out = out.replace(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/gi, (match, _q, style: string) =>
      isDangerousInlineStyle(style) ? '' : match,
    );
  } else {
    out = out.replace(/\s(?:style|on[a-z]+)\s*=\s*(["'])[\s\S]*?\1/gi, '');
  }
  return out;
}

/**
 * Pre-strip dangerous content from raw SVG before DOMPurify processes it.
 *
 * 1. <script> tags: happy-dom's SVG parser treats <script> as a raw-text
 *    element whose content gobbles subsequent sibling elements, causing
 *    legitimate drawing primitives (polyline, path, etc.) to be lost.
 * 2. on* event-handler attributes: some DOM implementations remove the
 *    *entire element* when they encounter on* attributes on SVG primitives.
 */
function preStripDangerous(svg: string): string {
  return svg
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<script\b[^>]*\/?>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, '');
}

function safeViewBox(raw: string | undefined): string {
  if (!raw) return '0 0 100 100';
  const trimmed = raw.trim();
  return /^[\d.\s+-]+$/.test(trimmed) ? trimmed : '0 0 100 100';
}

export type SanitizeSvgOptions = {
  /** Keep safe inline `style` attributes (mermaid output). */
  preserveInlineStyles?: boolean;
};

/** Returns sanitized SVG markup, or empty string if nothing usable remains. */
export function sanitizeSvg(svg: string, options: SanitizeSvgOptions = {}): string {
  if (!svg) return '';
  const viewBox = safeViewBox(/viewBox\s*=\s*["']([^"']+)["']/i.exec(svg)?.[1]);
  preserveInlineStyles = options.preserveInlineStyles ?? false;
  ensureConfigured();
  const preClean = preStripDangerous(svg);
  const clean = DOMPurify.sanitize(preClean, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['marker'],
    ADD_ATTR: [
      'marker-end',
      'marker-start',
      'marker-mid',
      'orient',
      'refX',
      'refY',
      'markerWidth',
      'markerHeight',
      'markerUnits',
      'style',
      'class',
    ],
    FORBID_TAGS: preserveInlineStyles
      ? ['script', 'foreignObject', 'image']
      : ['script', 'style', 'foreignObject', 'image'],
  });
  let result = stripRemoteRefs(clean, preserveInlineStyles).trim();
  if (result && !/^<svg[\s>]/i.test(result)) {
    result = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${result}</svg>`;
  }
  return result;
}

/** Extract the first <svg>...</svg> from arbitrary text, else return as-is. */
export function extractSvg(content: string): string {
  const m = /<svg[\s\S]*?<\/svg>/i.exec(content);
  return m ? m[0] : content;
}
