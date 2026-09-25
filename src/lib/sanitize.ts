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
    for (const attr of Array.from(el.attributes ?? [])) {
      if (/^on/i.test(attr.name)) {
        el.removeAttribute(attr.name);
        continue;
      }
      if (attr.name.toLowerCase() === 'style') el.removeAttribute(attr.name);
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

/** Remove any remaining remote href/xlink:href, styles and handlers (defense in depth). */
function stripRemoteRefs(svg: string): string {
  return svg
    .replace(/<\s*(?:foreignObject|image)\b[\s\S]*?<\s*\/\s*(?:foreignObject|image)\s*>/gi, '')
    .replace(/<\s*(?:foreignObject|image|img)\b[^>]*\/?>/gi, '')
    .replace(/\s(?:xlink:)?href\s*=\s*(["'])(?!#)[^"']*\1/gi, '')
    .replace(/\surl\((?!#)[^)]+\)/gi, '')
    .replace(/\s(?:style|on[a-z]+)\s*=\s*(["'])[\s\S]*?\1/gi, '');
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
    // An embedded stylesheet can be treated as raw text by some DOM
    // implementations and consume the remaining SVG tree.
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, '');
}

function safeViewBox(raw: string | undefined): string | null {
  if (raw === undefined) return '0 0 100 100';
  const values = raw.trim().split(/[\s,]+/).map(Number);
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value)) || values[2]! <= 0 || values[3]! <= 0) {
    return null;
  }
  return values.join(' ');
}

/** Returns sanitized SVG markup, or empty string if nothing usable remains. */
export function sanitizeSvg(svg: string): string {
  if (!svg) return '';
  // Bound synchronous DOM work as well as source size. Counting delimiters is
  // deliberately conservative (quoted delimiters also consume the budget).
  if (svg.length > 2_000_000) return '';
  let elements = 0;
  let attributes = 0;
  for (const char of svg) {
    if (char === '<' && ++elements > 4_096) return '';
    if (char === '=' && ++attributes > 32_768) return '';
  }
  const viewBox = safeViewBox(/viewBox\s*=\s*["']([^"']+)["']/i.exec(svg)?.[1]);
  if (!viewBox) return '';
  const compilerFamily = /\bdata-stemlm-family\s*=\s*["']([A-Za-z][A-Za-z0-9_-]*)["']/i.exec(svg)?.[1];
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
      'class',
      // Compiler-owned identity used by reports and visual acceptance checks.
      // Keep this one explicit instead of allowing arbitrary data-* payloads.
      'data-stemlm-family',
    ],
    FORBID_TAGS: ['script', 'style', 'foreignObject', 'image', 'img'],
  });
  let result = stripRemoteRefs(clean).trim();
  if (result && !/^<svg[\s>]/i.test(result)) {
    result = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${result}</svg>`;
  }
  // DOMPurify's SVG profile can still remove data-* attributes even when an
  // exact name is listed in ADD_ATTR. Restore only the compiler marker, with
  // a token-shaped value captured before sanitization; arbitrary data attrs
  // remain removed.
  if (result && compilerFamily && !/\bdata-stemlm-family\s*=/i.test(result)) {
    result = result.replace(/^<svg\b/i, `<svg data-stemlm-family="${compilerFamily}"`);
  }
  return result;
}

/** Extract the first <svg>...</svg> from arbitrary text, else return as-is. */
export function extractSvg(content: string): string {
  const m = /<svg[\s\S]*?<\/svg>/i.exec(content);
  return m ? m[0] : content;
}
