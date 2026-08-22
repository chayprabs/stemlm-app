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
});
