/**
 * Mount sanitized SVG markup into a container (Shadow DOM safe).
 *
 * Uses innerHTML first (same path as PDF export) for reliable browser rendering;
 * DOMParser + importNode is the fallback when HTML parsing fails.
 */
const GRAPHIC_SHAPE_SELECTOR =
  'line, path, polyline, polygon, rect, circle, ellipse, use';

/** True when markup contains real drawing primitives (not labels alone). */
export function svgMarkupHasGraphicShapes(svgMarkup: string): boolean {
  if (!svgMarkup.trim()) return false;

  const doc = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml');
  const parseError = doc.querySelector('parsererror');
  if (!parseError && doc.documentElement?.tagName.toLowerCase() === 'svg') {
    return Boolean(doc.documentElement.querySelector(GRAPHIC_SHAPE_SELECTOR));
  }

  const staging = document.createElement('div');
  staging.innerHTML = svgMarkup;
  const svg = staging.querySelector('svg');
  return Boolean(svg?.querySelector(GRAPHIC_SHAPE_SELECTOR));
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
