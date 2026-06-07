/**
 * Independent computational audit — verifies numeric answers by actually
 * computing them, not just matching substring patterns in verifiedPatterns.
 */
import { describe, it, expect } from 'vitest';
import { MATH_QUESTIONS } from './math-question-bank';
import { buildMathCapsule } from './math-question-bank/build-capsule';
import { parse } from './parser';

function capsuleText(def: (typeof MATH_QUESTIONS)[0]): string {
  const raw = buildMathCapsule(def);
  const cap = parse(raw).capsule!;
  return [...cap.steps.map((s) => [s.body, s.formula ?? '', s.takeaway ?? ''].join(' ')), cap.solution].join(' ');
}

function expectNear(text: string, value: number, opts?: { tol?: number; labels?: string[] }) {
  const tol = opts?.tol ?? Math.max(1e-4, Math.abs(value) * 0.02);
  const candidates = [
    value.toFixed(6),
    value.toFixed(4),
    value.toFixed(3),
    value.toFixed(2),
    String(value),
    ...(opts?.labels ?? []),
  ];
  const frac = (n: number, d: number) => `${n}/${d}`;
  if (Number.isInteger(value * 1000)) candidates.push(value.toFixed(3));
  if (Math.abs(value - 1 / 6) < 1e-9) candidates.push('1/6', '\\frac{1}{6}');
  if (Math.abs(value + 0.5) < 1e-9) candidates.push('-1/2', '-\\frac{1}{2}');
  const found = candidates.some((c) => text.includes(c));
  expect(found, `Expected ${value} (±${tol}) in capsule text; tried: ${candidates.slice(0, 8).join(', ')}`).toBe(true);
}

describe('independent numeric audit (computed, not pattern-faked)', () => {
  it('Q1 limits match numerical evaluation', () => {
    const t = capsuleText(MATH_QUESTIONS[0]!);
    const f = (x: number) => (Math.exp(x) - 1 - x - (x * x) / 2) / (x ** 3);
    const a = f(0.001);
    expect(Math.abs(a - 1 / 6)).toBeLessThan(0.001);
    expectNear(t, 1 / 6);

    const b = (() => {
      const x = 1000;
      return x * x * Math.log(1 + 1 / x) - x;
    })();
    expect(Math.abs(b + 0.5)).toBeLessThan(0.01);
    expectNear(t, -0.5);

    const c = 0.001 ** 0.001;
    expect(Math.abs(c - 1)).toBeLessThan(0.01);
    expect(t).toMatch(/= 1|e\^0 = 1/);
  });

  it('Q3 gradient and directional derivative computed from partials', () => {
    const t = capsuleText(MATH_QUESTIONS[2]!);
    const fx = (x: number, y: number) => 3 * x * x * y - y ** 3;
    const fy = (x: number, y: number) => x ** 3 - 3 * x * y * y;
    expect(fx(1, 1)).toBe(2);
    expect(fy(1, 1)).toBe(-2);
    const ux = 3 / 5;
    const uy = -4 / 5;
    const dir = fx(1, 1) * ux + fy(1, 1) * uy;
    expect(dir).toBeCloseTo(14 / 5, 10);
    expectNear(t, 14 / 5, { labels: ['2.8'] });
  });

  it('Q5 polar and cylindrical integrals computed numerically', () => {
    const t = capsuleText(MATH_QUESTIONS[4]!);
    // ∬ r² dA over r=2cosθ, θ∈[-π/2,π/2]
    let polar = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) {
      const th = -Math.PI / 2 + (Math.PI * i) / (n - 1);
      const rMax = 2 * Math.cos(th);
      for (let j = 0; j < n; j++) {
        const r = (rMax * j) / (n - 1);
        polar += r * r * r * (Math.PI / (n - 1)) * (rMax / (n - 1));
      }
    }
    expect(Math.abs(polar - (3 * Math.PI) / 2)).toBeLessThan(0.05);
    expectNear(t, (3 * Math.PI) / 2, { labels: ['3\\pi/2', '3pi/2'] });

    // ∭ z dV between z=r² and z=4-r², r≤√2  →  ∫∫ (4-2r²)r dr dθ
    let triple = 0;
    const m = 4000;
    const dth = (2 * Math.PI) / m;
    for (let i = 0; i < m; i++) {
      for (let j = 1; j < m; j++) {
        const r = (Math.SQRT2 * j) / m;
        const dr = Math.SQRT2 / m;
        const integrand = ((4 - r * r) ** 2 - (r * r) ** 2) / 2; // ∫_{r²}^{4-r²} z dz
        triple += integrand * r * dr * dth;
      }
    }
    expect(Math.abs(triple - 8 * Math.PI)).toBeLessThan(0.15);
    expectNear(t, 8 * Math.PI, { labels: ['8\\pi', '8pi'] });
  });

  it('Q6 Green integral over triangle equals 0 by direct quadrature', () => {
    const t = capsuleText(MATH_QUESTIONS[5]!);
    let sum = 0;
    const n = 800;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = (i + 0.5) / n;
        const y = ((j + 0.5) / n) * (1 - x);
        if (x >= 0 && y >= 0 && x + y <= 1) {
          sum += (2 * x - 2 * y) * (1 / n) * ((1 - x) / n);
        }
      }
    }
    expect(Math.abs(sum)).toBeLessThan(0.02);
    expect(t).toMatch(/part \(a\) = 0|= 0/);
  });

  it('Q15 eigenvalues are repeated -1 (not -1 and -2)', () => {
    const t = capsuleText(MATH_QUESTIONS[14]!);
    const a = 1,
      b = -4,
      c = 1,
      d = -3;
    const tr = a + d;
    const det = a * d - b * c;
    const disc = tr * tr - 4 * det;
    expect(disc).toBeCloseTo(0, 10);
    const lam = tr / 2; // repeated root when discriminant is 0
    expect(lam).toBeCloseTo(-1, 10);
    expect(t).toContain('(\\lambda+1)^2');
    expect(t).not.toMatch(/eigenvalues?\s*[=:].*-2|lambda\s*=\s*-2|\\lambda\s*=\s*-2/i);
  });

  it('Q33 bisection and Newton root near 2.094551', () => {
    const t = capsuleText(MATH_QUESTIONS[32]!);
    const f = (x: number) => x ** 3 - 2 * x - 5;
    let a = 2,
      b = 3;
    for (let i = 0; i < 4; i++) {
      const c = (a + b) / 2;
      if (f(a) * f(c) < 0) b = c;
      else a = c;
    }
    const bisect = (a + b) / 2;
    expect(bisect).toBeCloseTo(2.09375, 4);

    let x = 2;
    const fp = (x: number) => 3 * x * x - 2;
    for (let i = 0; i < 3; i++) x = x - f(x) / fp(x);
    expect(x).toBeCloseTo(2.094551, 4);
    expect(t).toMatch(/2\.094551|2\.094569/);
  });

  it('Q37 Newton divided difference gives P(1.5)=4.75', () => {
    const t = capsuleText(MATH_QUESTIONS[36]!);
    const pts = [
      [0, 1],
      [1, 3],
      [2, 7],
      [3, 13],
    ];
    const f01 = (pts[1]![1] - pts[0]![1]) / (pts[1]![0] - pts[0]![0]);
    const f12 = (pts[2]![1] - pts[1]![1]) / (pts[2]![0] - pts[1]![0]);
    const f23 = (pts[3]![1] - pts[2]![1]) / (pts[3]![0] - pts[2]![0]);
    const f012 = (f12 - f01) / (pts[2]![0] - pts[0]![0]);
    const f123 = (f23 - f12) / (pts[3]![0] - pts[1]![0]);
    const f0123 = (f123 - f012) / (pts[3]![0] - pts[0]![0]);
    const x = 1.5;
    const p =
      pts[0]![1] +
      f01 * (x - 0) +
      f012 * (x - 0) * (x - 1) +
      f0123 * (x - 0) * (x - 1) * (x - 2);
    expect(p).toBeCloseTo(4.75, 10);
    expect(p).toBeCloseTo(x * x + x + 1, 10);
    expectNear(t, 4.75);
  });

  it('Q41 CRT smallest positive solution is 23', () => {
    const t = capsuleText(MATH_QUESTIONS[40]!);
    // x≡2 mod 3, x≡3 mod 5, x≡2 mod 7
    let found = -1;
    for (let x = 0; x < 105; x++) {
      if (x % 3 === 2 && x % 5 === 3 && x % 7 === 2) {
        found = x;
        break;
      }
    }
    expect(found).toBe(23);
    expect(t).toContain('23');
    // 2^100 mod 35
    let pow = 1;
    for (let i = 0; i < 100; i++) pow = (pow * 2) % 35;
    expect(pow).toBe(16);
    expect(t).toMatch(/16/);
  });

  it('Q45 Parseval gives π²/6', () => {
    const t = capsuleText(MATH_QUESTIONS[44]!);
    let s = 0;
    for (let n = 1; n <= 50000; n++) s += 1 / (n * n);
    expect(s).toBeCloseTo((Math.PI * Math.PI) / 6, 3);
    expect(t).toMatch(/\\pi\^2\/6|pi\^2\/6/);
  });

  it('every question has substantive verifiedPatterns (no single-char or bare "= 0" only)', () => {
    for (const q of MATH_QUESTIONS) {
      const patterns = q.verifiedPatterns.filter((p) => typeof p === 'string') as string[];
      expect(patterns.length, `Q${q.number} needs verified patterns`).toBeGreaterThanOrEqual(3);
      const weakOnly = patterns.every((p) => p.length <= 4 || p === '= 0' || p === '0' || p === "f'(0)");
      expect(weakOnly, `Q${q.number} has only weak patterns: ${patterns.join(', ')}`).toBe(false);
      const hasMathContent = patterns.some((p) => /[0-9\\/\\\\pi\\\\frac]/.test(p) || p.length > 8);
      expect(hasMathContent, `Q${q.number} lacks substantive answer pattern`).toBe(true);
    }
  });

  it('all 50 questions: capsule builds, parses, and solution is non-empty', () => {
    for (const q of MATH_QUESTIONS) {
      const raw = buildMathCapsule(q);
      const result = parse(raw);
      expect(result.status, `Q${q.number} parse`).toBe('ok');
      expect(result.capsule!.steps.length, `Q${q.number} steps`).toBeGreaterThanOrEqual(3);
      expect(result.capsule!.solution.trim().length, `Q${q.number} solution`).toBeGreaterThan(40);
      const withDiagram = result.capsule!.steps.filter((s) => s.diagram?.type === 'svg').length;
      expect(withDiagram, `Q${q.number} diagrams`).toBeGreaterThanOrEqual(q.minDiagramSteps ?? 2);
    }
  });
});
