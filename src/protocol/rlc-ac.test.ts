/**
 * RLC AC Impedance / Phasor capsule tests.
 *
 * Validates: capsule parsing, numeric consistency against analytic reference
 * values, SVG diagram validity after sanitization, and classifier routing.
 */
import { describe, it, expect } from 'vitest';
import { parse, parseCapsule } from './parser';
import { RLC_AC_IMPEDANCE, RLC_REFERENCE } from './__fixtures__';
import { sanitizeSvg } from '@/src/lib/sanitize';
import { classifySubject } from './classifier';
import type { Capsule } from './types';

/* ------------------------------------------------------------------ */
/*  Parsing                                                            */
/* ------------------------------------------------------------------ */
describe('RLC AC capsule — parse', () => {
  const result = parse(RLC_AC_IMPEDANCE);

  it('returns ok status', () => {
    expect(result.status).toBe('ok');
  });

  it('parses meta with subject Electrical', () => {
    expect(result.capsule?.meta.subject).toBe('Electrical');
    expect(result.capsule?.meta.topic).toContain('RLC');
  });

  it('parses all six steps', () => {
    expect(result.capsule?.steps).toHaveLength(6);
  });

  it('step titles follow the expected progression', () => {
    const titles = result.capsule!.steps.map((s) => s.title);
    expect(titles[0]).toMatch(/identify/i);
    expect(titles[1]).toMatch(/angular frequency/i);
    expect(titles[2]).toMatch(/inductive reactance/i);
    expect(titles[3]).toMatch(/capacitive reactance/i);
    expect(titles[4]).toMatch(/impedance/i);
    expect(titles[5]).toMatch(/current/i);
  });

  it('first step has the circuit SVG diagram', () => {
    const d = result.capsule!.steps[0]!.diagram;
    expect(d?.type).toBe('svg');
    expect(d?.content).toContain('<svg');
    expect(d?.content).toContain('polyline');   // resistor zigzag
    expect(d?.content).toContain('path');       // inductor coil
    expect(d?.content).toContain('100Ω');
  });

  it('impedance step has the phasor/triangle SVG', () => {
    const d = result.capsule!.steps[4]!.diagram;
    expect(d?.type).toBe('svg');
    expect(d?.content).toContain('214.6');
    expect(d?.content).toContain('189.9');
  });

  it('impedance step has quickcheck and followup', () => {
    const s = result.capsule!.steps[4]!;
    expect(s.quickCheck?.question).toMatch(/inductive|capacitive/i);
    expect(s.quickCheck?.answer).toMatch(/capacitive/i);
    expect(s.followup).toMatch(/resonance/i);
  });

  it('solution block mentions capacitive', () => {
    expect(result.capsule!.solution).toMatch(/capacitive/i);
  });

  it('solution contains a phasor SVG diagram', () => {
    expect(result.capsule!.solutionDiagrams).toHaveLength(1);
    expect(result.capsule!.solutionDiagrams[0]!.type).toBe('svg');
    expect(result.capsule!.solutionDiagrams[0]!.content).toContain('0.559');
  });

  it('step formulas contain expected LaTeX', () => {
    const formulas = result.capsule!.steps
      .map((s) => s.formula)
      .filter(Boolean) as string[];
    expect(formulas.some((f) => f.includes('\\omega'))).toBe(true);
    expect(formulas.some((f) => f.includes('X_L'))).toBe(true);
    expect(formulas.some((f) => f.includes('X_C'))).toBe(true);
    expect(formulas.some((f) => f.includes('\\frac{V_s}'))).toBe(true);
  });

  it('produces no error code', () => {
    expect(result.errorCode).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  Math consistency against analytic reference values                  */
/* ------------------------------------------------------------------ */
describe('RLC AC capsule — math consistency', () => {
  const ref = RLC_REFERENCE;
  const TOLERANCE = 0.02; // 2 % relative tolerance

  function close(actual: number, expected: number, label: string) {
    const rel = Math.abs(actual - expected) / Math.abs(expected);
    expect(rel, `${label}: ${actual} vs ${expected}`).toBeLessThan(TOLERANCE);
  }

  it('angular frequency ω ≈ 377 rad/s', () => {
    close(ref.omega, 377, 'omega');
  });

  it('inductive reactance XL ≈ 75.4 Ω', () => {
    close(ref.XL, 75.4, 'XL');
  });

  it('capacitive reactance XC ≈ 265.3 Ω', () => {
    close(ref.XC, 265.3, 'XC');
  });

  it('impedance magnitude |Z| ≈ 214.6 Ω', () => {
    close(ref.Zmag, 214.6, 'Zmag');
  });

  it('current I ≈ 0.559 A', () => {
    close(ref.I, 0.559, 'I');
  });

  it('net reactance is negative (capacitive)', () => {
    expect(ref.Zimag).toBeLessThan(0);
    expect(ref.isCapacitive).toBe(true);
  });

  it('Z phasor real part equals R', () => {
    expect(ref.Zreal).toBe(100);
  });

  it('Pythagorean relationship holds: |Z|² = R² + (XL-XC)²', () => {
    const lhs = ref.Zmag ** 2;
    const rhs = ref.R ** 2 + ref.Zimag ** 2;
    close(lhs, rhs, 'Pythagorean');
  });

  it('power balance: I²R < Vs·I (real power < apparent power)', () => {
    const Preal = ref.I ** 2 * ref.R;
    const Papparent = ref.Vs * ref.I;
    expect(Preal).toBeLessThan(Papparent);
  });

  it('phase angle is between -90° and 0° (capacitive lag)', () => {
    const angleDeg = (Math.atan2(ref.Zimag, ref.Zreal) * 180) / Math.PI;
    expect(angleDeg).toBeLessThan(0);
    expect(angleDeg).toBeGreaterThan(-90);
    close(angleDeg, -62.2, 'phase angle');
  });

  it('resonant frequency exists and differs from 60 Hz', () => {
    const f0 = 1 / (2 * Math.PI * Math.sqrt(ref.L * ref.C));
    expect(f0).toBeGreaterThan(0);
    expect(Math.abs(f0 - 60)).toBeGreaterThan(10);
  });
});

/* ------------------------------------------------------------------ */
/*  SVG validity after sanitization                                    */
/* ------------------------------------------------------------------ */
describe('RLC AC capsule — SVG sanitization', () => {
  const result = parse(RLC_AC_IMPEDANCE);
  const capsule = result.capsule!;

  function allDiagramContents(cap: Capsule): { label: string; raw: string }[] {
    const out: { label: string; raw: string }[] = [];
    for (const step of cap.steps) {
      if (step.diagram?.type === 'svg') {
        out.push({ label: `step "${step.title}"`, raw: step.diagram.content });
      }
    }
    for (let i = 0; i < cap.solutionDiagrams.length; i++) {
      const d = cap.solutionDiagrams[i]!;
      if (d.type === 'svg') {
        out.push({ label: `solution diagram ${i}`, raw: d.content });
      }
    }
    return out;
  }

  const diagrams = allDiagramContents(capsule);

  it('fixture contains three SVG diagrams', () => {
    expect(diagrams).toHaveLength(3);
  });

  for (const { label, raw } of allDiagramContents(parse(RLC_AC_IMPEDANCE).capsule!)) {
    describe(`sanitize: ${label}`, () => {
      const clean = sanitizeSvg(raw);

      it('produces non-empty output', () => {
        expect(clean.length).toBeGreaterThan(0);
      });

      it('retains the root <svg> element', () => {
        expect(clean).toMatch(/^<svg[\s>]/i);
      });

      it('preserves drawing primitives (line, text, path)', () => {
        expect(clean).toMatch(/<(line|polyline|path|circle|rect)\b/i);
        expect(clean).toMatch(/<text\b/i);
      });

      it('preserves marker definitions for arrowheads', () => {
        expect(clean).toContain('marker');
      });

      it('contains no script, onclick, or style attributes', () => {
        expect(clean.toLowerCase()).not.toContain('<script');
        expect(clean).not.toMatch(/\bonclick\b/i);
        expect(clean).not.toMatch(/\bstyle\s*=/i);
      });

      it('contains no remote href references', () => {
        expect(clean).not.toMatch(/href\s*=\s*["']https?:/i);
      });
    });
  }
});

/* ------------------------------------------------------------------ */
/*  Classifier routes AC/RLC questions to Electrical                   */
/* ------------------------------------------------------------------ */
describe('RLC AC — classifier routing', () => {
  const acQuestions = [
    'Series RLC circuit with R=100Ω, L=0.2H, C=10μF at 60Hz. Find impedance.',
    'What is the impedance and current in an RLC AC circuit?',
    'Calculate the inductive and capacitive reactance of a series RLC circuit at 60Hz',
    'Find the reactance of an inductor and capacitor in an AC circuit',
    'Determine whether this RLC circuit is inductive or capacitive',
  ];

  it.each(acQuestions)('routes %j → Electrical', (q) => {
    expect(classifySubject(q)).toBe('Electrical');
  });
});
