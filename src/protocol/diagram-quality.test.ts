import { describe, it, expect } from 'vitest';
import type { Capsule, Step } from './types';
import {
  auditCapsuleDiagrams,
  auditStepDiagramCompleteness,
  extractMentionedComponents,
  isVisualDenseProblem,
  stepNeedsDiagram,
  svgMentionsComponent,
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

const RICH_EE_SVG = [
  '<svg viewBox="0 0 400 220">',
  '<line x1="30" y1="30" x2="100" y2="30" stroke="black"/>',
  '<line x1="100" y1="30" x2="100" y2="80" stroke="black"/>',
  '<line x1="100" y1="80" x2="200" y2="80" stroke="black"/>',
  '<line x1="200" y1="80" x2="200" y2="150" stroke="black"/>',
  '<line x1="200" y1="150" x2="30" y2="150" stroke="black"/>',
  '<circle cx="150" cy="80" r="12" stroke="black" fill="none"/>',
  '<rect x="110" y="100" width="20" height="8" stroke="black" fill="none"/>',
  '<text x="50" y="22">R1</text>',
  '<text x="170" y="75">N1</text>',
  '<text x="210" y="90">N2</text>',
  '</svg>',
].join('');

const LAZY_BJT_SVG = [
  '<svg viewBox="0 0 200 120">',
  '<line x1="40" y1="20" x2="40" y2="60" stroke="black"/>',
  '<text x="35" y="15">B</text>',
  '<line x1="40" y1="60" x2="40" y2="100" stroke="black"/>',
  '<text x="30" y="55">r_pi</text>',
  '<line x1="40" y1="100" x2="40" y2="110" stroke="black"/>',
  '<text x="25" y="108">R_E</text>',
  '<circle cx="80" cy="60" r="10" stroke="black" fill="none"/>',
  '<text x="72" y="64">gm</text>',
  '</svg>',
].join('');

describe('stepNeedsDiagram', () => {
  it('flags node labeling and KCL steps', () => {
    const cap = makeCapsule([]);
    expect(stepNeedsDiagram(makeStep({ index: 1, title: 'Label all nodes and pick ground' }), cap)).toBe(true);
    expect(stepNeedsDiagram(makeStep({ index: 2, title: 'Apply KCL at node C' }), cap)).toBe(true);
  });

  it('flags BJT and hybrid-pi steps for electrical', () => {
    const cap = makeCapsule([], 'BJT common-emitter amplifier with hybrid-pi model');
    expect(
      stepNeedsDiagram(
        makeStep({ index: 1, title: 'Draw small-signal hybrid-pi model with R_E' }),
        cap,
      ),
    ).toBe(true);
    expect(
      stepNeedsDiagram(makeStep({ index: 2, title: 'Derive input resistance R_in' }), cap),
    ).toBe(true);
  });
});

describe('extractMentionedComponents', () => {
  it('finds R_C, R_E, r_pi, g_m in body text', () => {
    const comps = extractMentionedComponents(
      'Replace BJT with hybrid-π: r_π, g_m v_be, R_E to ground, R_C at collector.',
    );
    expect(comps).toContain('rc');
    expect(comps).toContain('re');
    expect(comps).toContain('rpi');
    expect(comps).toContain('gm');
  });
});

describe('auditStepDiagramCompleteness', () => {
  it('flags lazy BJT hybrid-pi missing R_C, collector node, and too few primitives', () => {
    const cap = makeCapsule([], 'BJT common-emitter with emitter degeneration');
    const step = makeStep({
      index: 1,
      title: 'Draw small-signal hybrid-pi model with R_E',
      body: 'Replace the BJT with hybrid-π model: r_π base-emitter, g_m v_be controlled source, R_E unbypassed, R_C collector load.',
      diagram: { type: 'svg', content: LAZY_BJT_SVG },
    });
    expect(auditStepDiagramCompleteness(step, cap)).toContain('diagram_incomplete');
    expect(svgMentionsComponent(LAZY_BJT_SVG, 're')).toBe(true);
    expect(svgMentionsComponent(LAZY_BJT_SVG, 'rc')).toBe(false);
    expect(svgMentionsComponent(LAZY_BJT_SVG, 'c')).toBe(false);
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

  it('flags BJT capsule with one lazy partial diagram and missing step diagrams', () => {
    const capsule = makeCapsule(
      [
        makeStep({
          index: 1,
          title: 'Draw small-signal hybrid-pi model with R_E',
          body: 'hybrid-π with r_π, g_m, R_E, R_C collector load.',
          diagram: { type: 'svg', content: LAZY_BJT_SVG },
        }),
        makeStep({ index: 2, title: 'Derive input resistance R_in', body: 'R_in = r_π + (β+1)R_E.' }),
        makeStep({ index: 3, title: 'Derive voltage gain A_v', body: 'A_v = -g_m R_C / (1 + g_m R_E).' }),
        makeStep({ index: 4, title: 'Find output resistance R_out', body: 'Set v_in=0; R_out = R_C.' }),
      ],
      'BJT common-emitter amplifier with emitter degeneration R_E',
    );
    const issues = auditCapsuleDiagrams(capsule);
    expect(issues).toContain('diagram_incomplete');
    expect(issues).toContain('missing_circuit_diagram');
    expect(issues).toContain('insufficient_diagrams');
  });

  it('passes dense electrical fixtures with rich diagrams on every step', () => {
    const steps = Array.from({ length: 6 }, (_, i) =>
      makeStep({
        index: i + 1,
        title: `Step ${i + 1}`,
        body: 'Analyze R1 between nodes N1 and N2.',
        diagram: { type: 'svg', content: RICH_EE_SVG },
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
      makeStep({ index: 2, title: 'Apply KCL at node C', diagram: { type: 'svg', content: RICH_EE_SVG } }),
      makeStep({ index: 3, title: 'Apply KCL at node D', diagram: { type: 'svg', content: RICH_EE_SVG } }),
      makeStep({ index: 4, title: 'More KCL', diagram: { type: 'svg', content: RICH_EE_SVG } }),
    ]);
    expect(auditCapsuleDiagrams(capsule)).toContain('diagram_lacks_graphics');
  });

  it('flags chemistry draw/sketch problems as visual-dense', () => {
    const capsule: Capsule = {
      meta: {
        version: 1,
        subject: 'Chemistry',
        topic: 'MO theory',
        question: 'Draw MO energy diagrams for N2 and O2 with bond orders.',
      },
      steps: [
        makeStep({
          index: 1,
          title: 'Draw N2 MO diagram',
          body: 'Label sigma and pi orbitals.',
          diagram: { type: 'svg', content: RICH_EE_SVG },
        }),
        makeStep({
          index: 2,
          title: 'Compute bond order',
          body: 'Bond order is 3 for N2.',
          diagram: { type: 'svg', content: RICH_EE_SVG },
        }),
        makeStep({ index: 3, title: 'Compare magnetic properties', body: 'N2 is diamagnetic.' }),
      ],
      solution: 'done',
      solutionDiagrams: [],
    };
    expect(isVisualDenseProblem(capsule)).toBe(true);
    const stripped = { ...capsule, steps: capsule.steps.map((s) => ({ ...s, diagram: undefined })) };
    expect(auditCapsuleDiagrams(stripped).length).toBeGreaterThan(0);
  });
});
