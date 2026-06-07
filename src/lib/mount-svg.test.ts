import { describe, it, expect } from 'vitest';
import { mountSvgMarkup } from './mount-svg';
import { resolveDiagramSvg } from './resolve-diagram';

const THEVENIN_SVG = `<svg viewBox="0 0 300 150">
   <circle cx="250" cy="40" r="4" fill="white" stroke="black" stroke-width="2"/>
   <text x="260" y="45" font-family="sans-serif" font-size="14">Port 2 (+)</text>
   <line x1="80" y1="120" x2="250" y2="120" stroke="black" stroke-width="2"/>
   <rect x="160" y="30" width="40" height="20" fill="white" stroke="black" stroke-width="2"/>
   <text x="170" y="45" font-family="sans-serif" font-size="12">Z_3</text>
   <path d="M 280 80 L 250 80 M 260 70 L 250 80 L 260 90" fill="none" stroke="blue" stroke-width="2"/>
   <text x="285" y="85" font-family="sans-serif" font-size="14" fill="blue">Z_th</text>
</svg>`;

describe('mountSvgMarkup', () => {
  it('inserts parsed svg nodes into the container', () => {
    const host = document.createElement('div');
    const ok = mountSvgMarkup(
      host,
      '<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><text x="1" y="10">mounted</text></svg>',
    );
    expect(ok).toBe(true);
    expect(host.querySelector('svg text')?.textContent).toBe('mounted');
  });

  it('mounts resolved thevenin SVG with lines inside shadow DOM', async () => {
    const svg = await resolveDiagramSvg({ type: 'svg', content: THEVENIN_SVG }, 'dark', 'step');
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const mount = document.createElement('div');
    shadow.appendChild(mount);

    expect(mountSvgMarkup(mount, svg)).toBe(true);
    expect(mount.querySelector('line')).toBeTruthy();
    expect(mount.querySelector('path')).toBeTruthy();
    expect(mount.querySelector('rect')).toBeTruthy();
    expect(mount.querySelector('svg')?.getAttribute('width')).toBeTruthy();
  });
});
