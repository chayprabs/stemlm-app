import { expect, it } from 'vitest';
import { measureBreaks } from './pdf-raster';
import { CONTENT_HEIGHT_PX, planPages } from './pdf-paginate';

it('keeps SVG label ink together when an oversized figure crosses a PDF page', () => {
  const root = document.createElement('div');
  root.innerHTML = '<div class="slm-step-diagram"><div class="slm-diagram-svg"><svg><text>row value</text></svg></div></div>';
  root.getBoundingClientRect = () => new DOMRect(0, 0, 688, 2500);
  root.querySelector('.slm-step-diagram')!.getBoundingClientRect = () => new DOMRect(0, 100, 688, 2400);
  root.querySelector('text')!.getBoundingClientRect = () => new DOMRect(30, 1027, 120, 15);
  const measurement = measureBreaks(root);
  const pages = planPages({ ...measurement, pageHeight: CONTENT_HEIGHT_PX });
  expect(measurement.forbidden).toContainEqual([1025, 1044]);
  expect(pages.some(page => page.top > 1025 && page.top < 1044)).toBe(false);
});
