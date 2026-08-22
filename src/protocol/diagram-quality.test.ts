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

function makeSubjectCapsule(subject: Capsule['meta']['subject'], steps: Step[], question: string, topic = 'Visual check'): Capsule {
  return {
    meta: {
      version: 1,
      subject,
      topic,
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

const MATH_GRAPH_SVG = [
  '<svg viewBox="0 0 300 180">',
  '<line x1="30" y1="150" x2="280" y2="150" stroke="#333" stroke-width="2"/>',
  '<line x1="40" y1="20" x2="40" y2="160" stroke="#333" stroke-width="2"/>',
  '<path d="M 40 150 Q 150 30 270 150" fill="none" stroke="#1565c0" stroke-width="2"/>',
  '<line x1="150" y1="148" x2="150" y2="152" stroke="#333"/>',
  '<line x1="38" y1="90" x2="42" y2="90" stroke="#333"/>',
  '<text x="275" y="166" font-size="14">x</text>',
  '<text x="22" y="24" font-size="14">y</text>',
  '<text x="150" y="172" font-size="13">x0</text>',
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

  it('hybrid-π spec missing RC in the spec is diagram_incomplete', () => {
    const cap = makeCapsule([], 'BJT common-emitter hybrid-π');
    const step = makeStep({
      index: 1,
      title: 'Draw small-signal hybrid-pi model',
      body: 'Replace the BJT with hybrid-π: r_π, g_m, R_E, R_C.',
      diagram: { type: 'hybridpi', content: 'rpi: 1k\ngm: 50m\nRE: 270' },
    });
    expect(auditStepDiagramCompleteness(step, cap)).toContain('diagram_incomplete');
  });

  it('hybrid-π spec with required keys is complete', () => {
    const cap = makeCapsule([], 'BJT common-emitter hybrid-π');
    const step = makeStep({
      index: 1,
      title: 'Draw small-signal hybrid-pi model',
      body: 'Replace the BJT with hybrid-π: r_π, g_m, R_E, R_C at B,C,E.',
      diagram: { type: 'hybridpi', content: 'rpi: 1k\ngm: 50m\nRE: 270\nRC: 2.2k' },
    });
    expect(auditStepDiagramCompleteness(step, cap)).not.toContain('diagram_incomplete');
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

  it('flags a physics free-body step that omits its diagram', () => {
    const capsule: Capsule = {
      meta: {
        version: 1,
        subject: 'Physics',
        topic: 'Inclined plane',
        question: 'A block slides down a frictionless incline; draw the free-body diagram and find a.',
      },
      steps: [
        makeStep({ index: 1, title: 'Draw the free-body diagram', body: 'Forces: weight, normal, friction.' }),
        makeStep({ index: 2, title: 'Resolve along the incline', body: 'Components of weight.' }),
        makeStep({ index: 3, title: 'Apply Newton second law', body: 'a = g sin θ.' }),
      ],
      solution: 'done',
      solutionDiagrams: [],
    };
    expect(isVisualDenseProblem(capsule)).toBe(true);
    const issues = auditCapsuleDiagrams(capsule);
    expect(issues).toContain('missing_initial_circuit');
    expect(issues).toContain('missing_circuit_diagram');
  });

  it('flags a math graph step whose SVG is text-only', () => {
    const capsule: Capsule = {
      meta: {
        version: 1,
        subject: 'Math',
        topic: 'Curve sketching',
        question: 'Sketch the graph of f(x)=x^3-3x and mark the critical points.',
      },
      steps: [
        makeStep({
          index: 1,
          title: 'Sketch the graph',
          body: 'Plot intercepts and critical points.',
          diagram: { type: 'svg', content: '<svg viewBox="0 0 300 180"><text x="10" y="20">graph</text></svg>' },
        }),
        makeStep({ index: 2, title: 'Find critical points', body: "f'(x)=3x^2-3=0." }),
        makeStep({ index: 3, title: 'Classify extrema', body: 'Second derivative test.' }),
      ],
      solution: 'done',
      solutionDiagrams: [],
    };
    expect(isVisualDenseProblem(capsule)).toBe(true);
    expect(auditCapsuleDiagrams(capsule)).toContain('diagram_lacks_graphics');
  });

  it('passes a math capsule whose visual step carries a real labeled graph', () => {
    const capsule: Capsule = {
      meta: {
        version: 1,
        subject: 'Math',
        topic: 'Curve sketching',
        question: 'Sketch the graph of f(x)=x^3-3x and shade the region under the curve.',
      },
      steps: [
        makeStep({
          index: 1,
          title: 'Sketch the graph and axes',
          body: 'Plot the curve with labeled axes.',
          diagram: { type: 'svg', content: MATH_GRAPH_SVG },
        }),
        makeStep({ index: 2, title: 'Find critical points', body: "f'(x)=3x^2-3=0 gives x=±1." }),
        makeStep({ index: 3, title: 'Shade the region', body: 'Region between curve and axis.', diagram: { type: 'svg', content: MATH_GRAPH_SVG } }),
      ],
      solution: 'done',
      solutionDiagrams: [],
    };
    expect(isVisualDenseProblem(capsule)).toBe(true);
    // Real graphics present, sufficient coverage, step-1 diagram present → no issues.
    expect(auditCapsuleDiagrams(capsule)).toEqual([]);
  });

  it('flags a biology pathway step that needs but lacks a diagram', () => {
    const capsule: Capsule = {
      meta: {
        version: 1,
        subject: 'Biology',
        topic: 'Cellular respiration',
        question: 'Draw the glycolysis pathway and label each intermediate.',
      },
      steps: [
        makeStep({ index: 1, title: 'Draw the glycolysis pathway', body: 'Glucose to pyruvate.' }),
        makeStep({ index: 2, title: 'Track ATP yield', body: 'Net 2 ATP.' }),
        makeStep({ index: 3, title: 'Summarize regulation', body: 'PFK is the control point.' }),
      ],
      solution: 'done',
      solutionDiagrams: [],
    };
    expect(isVisualDenseProblem(capsule)).toBe(true);
    expect(auditCapsuleDiagrams(capsule)).toContain('missing_initial_circuit');
  });

  it('flags labels placed directly on wires or strokes', () => {
    const labelOnWire =
      '<svg viewBox="0 0 300 180">' +
      '<line x1="30" y1="90" x2="260" y2="90" stroke="black"/>' +
      '<line x1="260" y1="90" x2="260" y2="130" stroke="black"/>' +
      '<text x="140" y="90" font-size="14">R1</text>' +
      '<text x="40" y="70" font-size="14">Vs</text>' +
      '</svg>';
    const capsule = makeCapsule([
      makeStep({
        index: 1,
        title: 'Label circuit branch',
        body: 'Analyze R1 and Vs in the branch.',
        diagram: { type: 'svg', content: labelOnWire },
      }),
      makeStep({ index: 2, title: 'Apply KCL at node A', diagram: { type: 'svg', content: RICH_EE_SVG } }),
      makeStep({ index: 3, title: 'Apply KVL in loop', diagram: { type: 'svg', content: RICH_EE_SVG } }),
    ]);
    expect(auditCapsuleDiagrams(capsule)).toContain('diagram_label_over_graphic');
  });

  it('flags overlapping labels before they make the diagram unreadable', () => {
    const stacked =
      '<svg viewBox="0 0 300 180">' +
      '<line x1="30" y1="90" x2="260" y2="90" stroke="black"/>' +
      '<rect x="80" y="70" width="40" height="20" stroke="black" fill="none"/>' +
      '<text x="100" y="60" font-size="14">V1</text>' +
      '<text x="102" y="62" font-size="14">R1</text>' +
      '<text x="180" y="60" font-size="14">GND</text>' +
      '</svg>';
    const capsule = makeCapsule([
      makeStep({
        index: 1,
        title: 'Label all nodes',
        body: 'Show V1, R1, and GND labels.',
        diagram: { type: 'svg', content: stacked },
      }),
      makeStep({ index: 2, title: 'Apply KCL at node V1', diagram: { type: 'svg', content: RICH_EE_SVG } }),
      makeStep({ index: 3, title: 'Verify KCL', diagram: { type: 'svg', content: RICH_EE_SVG } }),
    ]);
    expect(auditCapsuleDiagrams(capsule)).toContain('diagram_label_collision');
  });

  it('flags graph-style diagrams without axis labels', () => {
    const noAxes =
      '<svg viewBox="0 0 300 180">' +
      '<path d="M 30 140 Q 150 30 270 140" stroke="black" fill="none"/>' +
      '<text x="130" y="40" font-size="14">curve</text>' +
      '<circle cx="150" cy="90" r="3"/>' +
      '</svg>';
    const capsule = makeSubjectCapsule('Math', [
      makeStep({
        index: 1,
        title: 'Sketch the graph of the function',
        body: 'Plot the curve and mark the vertex.',
        diagram: { type: 'svg', content: noAxes },
      }),
      makeStep({ index: 2, title: 'Read intercepts', body: 'Use the graph.' }),
      makeStep({ index: 3, title: 'State monotonicity', body: 'Use the graph.' }),
    ], 'Sketch/plot the graph of y=x^2 and label key points.');
    expect(auditCapsuleDiagrams(capsule)).toContain('diagram_missing_axes');
  });

  it('flags chemistry MO diagrams missing orbital/energy labels', () => {
    const unlabeledMo =
      '<svg viewBox="0 0 300 180">' +
      '<line x1="60" y1="130" x2="110" y2="130" stroke="black"/>' +
      '<line x1="180" y1="90" x2="230" y2="90" stroke="black"/>' +
      '<line x1="110" y1="130" x2="180" y2="90" stroke="gray" stroke-dasharray="3 3"/>' +
      '<text x="40" y="150" font-size="14">N2</text>' +
      '<text x="210" y="70" font-size="14">level</text>' +
      '</svg>';
    const capsule = makeSubjectCapsule('Chemistry', [
      makeStep({
        index: 1,
        title: 'Draw the MO diagram',
        body: 'Draw molecular orbital energy levels for N2.',
        diagram: { type: 'svg', content: unlabeledMo },
      }),
      makeStep({ index: 2, title: 'Fill electrons', body: 'Use Aufbau filling.' }),
      makeStep({ index: 3, title: 'Compute bond order', body: 'Use bonding minus antibonding.' }),
    ], 'Draw the molecular orbital diagram for N2.');
    expect(auditCapsuleDiagrams(capsule)).toContain('diagram_missing_axes');
  });

  it('flags biology pathway diagrams without directed flow and enough labels', () => {
    const noFlow =
      '<svg viewBox="0 0 300 180">' +
      '<rect x="40" y="70" width="60" height="30" stroke="black" fill="none"/>' +
      '<rect x="180" y="70" width="60" height="30" stroke="black" fill="none"/>' +
      '<line x1="100" y1="85" x2="180" y2="85" stroke="black"/>' +
      '<text x="55" y="90" font-size="14">A</text>' +
      '</svg>';
    const capsule = makeSubjectCapsule('Biology', [
      makeStep({
        index: 1,
        title: 'Draw the signaling pathway',
        body: 'Show activation from receptor to kinase.',
        diagram: { type: 'svg', content: noFlow },
      }),
      makeStep({ index: 2, title: 'Explain activation', body: 'Activation flows downstream.' }),
      makeStep({ index: 3, title: 'Explain inhibition', body: 'Inhibitors reduce activity.' }),
    ], 'Draw a signaling pathway with activation and inhibition.');
    expect(auditCapsuleDiagrams(capsule)).toContain('diagram_incomplete');
  });

  it('flags legend-only diagrams as incomplete figures', () => {
    const legendOnly =
      '<svg viewBox="0 0 300 180">' +
      '<rect x="20" y="20" width="10" height="10" stroke="black" fill="none"/>' +
      '<text x="50" y="30" font-size="14">R1 resistor</text>' +
      '<text x="50" y="55" font-size="14">Vs source</text>' +
      '<text x="50" y="80" font-size="14">GND ground</text>' +
      '<text x="50" y="105" font-size="14">I current</text>' +
      '</svg>';
    const capsule = makeCapsule([
      makeStep({
        index: 1,
        title: 'Label circuit symbols',
        body: 'Show R1, Vs, GND, and I.',
        diagram: { type: 'svg', content: legendOnly },
      }),
      makeStep({ index: 2, title: 'Apply KCL at node A', diagram: { type: 'svg', content: RICH_EE_SVG } }),
      makeStep({ index: 3, title: 'Apply KVL in loop', diagram: { type: 'svg', content: RICH_EE_SVG } }),
    ]);
    expect(auditCapsuleDiagrams(capsule)).toContain('diagram_legend_only');
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
