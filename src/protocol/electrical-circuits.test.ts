import { describe, it, expect, vi } from 'vitest';

vi.mock('@/src/lib/mermaid', () => ({
  renderMermaid: vi.fn(
    async () =>
      '<svg viewBox="0 0 100 60"><rect width="40" height="20" style="fill:#eee;stroke:#333"/></svg>',
  ),
}));

import { parse, parseCapsule } from './parser';
import {
  THEVENIN_ELECTRICAL,
  RLC_AC_IMPEDANCE,
  OPAMP_NONINVERTING,
  DIODE_HALFWAVE_RECTIFIER,
} from './__fixtures__';
import {
  SERIES_PARALLEL_CIRCUIT,
  VERIFIED,
  NODE_VOLTAGE_CIRCUIT,
  NV_VERIFIED,
} from './__fixtures-electrical';
import { sanitizeSvg, extractSvg } from '@/src/lib/sanitize';
import { scoreRaw } from './score';
import type { Diagram } from './types';

function svgParses(svg: string): boolean {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  return !doc.querySelector('parsererror') && doc.documentElement.tagName.toLowerCase() === 'svg';
}

function assertDiagramSurvivesPipeline(diagram: Diagram | undefined): void {
  expect(diagram).toBeTruthy();
  const clean = sanitizeSvg(extractSvg(diagram!.content));
  expect(clean).toContain('<svg');
  expect(clean.length).toBeGreaterThan(40);
  expect(svgParses(clean)).toBe(true);
}

// ---------------------------------------------------------------------------
// 0. Series-parallel resistor network (KVL/KCL) — R18 benchmark
// ---------------------------------------------------------------------------

describe('Series-parallel circuit (parse)', () => {
  const result = parse(SERIES_PARALLEL_CIRCUIT);

  it('returns ok status with no warnings', () => {
    expect(result.status).toBe('ok');
    expect(result.warningCodes).toHaveLength(0);
  });

  it('parses Electrical subject and topic', () => {
    expect(result.capsule?.meta.subject).toBe('Electrical');
    expect(result.capsule?.meta.topic).toContain('Series-parallel');
  });

  it('has six progressive steps with SVG diagrams', () => {
    expect(result.capsule?.steps).toHaveLength(VERIFIED.stepCount);
    for (const step of result.capsule!.steps) {
      expect(step.diagram?.type).toBe('svg');
      expect(step.diagram?.content).toContain('<svg');
    }
  });

  it('step titles follow the reduction workflow', () => {
    const titles = result.capsule!.steps.map((s) => s.title);
    expect(titles[0]).toContain('Label');
    expect(titles[1]).toContain('parallel');
    expect(titles[2]).toContain('parallel equivalent');
    expect(titles[3]).toContain('series');
    expect(titles[4]).toContain('current');
    expect(titles[5]).toMatch(/KVL|Kirchhoff/i);
  });
});

describe('Series-parallel circuit (math accuracy)', () => {
  const result = parse(SERIES_PARALLEL_CIRCUIT);
  const steps = result.capsule!.steps;
  const allText = steps.map((s) => [s.formula, s.body, s.takeaway].join(' ')).join(' ');

  it('computes R_parallel = 5 Ω', () => {
    expect(steps[2]!.formula).toContain('5');
    expect(allText).toMatch(/5\s*\\,?\\Omega|R_\{\\parallel\}\s*=\s*5/);
  });

  it('computes R_total = 9 Ω', () => {
    expect(steps[3]!.formula).toContain('9');
    expect(VERIFIED.R_total).toBe(VERIFIED.R1 + VERIFIED.R_parallel);
  });

  it('computes I_R1 = 4/3 A', () => {
    expect(steps[4]!.formula).toMatch(/4\/3|\\frac\{4\}\{3\}/);
    expect(VERIFIED.I_R1).toBeCloseTo(VERIFIED.V_source / VERIFIED.R_total, 6);
  });

  it('KVL check: V_R1 + V_parallel = 12 V', () => {
    expect(VERIFIED.V_R1 + VERIFIED.V_parallel).toBeCloseTo(VERIFIED.V_source, 6);
    expect(steps[5]!.body).toMatch(/12/);
  });

  it('solution states the final current', () => {
    expect(result.capsule!.solution).toMatch(/4\/3|1\.33/);
  });
});

describe('Series-parallel circuit (SVG pipeline)', () => {
  const result = parse(SERIES_PARALLEL_CIRCUIT);

  it('every step diagram survives sanitize → valid XML', () => {
    for (const step of result.capsule!.steps) {
      assertDiagramSurvivesPipeline(step.diagram);
    }
  });

  it('step 1 retains resistor zigzags, voltage source, and labels', () => {
    const clean = sanitizeSvg(extractSvg(result.capsule!.steps[0]!.diagram!.content));
    expect(clean).toContain('polyline');
    expect(clean).toContain('circle');
    expect(clean).toContain('12V');
    expect(clean).toContain('R1');
  });

  it('step 2 highlights parallel branches (dashed rect)', () => {
    const raw = result.capsule!.steps[1]!.diagram!.content;
    expect(raw).toMatch(/stroke-dasharray|dasharray/);
    assertDiagramSurvivesPipeline(result.capsule!.steps[1]!.diagram);
  });

  it('step 5 shows current arrow with marker-end', () => {
    const clean = sanitizeSvg(extractSvg(result.capsule!.steps[4]!.diagram!.content));
    expect(clean).toContain('marker');
    expect(clean).toMatch(/4\/3|marker-end/);
  });
});

// ---------------------------------------------------------------------------
// 1. Thevenin capsule fixture — parse & structural validation
// ---------------------------------------------------------------------------

describe('Thevenin equivalent capsule (parse)', () => {
  const result = parse(THEVENIN_ELECTRICAL);

  it('returns ok status', () => {
    expect(result.status).toBe('ok');
  });

  it('parses subject as Electrical', () => {
    expect(result.capsule?.meta.subject).toBe('Electrical');
  });

  it('parses topic', () => {
    expect(result.capsule?.meta.topic).toContain('Thevenin');
  });

  it('has 7 steps', () => {
    expect(result.capsule?.steps).toHaveLength(7);
  });

  it('step titles cover the full Thevenin workflow', () => {
    const titles = result.capsule!.steps.map((s) => s.title);
    expect(titles[0]).toContain('Label');
    expect(titles[1]).toContain('KVL');
    expect(titles[2]).toContain('loop current');
    expect(titles[3]).toContain('Vth');
    expect(titles[4]).toContain('Kill');
    expect(titles[5]).toContain('Rth');
    expect(titles[6]).toContain('Thevenin equivalent');
  });

  it('step 1 diagram is SVG and contains key elements', () => {
    const diag = result.capsule!.steps[0]!.diagram;
    expect(diag?.type).toBe('svg');
    expect(diag?.content).toContain('<svg');
    expect(diag?.content).toContain('<g');
    expect(diag?.content).toContain('<ellipse');
    expect(diag?.content).toContain('<polyline');
    expect(diag?.content).toContain('10V');
    expect(diag?.content).toContain('2Ω');
  });

  it('step 4 diagram labels Vth', () => {
    const diag = result.capsule!.steps[3]!.diagram;
    expect(diag?.type).toBe('svg');
    expect(diag?.content).toContain('70/11');
  });

  it('step 5 (sources killed) diagram has ground symbol polyline', () => {
    const diag = result.capsule!.steps[4]!.diagram;
    expect(diag?.content).toContain('<polyline');
    expect(diag?.content).toContain('GND');
  });

  it('step 7 diagram shows the final Thevenin equivalent', () => {
    const diag = result.capsule!.steps[6]!.diagram;
    expect(diag?.content).toContain('Rth');
    expect(diag?.content).toContain('Vth');
    expect(diag?.content).toContain('<ellipse');
  });

  it('solution contains the final numeric answers', () => {
    const sol = result.capsule!.solution;
    expect(sol).toContain('70');
    expect(sol).toContain('24');
  });

  it('solution has one inline SVG diagram', () => {
    expect(result.capsule!.solutionDiagrams).toHaveLength(1);
    expect(result.capsule!.solutionDiagrams[0]!.type).toBe('svg');
  });

  it('formulas appear on appropriate steps', () => {
    expect(result.capsule!.steps[1]!.formula).toContain('10');
    expect(result.capsule!.steps[2]!.formula).toContain('\\frac{5}{11}');
    expect(result.capsule!.steps[3]!.formula).toContain('\\frac{70}{11}');
    expect(result.capsule!.steps[5]!.formula).toContain('\\frac{24}{11}');
  });

  it('quickcheck is present on step 1 and step 7', () => {
    expect(result.capsule!.steps[0]!.quickCheck?.question).toContain('loop');
    expect(result.capsule!.steps[6]!.quickCheck?.question).toContain('load');
  });

  it('followup is present on the final step', () => {
    expect(result.capsule!.steps[6]!.followup).toContain('Norton');
  });

  it('takeaways are present on steps 1, 5, and 7', () => {
    expect(result.capsule!.steps[0]!.takeaway).toBeTruthy();
    expect(result.capsule!.steps[4]!.takeaway).toContain('short');
    expect(result.capsule!.steps[6]!.takeaway).toContain('load');
  });
});

// ---------------------------------------------------------------------------
// 2. Complex multi-element SVG sanitization
// ---------------------------------------------------------------------------

describe('SVG sanitizer preserves complex circuit elements', () => {
  const CIRCUIT_SVG = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260">',
    '  <g id="circuit-group">',
    '    <line x1="40" y1="240" x2="40" y2="40" stroke="#222" stroke-width="2"/>',
    '    <rect x="120" y="28" width="60" height="24" rx="4" fill="none" stroke="#222" stroke-width="2"/>',
    '    <ellipse cx="220" cy="40" rx="6" ry="6" fill="#e53e3e"/>',
    '    <circle cx="380" cy="40" r="6" fill="#3182ce"/>',
    '    <polyline points="40,240 40,260" stroke="#222" stroke-width="2" fill="none"/>',
    '    <polygon points="100,10 120,40 80,40" fill="#ddd" stroke="#222" stroke-width="1"/>',
    '    <path d="M0,0 L10,5 L0,10 Z" fill="#222"/>',
    '    <text x="10" y="140" font-size="14" fill="#222">10V</text>',
    '    <text x="135" y="46" font-size="12" fill="#222">2Ω</text>',
    '  </g>',
    '  <g id="labels">',
    '    <text x="210" y="28" font-size="14" font-weight="bold" fill="#e53e3e">A</text>',
    '    <text x="370" y="28" font-size="14" font-weight="bold" fill="#3182ce">B</text>',
    '    <text x="20" y="258" font-size="12" fill="#888">GND</text>',
    '  </g>',
    '</svg>',
  ].join('\n');

  it('preserves <g> group elements', () => {
    const out = sanitizeSvg(CIRCUIT_SVG);
    expect(out).toContain('<g');
  });

  it('preserves <ellipse> elements', () => {
    const out = sanitizeSvg(CIRCUIT_SVG);
    expect(out).toContain('ellipse');
  });

  it('preserves <polyline> elements', () => {
    const out = sanitizeSvg(CIRCUIT_SVG);
    expect(out).toContain('polyline');
  });

  it('preserves <polygon> elements', () => {
    const out = sanitizeSvg(CIRCUIT_SVG);
    expect(out).toContain('polygon');
  });

  it('preserves <circle> elements', () => {
    const out = sanitizeSvg(CIRCUIT_SVG);
    expect(out).toContain('circle');
  });

  it('preserves <rect> with rx attribute', () => {
    const out = sanitizeSvg(CIRCUIT_SVG);
    expect(out).toContain('rect');
    expect(out).toContain('rx=');
  });

  it('preserves <path> elements', () => {
    const out = sanitizeSvg(CIRCUIT_SVG);
    expect(out).toContain('<path');
  });

  it('preserves <text> with font attributes', () => {
    const out = sanitizeSvg(CIRCUIT_SVG);
    expect(out).toContain('<text');
    expect(out).toContain('font-size');
  });

  it('preserves <line> elements', () => {
    const out = sanitizeSvg(CIRCUIT_SVG);
    expect(out).toContain('<line');
  });

  it('preserves node label text A, B, GND', () => {
    const out = sanitizeSvg(CIRCUIT_SVG);
    expect(out).toContain('>A<');
    expect(out).toContain('>B<');
    expect(out).toContain('GND');
  });

  it('preserves fill and stroke attributes', () => {
    const out = sanitizeSvg(CIRCUIT_SVG);
    expect(out).toContain('fill=');
    expect(out).toContain('stroke=');
  });

  it('preserves stroke-dasharray for dashed lines', () => {
    const dashed = '<svg viewBox="0 0 100 100"><line x1="0" y1="0" x2="100" y2="100" stroke="#222" stroke-width="2" stroke-dasharray="6,3"/></svg>';
    const out = sanitizeSvg(dashed);
    expect(out).toContain('stroke-dasharray');
  });

  it('preserves multiple resistors and voltage sources in one diagram', () => {
    const out = sanitizeSvg(CIRCUIT_SVG);
    expect(out).toContain('10V');
    expect(out).toContain('2Ω');
  });

  it('strips dangerous attributes but keeps the host element', () => {
    const evil = [
      '<svg viewBox="0 0 100 100">',
      '  <g id="ok"><ellipse cx="50" cy="50" rx="10" ry="10"/></g>',
      '  <script>alert("xss")</script>',
      '  <polyline points="0,0 50,50" onclick="evil()"/>',
      '</svg>',
    ].join('\n');
    const out = sanitizeSvg(evil);
    expect(out).toContain('ellipse');
    expect(out).toContain('polyline');
    expect(out).not.toContain('script');
    expect(out).not.toContain('alert');
    expect(out).not.toContain('onclick');
  });
});

// ---------------------------------------------------------------------------
// 3. Thevenin SVG diagrams survive sanitization round-trip
// ---------------------------------------------------------------------------

describe('Thevenin SVG diagrams survive sanitization round-trip', () => {
  const result = parse(THEVENIN_ELECTRICAL);
  const steps = result.capsule!.steps;

  it('all step SVG diagrams survive sanitization', () => {
    for (const step of steps) {
      if (step.diagram?.type === 'svg') {
        const clean = sanitizeSvg(step.diagram.content);
        expect(clean).toContain('<svg');
        expect(clean.length).toBeGreaterThan(50);
      }
    }
  });

  it('step 1 SVG retains g, ellipse, polyline after sanitization', () => {
    const clean = sanitizeSvg(steps[0]!.diagram!.content);
    expect(clean).toContain('<g');
    expect(clean).toContain('ellipse');
    expect(clean).toContain('polyline');
  });

  it('step 5 (sources killed) SVG retains g, ellipse, polyline after sanitization', () => {
    const clean = sanitizeSvg(steps[4]!.diagram!.content);
    expect(clean).toContain('<g');
    expect(clean).toContain('ellipse');
    expect(clean).toContain('polyline');
  });

  it('step 7 (final equivalent) SVG retains ellipse, polyline after sanitization', () => {
    const clean = sanitizeSvg(steps[6]!.diagram!.content);
    expect(clean).toContain('ellipse');
    expect(clean).toContain('polyline');
  });

  it('solution diagram survives sanitization', () => {
    const solDiag = result.capsule!.solutionDiagrams[0]!;
    const clean = sanitizeSvg(solDiag.content);
    expect(clean).toContain('<svg');
    expect(clean).toContain('ellipse');
    expect(clean).toContain('<g');
  });
});

// ===========================================================================
// 4. Node-Voltage / Mesh Analysis: 3-node multi-source circuit
// ===========================================================================

const nvResult = parse(NODE_VOLTAGE_CIRCUIT);
const nvCapsule = nvResult.capsule!;
const nvSteps = nvCapsule?.steps ?? [];

// ---------------------------------------------------------------------------
// 4a. Parse correctness
// ---------------------------------------------------------------------------

describe('Node-voltage circuit (parse)', () => {
  it('returns ok status', () => {
    expect(nvResult.status).toBe('ok');
  });

  it('parses subject as Electrical', () => {
    expect(nvCapsule.meta.subject).toBe('Electrical');
  });

  it('parses topic', () => {
    expect(nvCapsule.meta.topic).toContain('node-voltage');
  });

  it(`has ${NV_VERIFIED.stepCount} steps`, () => {
    expect(nvSteps).toHaveLength(NV_VERIFIED.stepCount);
  });

  it('every step has a non-empty title and body', () => {
    for (const step of nvSteps) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(0);
    }
  });

  it('step titles cover the node-voltage workflow', () => {
    const titles = nvSteps.map((s) => s.title);
    expect(titles[0]).toMatch(/label|node|ground/i);
    expect(titles[1]).toMatch(/KCL.*N1/i);
    expect(titles[2]).toMatch(/KCL.*N2/i);
    expect(titles[3]).toMatch(/solve|system/i);
    expect(titles[4]).toMatch(/back.?sub/i);
    expect(titles[5]).toMatch(/verif|power/i);
  });

  it('every step has a formula, takeaway, quickcheck, and followup', () => {
    for (const step of nvSteps) {
      expect(step.formula).toBeTruthy();
      expect(step.takeaway).toBeTruthy();
      expect(step.quickCheck).toBeTruthy();
      expect(step.quickCheck!.question.length).toBeGreaterThan(0);
      expect(step.quickCheck!.answer.length).toBeGreaterThan(0);
      expect(step.followup).toBeTruthy();
    }
  });

  it('every step has an SVG diagram', () => {
    for (const step of nvSteps) {
      expect(step.diagram?.type).toBe('svg');
      expect(step.diagram?.content).toContain('<svg');
    }
  });

  it('solution block references the final answers', () => {
    expect(nvCapsule.solution).toContain('132');
    expect(nvCapsule.solution).toContain('120');
    expect(nvCapsule.solution).toContain('13');
  });

  it('solution has one inline SVG diagram', () => {
    expect(nvCapsule.solutionDiagrams).toHaveLength(1);
    expect(nvCapsule.solutionDiagrams[0]!.type).toBe('svg');
  });

  it('produces no error code', () => {
    expect(nvResult.errorCode).toBeUndefined();
  });

  it('has zero warnings (clean capsule)', () => {
    expect(nvResult.warnings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4b. Math accuracy — verified against analytic solution
// ---------------------------------------------------------------------------

describe('Node-voltage circuit (math accuracy)', () => {
  const ref = NV_VERIFIED;
  const allText = [
    ...nvSteps.map((s) => s.body),
    ...nvSteps.map((s) => s.formula ?? ''),
    nvCapsule.solution,
  ].join(' ');

  it('KCL at N1: 3·V1 − 2·V2 = 12 appears in formulas', () => {
    expect(allText).toMatch(/3\s*V_?1\s*.*2\s*V_?2\s*=\s*12|3V_1\s*-\s*2V_2\s*=\s*12/);
  });

  it('KCL at N2: 4·V1 − 7·V2 = −24 appears in formulas', () => {
    expect(allText).toMatch(/4V_?1\s*.*7V_?2\s*=\s*-?\s*24|4V_1\s*-\s*7V_2/);
  });

  it('V_N2 = 120/13 appears in the solution', () => {
    expect(allText).toMatch(/120.*13|\\frac\{120\}\{13\}/);
  });

  it('V_N1 = 132/13 appears in the solution', () => {
    expect(allText).toMatch(/132.*13|\\frac\{132\}\{13\}/);
  });

  it('branch currents 4/13 A appear', () => {
    expect(allText).toMatch(/4\/13|\\frac\{4\}\{13\}/);
  });

  it('power balance 288/13 W appears', () => {
    expect(allText).toMatch(/288.*13|288\/13/);
  });

  it('numeric values satisfy KCL at N1', () => {
    const lhs = (ref.V_source - ref.V_N1) / ref.R1;
    const rhs = (ref.V_N1 - ref.V_N2) / ref.R2;
    expect(lhs).toBeCloseTo(rhs, 10);
  });

  it('numeric values satisfy KCL at N2', () => {
    const lhs = (ref.V_N1 - ref.V_N2) / ref.R2 + ref.I_source;
    const rhs = ref.V_N2 / ref.R3;
    expect(lhs).toBeCloseTo(rhs, 10);
  });

  it('I_R1 = I_R2 (series path, no junction between them)', () => {
    expect(ref.I_R1).toBeCloseTo(ref.I_R2, 10);
  });

  it('I_R3 = I_R2 + I_source (KCL at N2)', () => {
    expect(ref.I_R3).toBeCloseTo(ref.I_R2 + ref.I_source, 10);
  });

  it('power balance: P_gen = P_abs', () => {
    const P_gen = ref.P_V1 + ref.P_Isrc;
    const P_R1 = ref.I_R1 ** 2 * ref.R1;
    const P_R2 = ref.I_R2 ** 2 * ref.R2;
    const P_R3 = ref.I_R3 ** 2 * ref.R3;
    const P_abs = P_R1 + P_R2 + P_R3;
    expect(P_gen).toBeCloseTo(P_abs, 10);
    expect(P_gen).toBeCloseTo(ref.P_total, 10);
  });

  it('V_N1 > V_N2 (current flows from N1 to N2)', () => {
    expect(ref.V_N1).toBeGreaterThan(ref.V_N2);
  });
});

// ---------------------------------------------------------------------------
// 4c. Marker-based current arrows survive full pipeline (sanitize → render)
// ---------------------------------------------------------------------------

describe('Node-voltage SVG marker arrows survive sanitize pipeline', () => {
  it('step 1 SVG (full circuit) preserves defs, marker, polygon, marker-end', () => {
    const raw = nvSteps[0]!.diagram!.content;
    const clean = sanitizeSvg(extractSvg(raw));
    expect(clean).toContain('<defs>');
    expect(clean).toContain('<marker');
    expect(clean).toContain('<polygon');
    expect(clean).toContain('marker-end');
    expect(clean).toContain('url(#');
  });

  it('step 1 preserves multiple marker IDs (arr, arr-r)', () => {
    const raw = nvSteps[0]!.diagram!.content;
    const clean = sanitizeSvg(extractSvg(raw));
    expect(clean).toMatch(/id="arr"/);
    expect(clean).toMatch(/id="arr-r"/);
  });

  it('step 1 preserves <g> groups with id and transform attributes', () => {
    const raw = nvSteps[0]!.diagram!.content;
    const clean = sanitizeSvg(extractSvg(raw));
    expect(clean).toContain('<g');
    expect(clean).toContain('id="gnd"');
    expect(clean).toContain('transform=');
    expect(clean).toContain('id="circuit"');
    expect(clean).toContain('id="current-arrows"');
    expect(clean).toContain('id="voltage-labels"');
  });

  it('step 1 preserves markerUnits attribute', () => {
    const raw = nvSteps[0]!.diagram!.content;
    const clean = sanitizeSvg(extractSvg(raw));
    expect(clean.toLowerCase()).toContain('markerunits');
  });

  it('step 1 preserves ground symbol (nested g with lines)', () => {
    const raw = nvSteps[0]!.diagram!.content;
    const clean = sanitizeSvg(extractSvg(raw));
    expect(clean).toContain('GND');
    expect(clean).toContain('translate(');
  });

  it('step 1 preserves node voltage text labels (V₁, V₂)', () => {
    const raw = nvSteps[0]!.diagram!.content;
    const clean = sanitizeSvg(extractSvg(raw));
    expect(clean).toContain('V\u2081');
    expect(clean).toContain('V\u2082');
  });

  it('step 1 preserves current direction text labels (I₁, I₂, I₃)', () => {
    const raw = nvSteps[0]!.diagram!.content;
    const clean = sanitizeSvg(extractSvg(raw));
    expect(clean).toContain('I\u2081');
    expect(clean).toContain('I\u2082');
    expect(clean).toContain('I\u2083');
  });

  it('step 2 SVG (KCL at N1) preserves marker arrows on current lines', () => {
    const raw = nvSteps[1]!.diagram!.content;
    const clean = sanitizeSvg(extractSvg(raw));
    expect(clean).toContain('marker-end');
    expect(clean).toContain('url(#arr)');
  });

  it('step 2 preserves dashed circle (KCL boundary)', () => {
    const raw = nvSteps[1]!.diagram!.content;
    const clean = sanitizeSvg(extractSvg(raw));
    expect(clean).toContain('stroke-dasharray');
    expect(clean).toContain('N1');
  });

  it('step 3 SVG (KCL at N2) preserves marker arrows and 2A current source', () => {
    const raw = nvSteps[2]!.diagram!.content;
    const clean = sanitizeSvg(extractSvg(raw));
    expect(clean).toContain('marker-end');
    expect(clean).toContain('2A');
    expect(clean).toContain('N2');
  });

  it('step 5 SVG (solved) preserves branch current labels and markers', () => {
    const raw = nvSteps[4]!.diagram!.content;
    const clean = sanitizeSvg(extractSvg(raw));
    expect(clean).toContain('marker-end');
    expect(clean).toContain('132/13');
    expect(clean).toContain('120/13');
  });

  it('step 6 SVG (power table) preserves g group and text', () => {
    const raw = nvSteps[5]!.diagram!.content;
    const clean = sanitizeSvg(extractSvg(raw));
    expect(clean).toContain('<g');
    expect(clean).toContain('Power');
    expect(clean).toContain('288/13');
  });

  it('all node-voltage SVG diagrams survive full round-trip', () => {
    for (const step of nvSteps) {
      if (step.diagram?.type === 'svg') {
        const clean = sanitizeSvg(extractSvg(step.diagram.content));
        expect(clean, `Step "${step.title}" SVG was empty`).toContain('<svg');
        expect(clean.length).toBeGreaterThan(50);
      }
    }
  });

  it('solution diagram survives sanitization with markers intact', () => {
    const solDiag = nvCapsule.solutionDiagrams[0]!;
    const clean = sanitizeSvg(extractSvg(solDiag.content));
    expect(clean).toContain('<svg');
    expect(clean).toContain('<marker');
    expect(clean).toContain('marker-end');
    expect(clean).toContain('132/13');
  });
});

// ---------------------------------------------------------------------------
// 5. Edge cases: markers/defs/g survive with dangerous content nearby
// ---------------------------------------------------------------------------

describe('Sanitize pipeline: marker edge cases', () => {
  it('marker-end url(#id) survives when script tags are nearby', () => {
    const svg = [
      '<svg viewBox="0 0 100 100">',
      '<defs><marker id="a" markerWidth="4" markerHeight="4" refX="4" refY="2" orient="auto">',
      '<polygon points="0,0 4,2 0,4" fill="black"/></marker></defs>',
      '<script>alert(1)</script>',
      '<line x1="0" y1="0" x2="80" y2="80" marker-end="url(#a)"/>',
      '</svg>',
    ].join('');
    const out = sanitizeSvg(svg);
    expect(out).toContain('marker-end');
    expect(out).toContain('<marker');
    expect(out).toContain('<line');
    expect(out).not.toContain('script');
  });

  it('multiple markers with different IDs coexist', () => {
    const svg = [
      '<svg viewBox="0 0 200 100">',
      '<defs>',
      '<marker id="start" markerWidth="4" markerHeight="4" refX="0" refY="2" orient="auto"><polygon points="0,0 4,2 0,4" fill="red"/></marker>',
      '<marker id="end" markerWidth="4" markerHeight="4" refX="4" refY="2" orient="auto"><polygon points="0,0 4,2 0,4" fill="blue"/></marker>',
      '</defs>',
      '<line x1="10" y1="50" x2="190" y2="50" marker-start="url(#start)" marker-end="url(#end)"/>',
      '</svg>',
    ].join('');
    const out = sanitizeSvg(svg);
    expect(out).toContain('id="start"');
    expect(out).toContain('id="end"');
    expect(out).toContain('marker-start');
    expect(out).toContain('marker-end');
  });

  it('nested <g> elements with transform survive', () => {
    const svg = [
      '<svg viewBox="0 0 200 200">',
      '<g id="outer" transform="translate(50,50)">',
      '<g id="inner" transform="rotate(45)">',
      '<line x1="0" y1="0" x2="50" y2="50" stroke="black"/>',
      '</g>',
      '</g>',
      '</svg>',
    ].join('');
    const out = sanitizeSvg(svg);
    expect(out).toContain('id="outer"');
    expect(out).toContain('id="inner"');
    expect(out).toContain('translate(50,50)');
    expect(out).toContain('rotate(45)');
  });

  it('marker with orient="auto-start-reverse" survives', () => {
    const svg = [
      '<svg viewBox="0 0 100 100">',
      '<defs><marker id="bi" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">',
      '<path d="M0,0 L6,3 L0,6 Z" fill="#333"/></marker></defs>',
      '<line x1="10" y1="50" x2="90" y2="50" marker-start="url(#bi)" marker-end="url(#bi)"/>',
      '</svg>',
    ].join('');
    const out = sanitizeSvg(svg);
    expect(out).toContain('orient');
    expect(out).toContain('marker-start');
    expect(out).toContain('marker-end');
  });

  it('preserves current source circle with internal arrow marker', () => {
    const svg = [
      '<svg viewBox="0 0 100 200">',
      '<defs><marker id="up" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">',
      '<polygon points="0,0 6,2 0,4" fill="#333"/></marker></defs>',
      '<circle cx="50" cy="100" r="16" fill="none" stroke="#333" stroke-width="2"/>',
      '<line x1="50" y1="116" x2="50" y2="84" stroke="#333" stroke-width="1.5" marker-end="url(#up)"/>',
      '<text x="70" y="104" font-size="10">2A</text>',
      '</svg>',
    ].join('');
    const out = sanitizeSvg(svg);
    expect(out).toContain('<circle');
    expect(out).toContain('marker-end');
    expect(out).toContain('2A');
  });

  it('node-voltage fixture draws the current-source arrow inside the source circle', () => {
    const raw = nvSteps[0]!.diagram!.content;
    const clean = sanitizeSvg(extractSvg(raw));
    expect(clean).toContain('cx="370" cy="108" r="16"');
    expect(clean).toContain('x1="370" y1="120" x2="370" y2="96"');
    expect(clean).toContain('marker-end="url(#arr)"');
  });

  it('solved node-voltage diagram labels all branch currents', () => {
    const raw = nvSteps[4]!.diagram!.content;
    const clean = sanitizeSvg(extractSvg(raw));
    expect(clean).toContain('4/13 A');
    expect(clean).toContain('30/13 A');
    expect(clean).toContain('2 A up');
  });

  it('font-weight="bold" survives on text elements', () => {
    const svg = '<svg viewBox="0 0 100 50"><text x="10" y="30" font-weight="bold" font-size="14" fill="blue">N1</text></svg>';
    const out = sanitizeSvg(svg);
    expect(out).toContain('font-weight');
    expect(out).toContain('N1');
  });

  it('text-anchor="middle" survives on text elements', () => {
    const svg = '<svg viewBox="0 0 100 50"><text x="50" y="30" text-anchor="middle" font-size="12">V_N1</text></svg>';
    const out = sanitizeSvg(svg);
    expect(out).toContain('text-anchor');
    expect(out).toContain('V_N1');
  });
});

// ---------------------------------------------------------------------------
// 5. End-to-end scoreRaw gate — all five EE benchmark fixtures
// ---------------------------------------------------------------------------

const EE_FIXTURES = [
  { name: 'series-parallel', raw: SERIES_PARALLEL_CIRCUIT },
  { name: 'Thevenin', raw: THEVENIN_ELECTRICAL },
  { name: 'node-voltage', raw: NODE_VOLTAGE_CIRCUIT },
  { name: 'RLC AC impedance', raw: RLC_AC_IMPEDANCE },
  { name: 'op-amp non-inverting', raw: OPAMP_NONINVERTING },
  { name: 'diode half-wave rectifier', raw: DIODE_HALFWAVE_RECTIFIER },
] as const;

describe('Electrical fixtures pass scoreRaw gate', () => {
  for (const { name, raw } of EE_FIXTURES) {
    it(`${name}: parse_ok, clean_fence, svg_valid`, async () => {
      const score = await scoreRaw(raw);
      expect(score.parse_ok, `${name} parse_ok`).toBe(1);
      expect(score.clean_fence, `${name} clean_fence`).toBe(1);
      expect(score.step_count, `${name} step_count`).toBeGreaterThanOrEqual(3);
      if (score.svg_valid !== null) {
        expect(score.svg_valid, `${name} svg_valid`).toBe(1);
      }
      expect(score.error_code, `${name} error_code`).toBeUndefined();
    });
  }
});
