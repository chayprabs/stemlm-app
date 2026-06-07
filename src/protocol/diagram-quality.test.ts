import { describe, it, expect } from 'vitest';
import type { Capsule, Step } from './types';
import {
  auditCapsuleDiagrams,
  isVisualDenseProblem,
  stepNeedsDiagram,
} from './diagram-quality';

function makeStep(partial: Partial<Step> & { index: number; title: string }): Step {
  return {
    id: `s${partial.index}`,
    body: partial.body ?? 'work',
    ...partial,
  };
}

function makeCapsule(steps: Step[], question = 'Consider the circuit below with nodes A and B.'): Capsule {
  return {
    meta: {
      version: 1,
      subject: 'Electrical',
      topic: 'Nodal analysis',
      question,
    },
    steps,
    solution: 'done',
    solutionDiagrams: [],
  };
}

const MINIMAL_SVG =
  '<svg viewBox="0 0 100 100"><line x1="10" y1="10" x2="90" y2="90" stroke="black"/></svg>';

describe('stepNeedsDiagram', () => {
  it('flags node labeling and KCL steps', () => {
    expect(stepNeedsDiagram(makeStep({ index: 1, title: 'Label all nodes and pick ground' }))).toBe(true);
    expect(stepNeedsDiagram(makeStep({ index: 2, title: 'Apply KCL at node C' }))).toBe(true);
    expect(stepNeedsDiagram(makeStep({ index: 3, title: 'Solve for VA numerically' }))).toBe(false);
  });
});

describe('auditCapsuleDiagrams', () => {
  it('flags sparse circuit capsules like lazy model output', () => {
    const capsule = makeCapsule([
      makeStep({
        index: 1,
        title: 'Model dependent source branch',
        diagram: { type: 'svg', content: MINIMAL_SVG },
      }),
      makeStep({ index: 2, title: 'Apply KCL at nodes C and D' }),
      makeStep({ index: 3, title: 'Formulate global KCL at node A' }),
      makeStep({ index: 4, title: 'Calculate branch voltages' }),
      makeStep({ index: 5, title: 'Apply Superposition isolating Vs' }),
      makeStep({ index: 6, title: 'Apply Superposition isolating Is' }),
      makeStep({ index: 7, title: 'Determine Thevenin open-circuit voltage' }),
      makeStep({ index: 8, title: 'Determine Thevenin resistance' }),
      makeStep({ index: 9, title: 'Compute dependent source power' }),
    ]);
    expect(isVisualDenseProblem(capsule)).toBe(true);
    const issues = auditCapsuleDiagrams(capsule);
    expect(issues).toContain('missing_circuit_diagram');
    expect(issues).toContain('insufficient_diagrams');
  });

  it('passes dense electrical fixtures with diagrams on every step', () => {
    const steps = Array.from({ length: 6 }, (_, i) =>
      makeStep({
        index: i + 1,
        title: `Step ${i + 1}`,
        diagram: { type: 'svg', content: MINIMAL_SVG },
      }),
    );
    const capsule = makeCapsule(steps);
    expect(auditCapsuleDiagrams(capsule)).toEqual([]);
  });

  it('flags text-only lazy SVG', () => {
    const capsule = makeCapsule([
      makeStep({
        index: 1,
        title: 'Label nodes',
        diagram: { type: 'svg', content: '<svg viewBox="0 0 100 100"><text x="10" y="20">A</text></svg>' },
      }),
      makeStep({ index: 2, title: 'Apply KCL at node C', diagram: { type: 'svg', content: MINIMAL_SVG } }),
      makeStep({ index: 3, title: 'Apply KCL at node D', diagram: { type: 'svg', content: MINIMAL_SVG } }),
    ]);
    expect(auditCapsuleDiagrams(capsule)).toContain('diagram_lacks_graphics');
  });
});
