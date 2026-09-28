/**
 * PDF-DIAG-01: print figures are laid out in the 480 x 275 print frame; the
 * report crops each one to what it actually draws, at the same scale.
 */
import { describe, it, expect } from 'vitest';
import { trimReportFigures } from './pdf-raster';

/** A report figure whose drawing and math label occupy only the lower middle of the frame. */
function figure(): { root: HTMLElement; svg: SVGSVGElement; overlay: HTMLElement } {
  const root = document.createElement('div');
  root.innerHTML =
    '<div class="slm-report-diagram"><div class="slm-diagram-frame">' +
    '<div class="slm-diagram-svg"><svg viewBox="0 0 480 275" width="480" height="275" style="display:block;width:480px;height:275px;max-width:100%;"><line x1="180" y1="200" x2="330" y2="250"/></svg></div>' +
    '<div class="slm-diagram-overlay" style="position:absolute;left:50%;top:60%;transform:translate(-50%, -50%);"></div>' +
    '</div></div>';
  const svg = root.querySelector('svg') as SVGSVGElement;
  const overlay = root.querySelector('.slm-diagram-overlay') as HTMLElement;
  // Layout stubs: the svg renders at 1 px per user unit from (0, 0).
  Object.assign(svg, {
    getBBox: () => ({ x: 180, y: 200, width: 150, height: 50 }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 480, height: 275, right: 480, bottom: 275 }),
  });
  // The label is centred on (240, 165), 40 x 20.
  overlay.getBoundingClientRect = () => ({ left: 220, top: 155, width: 40, height: 20, right: 260, bottom: 175 }) as DOMRect;
  return { root, svg, overlay };
}

describe('PDF-DIAG-01 report figures', () => {
  it('crops the viewBox to the drawing and its labels, keeping the scale', () => {
    const { root, svg, overlay } = figure();
    trimReportFigures(root);
    // Union of line (180..330 x 200..250) and label (220..260 x 155..175), padded by 8.
    expect(svg.getAttribute('viewBox')).toBe('172 147 166 111');
    expect(svg.getAttribute('width')).toBe('166');
    expect(svg.getAttribute('height')).toBe('111');
    expect(svg.style.height).toBe('111px');
    // The label keeps its user-space position (240, 165) inside the new box.
    expect(parseFloat(overlay.style.left)).toBeCloseTo(((240 - 172) / 166) * 100, 2);
    expect(parseFloat(overlay.style.top)).toBeCloseTo(((165 - 147) / 111) * 100, 2);
  });

  it('leaves a figure that already fills its frame, or cannot be measured, untouched', () => {
    const { root, svg } = figure();
    Object.assign(svg, { getBBox: () => ({ x: 2, y: 2, width: 476, height: 271 }) });
    trimReportFigures(root);
    expect(svg.getAttribute('viewBox')).toBe('0 0 480 275');

    const other = figure();
    Object.assign(other.svg, { getBBox: () => { throw new Error('not rendered'); } });
    trimReportFigures(other.root);
    expect(other.svg.getAttribute('viewBox')).toBe('0 0 480 275');
  });
});
