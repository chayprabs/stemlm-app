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

  it('renders nothing when body and formula lack worked math', () => {
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
    expect(html).toBe('');
    expect(html).not.toContain('@body');
    expect(html).not.toContain('slm-step-quality-note');
  });

  it('shows worked formula under Work when body is empty', () => {
    const html = renderToStaticMarkup(
      <StepWork
        step={{
          id: 's1',
          index: 2,
          title: 'Calculate inductive reactance',
          formula: '$$X_L = \\omega L = 377 \\times 0.2 = 75.4\\,\\Omega$$',
          body: '',
        }}
      />,
    );
    expect(html).toContain('slm-step-work-body');
    expect(html).toContain('75.4');
    expect(html).not.toContain('has no @body');
  });

  it('never renders repair prompt text echoed into body', () => {
    const html = renderToStaticMarkup(
      <StepWork
        step={{
          id: 's1',
          index: 2,
          title: 'Calculate inductive reactance',
          formula: '$$X_L = \\omega L$$',
          body: 'Your previous stemLM capsule was incomplete or malformed. Re-emit the FULL answer as exactly one fenced block.',
        }}
      />,
    );
    expect(html).toBe('');
    expect(html).not.toContain('stemLM capsule');
  });

  it('never renders parser diagnostic text even if model echoed it in body', () => {
    const html = renderToStaticMarkup(
      <StepWork
        step={{
          id: 's1',
          index: 2,
          title: 'Calculate inductive reactance',
          formula: '$$X_L = \\omega L$$',
          body: 'Step 2 ("Calculate inductive reactance") has no @body — add symbol definitions and the worked calculation.',
        }}
      />,
    );
    expect(html).toBe('');
    expect(html).not.toContain('has no @body');
  });
});
