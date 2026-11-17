import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FIGURE_INK, PAIR_SQUEEZE, StepIndexMark, pairLayout } from './step-index';

describe('StepIndexMark', () => {
  it('renders a filled numeral path for 1–9', () => {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      const html = renderToStaticMarkup(<StepIndexMark n={n} />);
      expect(html, `mark ${n}`).toContain('<path');
      expect(html, `mark ${n}`).toContain('slm-step-index');
      expect(html, `mark ${n}`).not.toMatch(/>\s*\d+\s*</);
    }
  });

  it('keeps 10–12 in one tile via two figures, not typeset digits', () => {
    for (const n of [10, 11, 12]) {
      const html = renderToStaticMarkup(<StepIndexMark n={n} />);
      expect(html.match(/<path/g)?.length, `mark ${n}`).toBeGreaterThanOrEqual(2);
      expect(html).not.toMatch(/>\s*1[012]\s*</);
    }
  });

  it('clamps out-of-range values into 1–12', () => {
    const low = renderToStaticMarkup(<StepIndexMark n={0} />);
    const high = renderToStaticMarkup(<StepIndexMark n={99} />);
    expect(low).toContain('<path');
    expect(high.match(/<path/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('redraws 3 as a filled path without the old left-spine bowls; 1 2 4 stay paths', () => {
    const three = renderToStaticMarkup(<StepIndexMark n={3} />);
    expect(three).toContain('<path');
    expect(three).toContain('slm-step-index');
    expect(three).not.toMatch(/>\s*3\s*</);
    expect(three).not.toContain(
      'M8.05 5.35h7.35c.15 2.45-1.7 4.15-3.35 5.15 2.15.45 4.35 1.9 4.35 4.7 0 2.55-2.05 4.45-5.4 4.45H7.7v-2.2h3.05c1.85 0 2.95-1 2.95-2.3 0-1.4-1.2-2.25-3.15-2.25H8.85v-2.05h2.55c1.6 0 2.6-.85 2.6-2.05 0-1.15-1-1.9-2.45-1.9H8.05V5.35Z',
    );

    const one = renderToStaticMarkup(<StepIndexMark n={1} />);
    const two = renderToStaticMarkup(<StepIndexMark n={2} />);
    const four = renderToStaticMarkup(<StepIndexMark n={4} />);
    expect(one).toContain('M10.2 7.55 13.55 5.2h2.15v13.55h-2.55V8.35l-2.95 1.7V7.55Z');
    expect(two).toContain('M7.15 8.1c0-2.4 2.2-4.2 5.15-4.2');
    expect(four).toContain('M13.45 4.8h2.55v8.05h1.9v2.2h-1.9v4.7h-2.55v-4.7H6.7');
    expect(one).not.toMatch(/>\s*1\s*</);
    expect(two).not.toMatch(/>\s*2\s*</);
    expect(four).not.toMatch(/>\s*4\s*</);
  });

  it('draws 13 to 20, the rest of what a capsule can hold, as two figures in one mark', () => {
    for (let n = 13; n <= 20; n++) {
      const html = renderToStaticMarkup(<StepIndexMark n={n} />);
      const root = document.createElement('div');
      root.innerHTML = html;
      const svg = root.querySelector('svg.slm-step-index')!;
      expect(svg.getAttribute('viewBox'), `mark ${n}`).toBe('0 0 24 24');
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.querySelectorAll('g > path'), `mark ${n}`).toHaveLength(2);
      expect(html, `mark ${n}`).not.toMatch(/>\s*\d+\s*</);
      // Every figure is a real glyph: none of the pair is missing its outline.
      for (const path of svg.querySelectorAll('path')) expect(path.getAttribute('d')!.length).toBeGreaterThan(20);
    }
    // 20 is the round number that used to collide: its figures are the 2 and the 0.
    const twenty = renderToStaticMarkup(<StepIndexMark n={20} />);
    expect(twenty).toContain('M7.15 8.1c0-2.4 2.2-4.2 5.15-4.2');
    expect(twenty).toContain('M12 4.55c3.2 0 5.35 2.3 5.35 7.45');
  });

  it('sets the two figures of 10 to 20 apart, centred as one number, inside the mark', () => {
    for (let n = 10; n <= 20; n++) {
      const tens = Math.floor(n / 10);
      const ones = n % 10;
      const { tensShift, onesShift, origin } = pairLayout(tens, ones);
      const at = (x: number) => origin + PAIR_SQUEEZE * x;
      const left = at(tensShift + FIGURE_INK[tens]![0]);
      const tensRight = at(tensShift + FIGURE_INK[tens]![1]);
      const onesLeft = at(onesShift + FIGURE_INK[ones]![0]);
      const right = at(onesShift + FIGURE_INK[ones]![1]);
      // A clear gap between the figures: they never touch or overlap.
      expect(onesLeft - tensRight, `gap in ${n}`).toBeGreaterThan(1);
      expect(onesLeft - tensRight, `gap in ${n}`).toBeLessThan(2.5);
      // The number is centred on the mark and stays well inside the 24-unit box.
      expect((left + right) / 2, `centre of ${n}`).toBeCloseTo(12, 1);
      expect(left, `left edge of ${n}`).toBeGreaterThanOrEqual(2);
      expect(right, `right edge of ${n}`).toBeLessThanOrEqual(22);
    }
  });

  it('centres a single figure on its ink', () => {
    for (const n of [2, 3, 4, 5, 6, 7, 8, 9]) {
      const html = renderToStaticMarkup(<StepIndexMark n={n} />);
      const shift = Number(/translate\((-?[\d.]+) 0\)/.exec(html)?.[1] ?? 0);
      const [left, right] = FIGURE_INK[n]!;
      expect((left + right) / 2 + shift, `figure ${n}`).toBeCloseTo(12, 1);
    }
  });

  it('draws 9 as a 9: a closed bowl on top and an open tail below, not a ring with a stroke through it', () => {
    const nine = renderToStaticMarkup(<StepIndexMark n={9} />);
    const six = renderToStaticMarkup(<StepIndexMark n={6} />);
    const d = (html: string) => /d="([^"]+)"/.exec(html)![1]!;
    // It is the 6 turned half a turn: the outline starts at the bottom where the 6 starts at the top,
    // and its counter (the second subpath) sits in the upper half.
    const start = (path: string) => /^M([\d.]+) ([\d.]+)/.exec(path)!.slice(1).map(Number) as [number, number];
    expect(start(d(nine))[1]).toBeGreaterThan(16);
    expect(start(d(six))[1]).toBeLessThan(8);
    expect(start(d(nine))[0] + start(d(six))[0]).toBeCloseTo(24, 1);
    expect(d(nine).split('Z').filter(Boolean)).toHaveLength(2);
    expect(d(nine)).not.toBe(d(six));
  });

  it('gives 7 a bar no heavier than the other figures\' strokes', () => {
    const d = /d="([^"]+)"/.exec(renderToStaticMarkup(<StepIndexMark n={7} />))![1]!;
    // M x top ... L x foot ... l dx -rise H ...: the stroke rises from the foot to the bar's underside.
    const top = Number(/^M[\d.]+ ([\d.]+)/.exec(d)![1]);
    const foot = Number(/L[\d.]+ ([\d.]+)/.exec(d)![1]);
    const rise = Number(/l[\d.]+-([\d.]+)H/.exec(d)![1]);
    const bar = foot - rise - top;
    expect(bar).toBeGreaterThan(1.8);
    expect(bar).toBeLessThan(3);
  });

});
