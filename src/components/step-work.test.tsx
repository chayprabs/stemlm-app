import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StepWork } from './StepWork';

describe('StepWork', () => {
  it('labels worked calculation and renders body', () => {
    const html = renderToStaticMarkup(
      <StepWork
        step={{
          id: 's1',
          index: 3,
          title: 'Compute capacitive reactance',
          formula: '$$X_C = \\frac{1}{\\omega C}$$',
          body: '$X_C$ is capacitive reactance. Plug in: $X_C=1/(377\\times10\\times10^{-6})\\approx265.3\\,\\Omega$.',
        }}
      />,
    );
    expect(html).toContain('slm-step-work-label');
    expect(html).toContain('Work');
    expect(html).toContain('capacitive reactance');
  });

  it('shows a quality note when body is missing but formula exists', () => {
    const html = renderToStaticMarkup(
      <StepWork
        step={{
          id: 's1',
          index: 3,
          title: 'Compute capacitive reactance',
          formula: '$$X_C = \\frac{1}{\\omega C}$$',
          body: '',
        }}
      />,
    );
    expect(html).toContain('slm-step-quality-note');
    expect(html).toContain('no @body');
  });
});
