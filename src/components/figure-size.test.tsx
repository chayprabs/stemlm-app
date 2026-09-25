import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DiagramRenderer } from './DiagramRenderer';
import { useStore } from '@/src/state/store';
import { CONTENT_SCALE_DIAGRAM_FACTOR, DEFAULT_SETTINGS, type ContentScale } from '@/src/lib/settings';
import { frameSize } from '@/src/lib/figure/scene-build';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PANEL_CSS = readFileSync(resolve(process.cwd(), 'assets/panel.css'), 'utf8');
const PLOT = { type: 'plot', content: 'fn: x^2\ndomain: 0 4\nxlabel: t (s)\nylabel: x (m)' } as const;

function levelTokens(level: ContentScale): { width: number; height: number; solution: number } {
  const selector = level === 2 ? '.slm-panel {' : `.slm-panel[data-content-scale='${level}'] {`;
  const at = PANEL_CSS.indexOf(selector);
  const block = PANEL_CSS.slice(at, PANEL_CSS.indexOf('}', at));
  const read = (name: string) => Number(new RegExp(`${name}:\\s*([\\d.]+)px`).exec(block)?.[1]);
  return {
    width: read('--slm-content-diagram-width'),
    height: read('--slm-content-diagram-height'),
    solution: read('--slm-content-solution-diagram-height'),
  };
}

describe('FIG-SIZE-01 panel figure budget', () => {
  let root: Root | undefined;
  let host: HTMLElement | undefined;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    useStore.setState({ settings: DEFAULT_SETTINGS });
  });

  it('shows a step figure at least 1.35x its compile frame at the default reading level', () => {
    expect(CONTENT_SCALE_DIAGRAM_FACTOR[2]).toBeGreaterThanOrEqual(1.35);
    const tokens = levelTokens(2);
    expect(tokens.width).toBeGreaterThanOrEqual(frameSize('step').w * 1.35);
    expect(tokens.height).toBeGreaterThanOrEqual(frameSize('step').h * 1.35);
  });

  it('keeps the CSS figure box in step with the renderer factor at every reading level', () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      const factor = CONTENT_SCALE_DIAGRAM_FACTOR[level];
      const tokens = levelTokens(level);
      expect(Math.abs(tokens.width - frameSize('step').w * factor), `width ${level}`).toBeLessThanOrEqual(1);
      expect(Math.abs(tokens.height - frameSize('step').h * factor), `height ${level}`).toBeLessThanOrEqual(1);
      expect(Math.abs(tokens.solution - frameSize('solution').h * factor), `solution ${level}`).toBeLessThanOrEqual(1);
    }
  });

  it('never caps a sectioned figure below its own token budget', () => {
    for (const selector of ['.slm-diagram--step .slm-diagram-svg svg', '.slm-diagram--solution .slm-diagram-svg svg']) {
      const at = PANEL_CSS.indexOf(`${selector} {`);
      const block = PANEL_CSS.slice(at, PANEL_CSS.indexOf('}', at));
      expect(block, selector).not.toMatch(/max-height:\s*\d+px/);
    }
  });

  it('renders the compiled step figure at the enlarged default size', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    await act(async () => {
      root = createRoot(host!);
      root.render(<DiagramRenderer diagram={PLOT} theme="light" section />);
    });
    for (let i = 0; i < 40 && !host.querySelector('.slm-diagram-svg svg'); i++) {
      await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    }
    const svg = host.querySelector('.slm-diagram-svg svg')!;
    expect(Number(svg.getAttribute('width'))).toBeGreaterThanOrEqual(Math.round(frameSize('step').w * 1.35));
  });
});
