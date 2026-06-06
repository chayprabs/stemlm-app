import { describe, it, expect } from 'vitest';
import { parse, findCapsuleRaw, looksComplete, SOLUTION_DIAGRAM_TOKEN } from './parser';
import { sanitizeSvg, extractSvg } from '../lib/sanitize';
import { SERIES_PARALLEL_CIRCUIT, VERIFIED } from './__fixtures-electrical';
import type { Step, Diagram } from './types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function svgIsValidXml(svg: string): { valid: boolean; error?: string } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'text/xml');
  const err = doc.querySelector('parsererror');
  return err ? { valid: false, error: err.textContent ?? 'parse error' } : { valid: true };
}

function collectStepDiagrams(steps: Step[]): Diagram[] {
  return steps.filter((s) => s.diagram).map((s) => s.diagram!);
}

// ── Parse the capsule once for all tests ───────────────────────────────────────

const result = parse(SERIES_PARALLEL_CIRCUIT);
const capsule = result.capsule!;
const steps = capsule?.steps ?? [];

// ── 1. Parse correctness ───────────────────────────────────────────────────────

describe('Series-parallel circuit: parse', () => {
  it('returns status ok', () => {
    expect(result.status).toBe('ok');
  });

  it('finds the capsule in raw text', () => {
    const raw = findCapsuleRaw(SERIES_PARALLEL_CIRCUIT);
    expect(raw).not.toBeNull();
    expect(raw).toContain('@meta');
    expect(raw).toContain('@end');
  });

  it('looks complete (streaming-done signal)', () => {
    expect(looksComplete(SERIES_PARALLEL_CIRCUIT)).toBe(true);
  });

  it('parses meta correctly', () => {
    expect(capsule.meta.version).toBe(1);
    expect(capsule.meta.subject).toBe('Electrical');
    expect(capsule.meta.topic).toBe('Series-parallel resistor current');
  });

  it(`parses exactly ${VERIFIED.stepCount} steps`, () => {
    expect(steps).toHaveLength(VERIFIED.stepCount);
  });

  it('every step has a non-empty title and body', () => {
    for (const step of steps) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(0);
    }
  });

  it('every step has a formula, takeaway, quickcheck, and followup', () => {
    for (const step of steps) {
      expect(step.formula).toBeTruthy();
      expect(step.takeaway).toBeTruthy();
      expect(step.quickCheck).toBeTruthy();
      expect(step.quickCheck!.question.length).toBeGreaterThan(0);
      expect(step.quickCheck!.answer.length).toBeGreaterThan(0);
      expect(step.followup).toBeTruthy();
    }
  });

  it('parses a solution block with an inline mermaid diagram', () => {
    expect(capsule.solution).toBeTruthy();
    expect(capsule.solutionDiagrams).toHaveLength(1);
    expect(capsule.solutionDiagrams[0]!.type).toBe('mermaid');
    expect(capsule.solution).toContain(SOLUTION_DIAGRAM_TOKEN(0));
  });
});

// ── 2. Math accuracy ──────────────────────────────────────────────────────────

describe('Series-parallel circuit: math accuracy', () => {
  const allText = [
    ...steps.map((s) => s.body),
    ...steps.map((s) => s.formula ?? ''),
    capsule.solution,
  ].join(' ');

  it('R_parallel = 5 Ω appears in formulas/body', () => {
    expect(allText).toMatch(/R_\{?\\parallel\}?\s*=\s*5/);
  });

  it('R_total = 9 Ω appears in formulas/body', () => {
    expect(allText).toMatch(/=\s*9\\,\\Omega|=\s*9\b/);
  });

  it('I_R1 = 4/3 ≈ 1.333 A appears in formulas/body', () => {
    expect(allText).toMatch(/\\frac\{4\}\{3\}|4\/3|1\.333/);
  });

  it('product-over-sum yields 100/20 = 5', () => {
    expect(allText).toContain('100');
    expect(allText).toContain('20');
  });

  it('KVL check: V_R1 = 16/3 and V_parallel = 20/3 sum to 12', () => {
    expect(allText).toMatch(/16\/3|\\frac\{16\}\{3\}/);
    expect(allText).toMatch(/20\/3|\\frac\{20\}\{3\}/);
  });

  it('numeric values agree with verified constants', () => {
    expect(VERIFIED.R_parallel).toBe(
      (VERIFIED.R2 * VERIFIED.R3) / (VERIFIED.R2 + VERIFIED.R3),
    );
    expect(VERIFIED.R_total).toBe(VERIFIED.R1 + VERIFIED.R_parallel);
    expect(VERIFIED.I_R1).toBeCloseTo(VERIFIED.V_source / VERIFIED.R_total, 10);
    expect(VERIFIED.V_R1 + VERIFIED.V_parallel).toBeCloseTo(VERIFIED.V_source, 10);
  });
});

// ── 3. SVG diagrams survive sanitize pipeline ──────────────────────────────────

describe('Series-parallel circuit: SVG diagram integrity', () => {
  const stepDiagrams = collectStepDiagrams(steps);

  it('every step has an SVG diagram', () => {
    expect(stepDiagrams).toHaveLength(VERIFIED.stepCount);
    for (const d of stepDiagrams) {
      expect(d.type).toBe('svg');
    }
  });

  it.each(steps.map((s) => [s.title, s.diagram!] as const))(
    'step "%s" SVG survives extractSvg',
    (_title, diagram) => {
      const extracted = extractSvg(diagram.content);
      expect(extracted).toMatch(/^<svg[\s>]/i);
      expect(extracted).toMatch(/<\/svg>$/i);
    },
  );

  it.each(steps.map((s) => [s.title, s.diagram!] as const))(
    'step "%s" SVG survives sanitizeSvg',
    (_title, diagram) => {
      const sanitized = sanitizeSvg(diagram.content);
      expect(sanitized.length).toBeGreaterThan(0);
      expect(sanitized).toContain('<svg');
      expect(sanitized).toContain('</svg>');
    },
  );

  it.each(steps.map((s) => [s.title, s.diagram!] as const))(
    'step "%s" sanitized SVG is valid XML',
    (_title, diagram) => {
      const sanitized = sanitizeSvg(extractSvg(diagram.content));
      const { valid, error } = svgIsValidXml(sanitized);
      expect(valid, `Invalid XML: ${error}`).toBe(true);
    },
  );

  it('preserves polyline elements (resistor zigzags)', () => {
    const first = sanitizeSvg(extractSvg(steps[0]!.diagram!.content));
    expect(first).toContain('polyline');
  });

  it('preserves circle elements (voltage source)', () => {
    const first = sanitizeSvg(extractSvg(steps[0]!.diagram!.content));
    expect(first).toContain('circle');
  });

  it('preserves text labels after sanitization', () => {
    const first = sanitizeSvg(extractSvg(steps[0]!.diagram!.content));
    expect(first).toContain('<text');
  });

  it('preserves marker arrowheads through the pipeline', () => {
    const step5 = sanitizeSvg(extractSvg(steps[4]!.diagram!.content));
    expect(step5).toContain('marker');
    expect(step5).toContain('marker-end');
  });

  it('sanitizeSvg strips width/height from <svg> but keeps viewBox', () => {
    const withDims =
      '<svg viewBox="0 0 100 100" width="100" height="100"><circle r="5"/></svg>';
    const out = sanitizeSvg(withDims);
    expect(out).toContain('viewBox');
    expect(out).not.toMatch(/\bwidth\s*=/);
    expect(out).not.toMatch(/\bheight\s*=/);
  });
});

// ── 4. No warning regressions ──────────────────────────────────────────────────

describe('Series-parallel circuit: no warnings', () => {
  it('has no malformed_diagram warnings', () => {
    expect(result.warningCodes).not.toContain('malformed_diagram');
  });

  it('has no missing_step_title warnings', () => {
    expect(result.warningCodes).not.toContain('missing_step_title');
  });

  it('has no missing_solution warnings', () => {
    expect(result.warningCodes).not.toContain('missing_solution');
  });

  it('has no missing_meta warnings', () => {
    expect(result.warningCodes).not.toContain('missing_meta');
  });

  it('has no missing_end warnings', () => {
    expect(result.warningCodes).not.toContain('missing_end');
  });

  it('has no step_body_too_long warnings', () => {
    expect(result.warningCodes).not.toContain('step_body_too_long');
  });

  it('has no invalid_step_count warnings', () => {
    expect(result.warningCodes).not.toContain('invalid_step_count');
  });

  it('has zero warnings total (clean capsule)', () => {
    expect(result.warnings).toHaveLength(0);
  });
});

// ── 5. Progressive diagram reduction ──────────────────────────────────────────

describe('Series-parallel circuit: progressive reduction', () => {
  it('step 1 diagram has all three resistors', () => {
    const svg = steps[0]!.diagram!.content;
    expect(svg).toContain('R1');
    expect(svg).toContain('R2');
    expect(svg).toContain('R3');
  });

  it('step 2 diagram highlights the parallel section', () => {
    const svg = steps[1]!.diagram!.content;
    expect(svg).toContain('stroke-dasharray');
    expect(svg).toContain('R2');
    expect(svg).toContain('R3');
  });

  it('step 3 diagram shows reduced parallel equivalent', () => {
    const svg = steps[2]!.diagram!.content;
    expect(svg).toMatch(/R\u2225|R_par/);
  });

  it('step 4 diagram shows single total resistance', () => {
    const svg = steps[3]!.diagram!.content;
    expect(svg).toContain('R_total');
  });

  it('step 5 diagram shows current value', () => {
    const svg = steps[4]!.diagram!.content;
    expect(svg).toContain('4/3');
  });

  it('step 6 diagram shows voltage drop labels', () => {
    const svg = steps[5]!.diagram!.content;
    expect(svg).toContain('16/3');
    expect(svg).toContain('20/3');
  });
});
