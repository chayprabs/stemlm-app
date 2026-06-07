/**
 * Mount sanitized SVG markup into a container (Shadow DOM safe).
 *
 * React's innerHTML path can fail to size or namespace SVG correctly in some
 * extension contexts; DOMParser + importNode is more reliable.
 */
export function mountSvgMarkup(container: HTMLElement, svgMarkup: string): boolean {
  container.replaceChildren();
  if (!svgMarkup) return false;

  const doc = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml');
  const root = doc.documentElement;
  const parseError = doc.querySelector('parsererror');
  if (!parseError && root?.tagName.toLowerCase() === 'svg') {
    container.append(document.importNode(root, true));
    return hasDrawableSvgContent(container);
  }

  const staging = document.createElement('div');
  staging.innerHTML = svgMarkup;
  const svg = staging.querySelector('svg');
  if (svg) {
    container.append(document.importNode(svg, true));
    return hasDrawableSvgContent(container);
  }

  return false;
}

function hasDrawableSvgContent(container: HTMLElement): boolean {
  const svg = container.querySelector('svg');
  if (!svg) return false;
  return Boolean(
    svg.querySelector('line, path, polyline, polygon, rect, circle, ellipse, text, image, use'),
  );
}
