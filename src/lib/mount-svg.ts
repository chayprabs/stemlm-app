/**
 * Mount sanitized SVG markup into a container (Shadow DOM safe).
 *
 * Uses innerHTML first (same path as PDF export) for reliable browser rendering;
 * DOMParser + importNode is the fallback when HTML parsing fails.
 */
import { extractSvg, sanitizeSvg } from './sanitize';

const GRAPHIC_SHAPE_SELECTOR =
  'line, path, polyline, polygon, rect, circle, ellipse, use';

function hasDrawing(root: Element): boolean {
  const measurable = (shape: Element): boolean => {
    const value = (name: string) => Number(shape.getAttribute(name) ?? 0);
    switch (shape.tagName.toLowerCase()) {
      case 'circle': return value('r') > 0;
      case 'ellipse': return value('rx') > 0 && value('ry') > 0;
      case 'rect': return value('width') > 0 && value('height') > 0;
      case 'line': return value('x1') !== value('x2') || value('y1') !== value('y2');
      case 'path': return /[lhvcsqta]/i.test(shape.getAttribute('d') ?? '');
      case 'polyline': case 'polygon': return (shape.getAttribute('points')?.trim().split(/[\s,]+/).length ?? 0) >= 4;
      case 'use': {
        const href = shape.getAttribute('href') ?? shape.getAttribute('xlink:href');
        return Boolean(href?.startsWith('#') && [...root.querySelectorAll('[id]')].some(node => node.id === href.slice(1) && node !== shape));
      }
      default: return false;
    }
  };
  return [...root.querySelectorAll(GRAPHIC_SHAPE_SELECTOR)].some(shape => {
    for (let node: Element | null = shape; node && node !== root; node = node.parentElement) {
      if (['defs', 'marker', 'clippath', 'mask', 'pattern', 'symbol'].includes(node.tagName.toLowerCase()) ||
        node.getAttribute('display') === 'none' || node.getAttribute('visibility') === 'hidden' ||
        node.getAttribute('opacity') === '0') return false;
    }
    return measurable(shape);
  });
}

/** True when markup contains real drawing primitives (not labels alone). */
export function svgMarkupHasGraphicShapes(svgMarkup: string): boolean {
  svgMarkup = sanitizeSvg(extractSvg(svgMarkup));
  if (!svgMarkup.trim()) return false;

  const doc = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml');
  const parseError = doc.querySelector('parsererror');
  if (!parseError && doc.documentElement?.tagName.toLowerCase() === 'svg') {
    return hasDrawing(doc.documentElement);
  }

  const staging = document.createElement('div');
  staging.innerHTML = svgMarkup;
  const svg = staging.querySelector('svg');
  return Boolean(svg && hasDrawing(svg));
}

export function mountSvgMarkup(container: HTMLElement, svgMarkup: string): boolean {
  container.replaceChildren();
  if (!svgMarkup) return false;

  container.innerHTML = svgMarkup;
  if (container.querySelector('svg') && svgMarkupHasGraphicShapes(svgMarkup)) {
    return true;
  }

  container.replaceChildren();
  const doc = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml');
  const root = doc.documentElement;
  const parseError = doc.querySelector('parsererror');
  if (!parseError && root?.tagName.toLowerCase() === 'svg') {
    container.append(document.importNode(root, true));
    return svgMarkupHasGraphicShapes(svgMarkup);
  }

  const staging = document.createElement('div');
  staging.innerHTML = svgMarkup;
  const svg = staging.querySelector('svg');
  if (svg) {
    container.append(document.importNode(svg, true));
    return svgMarkupHasGraphicShapes(svgMarkup);
  }

  return false;
}
