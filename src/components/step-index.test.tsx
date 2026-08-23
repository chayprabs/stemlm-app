import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StepIndexMark } from './step-index';

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
});
