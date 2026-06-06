import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from './parser';
import { scoreRaw } from './score';
import { classifySubject } from './classifier';
import { extractSvg, sanitizeSvg } from '@/src/lib/sanitize';
import { MathMarkdown } from '@/src/components/MathMarkdown';
import {
  CHEMICAL_NACL_MIXER,
  CIVIL_SIMPLY_SUPPORTED_BEAM,
  CS_MIN_COINS_DP,
  MECHANICAL_AXIAL_STRESS_BAR,
  PHYSICS_CONVEX_LENS,
} from './__fixtures-visual-subjects';
import type { Subject } from './types';

const CASES = [
  { name: 'CS min-coins DP', subject: 'CS', raw: CS_MIN_COINS_DP },
  { name: 'Mechanical axial stress', subject: 'Mechanical', raw: MECHANICAL_AXIAL_STRESS_BAR },
  { name: 'Civil SFD/BMD beam', subject: 'Civil', raw: CIVIL_SIMPLY_SUPPORTED_BEAM },
  { name: 'Chemical NaCl mixer', subject: 'Chemical', raw: CHEMICAL_NACL_MIXER },
  { name: 'Physics convex lens', subject: 'Physics', raw: PHYSICS_CONVEX_LENS },
] as const satisfies readonly { name: string; subject: Subject; raw: string }[];

function svgParses(svg: string): boolean {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  return !doc.querySelector('parsererror') && doc.documentElement.tagName.toLowerCase() === 'svg';
}

describe('hard visual subject fixtures', () => {
  for (const { name, subject, raw } of CASES) {
    it(`${name}: parses cleanly with expected subject`, () => {
      const result = parse(raw);
      expect(result.status).toBe('ok');
      expect(result.errorCode).toBeUndefined();
      expect(result.capsule?.meta.subject).toBe(subject);
      expect(result.capsule!.steps.length).toBeGreaterThanOrEqual(3);
    });

    it(`${name}: SVG diagrams survive sanitize and XML parse`, () => {
      const capsule = parse(raw).capsule!;
      const diagrams = capsule.steps.flatMap((step) => step.diagram?.type === 'svg' ? [step.diagram] : []);
      expect(diagrams.length, `${name} needs visual coverage`).toBeGreaterThan(0);
      for (const diagram of diagrams) {
        const clean = sanitizeSvg(extractSvg(diagram.content));
        expect(clean).toContain('<svg');
        expect(svgParses(clean)).toBe(true);
      }
    });

    it(`${name}: passes scoreRaw structural gate`, async () => {
      const score = await scoreRaw(raw);
      expect(score.parse_ok).toBe(1);
      expect(score.clean_fence).toBe(1);
      expect(score.step_count).toBeGreaterThanOrEqual(3);
      expect(score.svg_valid).toBe(1);
      expect(score.error_code).toBeUndefined();
    });
  }
});

describe('hard visual subject fixture semantics', () => {
  it('CS fixture verifies DP values, recurrence, and reconstruction', () => {
    const cap = parse(CS_MIN_COINS_DP).capsule!;
    const allText = [...cap.steps.map((s) => s.body), ...cap.steps.map((s) => s.formula ?? ''), cap.solution].join(' ');
    expect(allText).toContain('dp[11]=3');
    expect(allText).toContain('5+5+1');
    expect(allText).toContain('O(11\\cdot3)');
    expect(cap.steps[1]!.diagram!.content).toContain('chosen predecessor 6');
    expect(cap.solution).toContain('| amount |');
  });

  it('Mechanical fixture verifies axial stress and factor of safety', () => {
    const cap = parse(MECHANICAL_AXIAL_STRESS_BAR).capsule!;
    const allText = [...cap.steps.map((s) => s.body), ...cap.steps.map((s) => s.formula ?? ''), cap.solution].join(' ');
    expect(allText).toContain('78.54');
    expect(allText).toContain('63.66');
    expect(allText).toContain('3.93');
    expect(allText).toMatch(/does not yield/i);
    expect(cap.steps[0]!.diagram!.content).toContain('P=5 kN');
    expect(cap.steps[1]!.diagram!.content).toContain('d=10 mm');
  });

  it('Civil fixture verifies reactions, SFD, and BMD labels', () => {
    const cap = parse(CIVIL_SIMPLY_SUPPORTED_BEAM).capsule!;
    const allText = [...cap.steps.map((s) => s.body), ...cap.steps.map((s) => s.formula ?? ''), cap.solution].join(' ');
    expect(allText).toContain('R_B=5');
    expect(allText).toContain('R_A=5');
    expect(allText).toContain('M_{\\max}=15');
    expect(cap.steps[2]!.diagram!.content).toContain('+5 kN');
    expect(cap.steps[2]!.diagram!.content).toContain('-5 kN');
    expect(cap.steps[3]!.diagram!.content).toContain('+15 kN m');
  });

  it('Chemical fixture verifies mixer balance and stream table', () => {
    const cap = parse(CHEMICAL_NACL_MIXER).capsule!;
    const allText = [...cap.steps.map((s) => s.body), ...cap.steps.map((s) => s.formula ?? ''), cap.solution].join(' ');
    expect(allText).toContain('150\\,\\text{kg/h}');
    expect(allText).toContain('22.5');
    expect(allText).toContain('15\\,\\text{wt\\%}');
    expect(cap.steps[0]!.diagram!.content).toContain('control volume');
    expect(cap.steps[0]!.diagram!.content).toContain('S3: 150 kg/h, 15 wt% NaCl');
    expect(cap.solution).toContain('| Stream |');
  });

  it('Physics fixture verifies lens math and ray diagram labels', () => {
    const cap = parse(PHYSICS_CONVEX_LENS).capsule!;
    const allText = [...cap.steps.map((s) => s.body), ...cap.steps.map((s) => s.formula ?? ''), cap.solution].join(' ');
    expect(allText).toContain('d_i=30');
    expect(allText).toContain('m=-2');
    expect(allText).toMatch(/real, inverted/i);
    expect(cap.steps[0]!.diagram!.content).toContain('F +10cm');
    expect(cap.steps[0]!.diagram!.content).toContain('parallel ray to far F');
    expect(cap.steps[0]!.diagram!.content).toContain('central ray');
  });
});

describe('hard visual subject routing', () => {
  it('routes exact visual prompts to their specialized subjects', () => {
    expect(classifySubject('minimum coin dynamic programming for amount 11 coins [1,2,5] draw DP table')).toBe('CS');
    expect(classifySubject('10 mm steel bar under 5 kN axial tensile load yield strength 250 MPa')).toBe('Mechanical');
    expect(classifySubject('Draw SFD and BMD for a 6 m simply supported beam with a 10 kN central point load')).toBe('Civil');
    expect(classifySubject('Mix 100 kg/h of 20 wt% NaCl with 50 kg/h of 5 wt% NaCl in a mixer')).toBe('Chemical');
    expect(classifySubject('convex lens f=10 cm object distance 15 cm draw ray diagram')).toBe('Physics');
  });
});

describe('hard visual tables render through MathMarkdown', () => {
  it('renders CS and Chemical markdown stream/DP tables as HTML tables', () => {
    const csHtml = renderToStaticMarkup(<MathMarkdown content={parse(CS_MIN_COINS_DP).capsule!.solution} />);
    const chemHtml = renderToStaticMarkup(<MathMarkdown content={parse(CHEMICAL_NACL_MIXER).capsule!.solution} />);
    expect(csHtml).toContain('<table>');
    expect(csHtml).toMatch(/>11<\/th>/);
    expect(chemHtml).toContain('<table>');
    expect(chemHtml).toMatch(/>150<\/td>/);
  });
});

