import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { scoreRaw } from './score';
import { classifySubject } from './classifier';
import { extractSvg, sanitizeSvg } from '@/src/lib/sanitize';
import {
  CHEMICAL_NACL_MIXER,
  CIVIL_SIMPLY_SUPPORTED_BEAM,
  CS_MIN_COINS_DP,
  MECHANICAL_AXIAL_STRESS_BAR,
  PHYSICS_CONVEX_LENS,
} from './__fixtures-visual-subjects';
import type { Subject } from './types';

const CASES = [
  { name: 'CS', subject: 'CS', raw: CS_MIN_COINS_DP },
  { name: 'Mechanical', subject: 'Mechanical', raw: MECHANICAL_AXIAL_STRESS_BAR },
  { name: 'Civil', subject: 'Civil', raw: CIVIL_SIMPLY_SUPPORTED_BEAM },
  { name: 'Chemical', subject: 'Chemical', raw: CHEMICAL_NACL_MIXER },
  { name: 'Physics', subject: 'Physics', raw: PHYSICS_CONVEX_LENS },
] as const satisfies readonly { name: string; subject: Subject; raw: string }[];

function svgParses(svg: string): boolean {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  return !doc.querySelector('parsererror') && doc.documentElement.tagName.toLowerCase() === 'svg';
}

describe('visual subject structural fixtures (no hardcoded solutions)', () => {
  for (const { name, subject, raw } of CASES) {
    it(`${name}: parses cleanly with expected subject`, () => {
      const result = parse(raw);
      expect(result.status).toBe('ok');
      expect(result.capsule?.meta.subject).toBe(subject);
      expect(result.capsule!.steps.length).toBeGreaterThanOrEqual(3);
    });

    it(`${name}: SVG diagrams survive sanitize and XML parse`, () => {
      const capsule = parse(raw).capsule!;
      const diagrams = capsule.steps.flatMap((step) => (step.diagram?.type === 'svg' ? [step.diagram] : []));
      expect(diagrams.length).toBeGreaterThan(0);
      for (const diagram of diagrams) {
        const clean = sanitizeSvg(extractSvg(diagram.content));
        expect(clean).toContain('<svg');
        expect(svgParses(clean)).toBe(true);
      }
    });

    it(`${name}: passes scoreRaw structural gate`, async () => {
      const score = await scoreRaw(raw);
      expect(score.parse_ok).toBe(1);
      expect(score.step_count).toBeGreaterThanOrEqual(3);
      expect(score.svg_valid).toBe(1);
    });
  }
});

describe('visual subject routing', () => {
  it('routes representative prompts to specialized subjects', () => {
    expect(classifySubject('minimum coin dynamic programming for amount 11 coins [1,2,5] draw DP table')).toBe('CS');
    expect(classifySubject('10 mm steel bar under 5 kN axial tensile load yield strength 250 MPa')).toBe('Mechanical');
    expect(classifySubject('Draw SFD and BMD for a 6 m simply supported beam with a 10 kN central point load')).toBe('Civil');
    expect(classifySubject('Mix 100 kg/h of 20 wt% NaCl with 50 kg/h of 5 wt% NaCl in a mixer')).toBe('Chemical');
    expect(classifySubject('convex lens f=10 cm object distance 15 cm draw ray diagram')).toBe('Physics');
  });
});
