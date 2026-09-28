/**
 * SEC-02: hostile text in a figure spec travels spec -> engine -> emit -> sanitize ->
 * present and must arrive as inert text: no new element, no event-handler attribute.
 */
import { describe, it, expect } from 'vitest';
import { resolveDiagram } from './resolve-diagram';

const HOSTILE = '"><img src=x onerror=alert(1)>';

const SPECS = [
  { type: 'graph', content: `rankdir: LR\nnode: a ${HOSTILE}\nnode: b Pyruvate\nedge: a b step` },
  { type: 'table', content: `kind: matrix\nheaders: Quantity, Value\nrow: ${HOSTILE}, 1\nrow: Mass, 2 kg` },
];

describe('SEC-02 figure labels stay text', () => {
  it.each(SPECS)('$type', async (diagram) => {
    const resolved = await resolveDiagram(diagram, 'light', 'step');
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const root = new DOMParser().parseFromString(resolved.svg, 'image/svg+xml').documentElement;
    expect(root.querySelector('img, script, foreignObject, iframe')).toBeNull();
    const handlers = [...root.querySelectorAll('*')].flatMap((el) => [...el.attributes].filter((a) => /^on/i.test(a.name)));
    expect(handlers).toEqual([]);
    // Engines may wrap a long label over lines; the characters survive as text.
    expect(root.textContent?.replace(/\s+/g, '')).toContain('"><imgsrc=xonerror=alert(1)>');
  });
});
