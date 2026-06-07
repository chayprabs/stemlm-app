import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SolutionView } from './SolutionView';
import { parse } from '@/src/protocol/parser';
import { FENCED_ELECTRICAL } from '@/src/protocol/__fixtures__';
import type { Session } from '@/src/protocol/types';

function buildSession(): Session {
  const result = parse(FENCED_ELECTRICAL);
  return {
    id: 'structural',
    createdAt: 0,
    updatedAt: 0,
    platform: 'gemini',
    question: 'Structural fixture question.',
    capsule: result.capsule!,
    reviewedStepIds: [],
    raw: '',
  };
}

describe('SolutionView', () => {
  it('renders the question, steps with diagrams, and the full solution', () => {
    const session = buildSession();
    const html = renderToStaticMarkup(<SolutionView session={session} theme="light" />);

    expect(html).toContain('Question');
    expect(html).toContain('Structural fixture question.');
    expect(html).toContain('Step-by-step');
    expect(html).toContain('Label the circuit');
    expect(html).toContain('slm-step-diagram');
    expect(html).toContain('Full solution');
    expect(html).toContain('katex');
    expect(session.capsule.steps.some((s) => s.diagram)).toBe(true);
  });
});
