import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DiagramRenderer } from './DiagramRenderer';
import type { Diagram } from '@/src/protocol/types';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const EXACT: Diagram = { type: 'plot', content: 'fn: x^2\ndomain: -3 3' };
// The same figure the way a weaker model writes it: wrong key names and a worded range.
const DRIFTED: Diagram = { type: 'plot', content: 'function: x^2\nrange: -3 to 3' };
// A key no family reads: repair must not guess, so nothing is drawn.
const UNKNOWN: Diagram = { type: 'plot', content: 'fn: x^2\ndomain: -3 3\nmystery: 7' };

async function settle(check: () => boolean, budgetMs = 4000): Promise<void> {
  const deadline = Date.now() + budgetMs;
  while (!check() && Date.now() < deadline) {
    await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
  }
}

describe('a figure drawn from corrected notation', () => {
  let host: HTMLElement | undefined;
  let root: Root | undefined;
  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
  });

  async function mount(diagram: Diagram, wait: (el: HTMLElement) => boolean, budgetMs?: number) {
    host = document.createElement('div');
    document.body.appendChild(host);
    await act(async () => {
      root = createRoot(host!);
      root.render(<DiagramRenderer diagram={diagram} theme="light" section />);
    });
    await settle(() => wait(host!), budgetMs);
    return host!;
  }

  const drawn = (el: HTMLElement) => Boolean(el.querySelector('.slm-diagram-svg svg'));

  it('says so beside the figure label', async () => {
    const el = await mount(DRIFTED, drawn);
    expect(drawn(el)).toBe(true);
    const note = el.querySelector('.slm-diagram-note');
    expect(note?.textContent).toContain('Auto-corrected');
    expect(note?.getAttribute('title')).toMatch(/content is unchanged/i);
  });

  it('adds nothing to a figure that compiled as written', async () => {
    const el = await mount(EXACT, drawn);
    expect(drawn(el)).toBe(true);
    expect(el.querySelector('.slm-diagram-note')).toBeNull();
  });

  it('draws nothing, and no empty plate, when repair would have to guess', async () => {
    // Nothing to wait for: give the compile and the repair attempt time to finish, then look.
    const el = await mount(UNKNOWN, () => false, 700);
    expect(el.querySelector('.slm-step-diagram')).toBeNull();
    expect(el.textContent).toBe('');
  });
});
