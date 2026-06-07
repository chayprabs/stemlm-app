import { describe, it, expect } from 'vitest';
import { mountSvgMarkup, svgMarkupHasGraphicShapes } from './mount-svg';
import { resolveDiagramSvg } from './resolve-diagram';

const THEVENIN_Z = `<svg viewBox="0 0 300 150">
   <circle cx="250" cy="40" r="4" fill="white" stroke="black" stroke-width="2"/>
   <circle cx="250" cy="120" r="4" fill="white" stroke="black" stroke-width="2"/>
   <text x="260" y="45" font-family="sans-serif" font-size="14">Port 2 (+)</text>
   <text x="260" y="125" font-family="sans-serif" font-size="14">Port 2 (-)</text>
   <line x1="80" y1="120" x2="250" y2="120" stroke="black" stroke-width="2"/>
   <line x1="80" y1="40" x2="80" y2="120" stroke="black" stroke-width="2"/>
   <line x1="80" y1="40" x2="160" y2="40" stroke="black" stroke-width="2"/>
   <rect x="160" y="30" width="40" height="20" fill="white" stroke="black" stroke-width="2"/>
   <text x="170" y="45" font-family="sans-serif" font-size="12">Z_3</text>
   <rect x="80" y="50" width="30" height="20" fill="white" stroke="black" stroke-width="2"/>
   <text x="85" y="65" font-family="sans-serif" font-size="11">Z_2</text>
   <rect x="30" y="50" width="40" height="20" fill="white" stroke="black" stroke-width="2"/>
   <text x="35" y="65" font-family="sans-serif" font-size="10">Z_1 + Z_s</text>
   <defs><marker id="arr" markerUnits="userSpaceOnUse" markerWidth="20" markerHeight="20" refX="10" refY="10"><path d="M0,0 L20,10 L0,20 L5,10 Z" fill="blue"/></marker></defs>
   <line x1="250" y1="80" x2="280" y2="80" stroke="blue" stroke-width="2" marker-end="url(#arr)"/>
   <text x="285" y="85" font-family="sans-serif" font-size="14" fill="blue">Z_th</text>
</svg>`;

describe('svgMarkupHasGraphicShapes', () => {
  it('requires shape primitives, not labels alone', () => {
    const labelsOnly =
      '<svg viewBox="0 0 100 40"><text x="1" y="10">Port 2 (+) Z_3</text></svg>';
    expect(svgMarkupHasGraphicShapes(labelsOnly)).toBe(false);
    expect(svgMarkupHasGraphicShapes(THEVENIN_Z)).toBe(true);
  });
});

describe('mountSvgMarkup', () => {
  it('inserts parsed svg nodes into the container via innerHTML', () => {
    const host = document.createElement('div');
    const ok = mountSvgMarkup(
      host,
      '<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><text x="1" y="10">mounted</text><line x1="0" y1="0" x2="10" y2="10" stroke="black"/></svg>',
    );
    expect(ok).toBe(true);
    expect(host.querySelector('svg line')).toBeTruthy();
    expect(host.querySelector('svg text')?.textContent).toBe('mounted');
  });

  it('mounts resolved thevenin Z diagram with lines inside shadow DOM', async () => {
    const svg = await resolveDiagramSvg({ type: 'svg', content: THEVENIN_Z }, 'dark', 'step');
    expect(svgMarkupHasGraphicShapes(svg)).toBe(true);
    expect(svg).toContain('<line');
    expect(svg).not.toContain('userSpaceOnUse');

    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const mount = document.createElement('div');
    mount.className = 'slm-diagram-svg';
    shadow.appendChild(mount);

    expect(mountSvgMarkup(mount, svg)).toBe(true);
    expect(mount.querySelector('line')).toBeTruthy();
    expect(mount.querySelector('rect')).toBeTruthy();
    expect(mount.querySelector('svg')?.getAttribute('width')).toBeTruthy();
  });
});
