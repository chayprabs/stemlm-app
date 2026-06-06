import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SolutionView } from './SolutionView';
import { parse } from '@/src/protocol/parser';
import { RLC_AC_IMPEDANCE } from '@/src/protocol/__fixtures__';
import type { Session } from '@/src/protocol/types';

function buildRlcSession(): Session {
  const result = parse(RLC_AC_IMPEDANCE);
  return {
    id: 'rlc',
    createdAt: 0,
    updatedAt: 0,
    platform: 'gemini',
    question: 'Series RLC at 60 Hz — find Z, I, and circuit nature.',
    capsule: result.capsule!,
    reviewedStepIds: [],
    raw: '',
  };
}

describe('SolutionView', () => {
  it('renders the question, every step with diagrams, and the full solution', () => {
    const session = buildRlcSession();
    const html = renderToStaticMarkup(<SolutionView session={session} theme="light" />);

    expect(html).toContain('Question');
    expect(html).toContain('Series RLC at 60 Hz');
    expect(html).toContain('Step-by-step');
    expect(html).toContain('Compute angular frequency');
    expect(html).toContain('inductive reactance');
    expect(html).toContain('slm-step-diagram');
    expect(html).toContain('Full solution');
    expect(html).toContain('katex');
    expect(session.capsule.steps.some((s) => s.diagram)).toBe(true);
  });
});
