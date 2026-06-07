/**
 * Anti-hardcoding verification — proves EE benchmark answers are computed, not baked in.
 *
 * If any test here fails, the pipeline likely contains hardcoded solutions or
 * question-ID-based answer lookup (which is rejected).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { EEProblemSpec } from './spec-types';
import { ALL_EE_SPECS } from './specs';
import { solve } from './solvers';
import { generateQuestion } from './pipeline';
import { renderDiagram } from './render-diagram';
import { buildYbusN, zbusFromLines, cAbs } from './solvers/math-utils';

const FORBIDDEN_SPEC_KEYS = new Set([
  'answer',
  'answers',
  'solution',
  'verified',
  'expected',
  'result',
  'correct',
]);

/** Recursively scan an object for forbidden answer-like keys in specs. */
function findForbiddenKeys(obj: unknown, path = ''): string[] {
  const hits: string[] = [];
  if (obj === null || typeof obj !== 'object') return hits;
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => hits.push(...findForbiddenKeys(v, `${path}[${i}]`)));
    return hits;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const p = path ? `${path}.${k}` : k;
    if (FORBIDDEN_SPEC_KEYS.has(k.toLowerCase())) hits.push(p);
    hits.push(...findForbiddenKeys(v, p));
  }
  return hits;
}

function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== 'questions') out.push(...collectSourceFiles(p));
    else if (ent.isFile() && /\.(ts|tsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}

describe('Anti-hardcoding — spec integrity', () => {
  it('ALL_EE_SPECS params contain no answer/solution/verified keys', () => {
    for (const entry of ALL_EE_SPECS) {
      const hits = findForbiddenKeys(entry.spec.params, `Q${entry.id}.spec.params`);
      expect(hits, `Q${entry.id} has forbidden keys: ${hits.join(', ')}`).toHaveLength(0);
    }
  });

  it('no per-question ID/slug dispatch in solvers or render-diagram', () => {
    const files = [
      ...collectSourceFiles(join(import.meta.dirname, 'solvers')),
      join(import.meta.dirname, 'render-diagram.ts'),
      join(import.meta.dirname, 'synthesize.ts'),
    ];
    const idSwitch = /(?:case\s+\d+|id\s*===\s*\d+|slug\s*===\s*['"]q\d+)/;
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      expect(src, `${file} must not switch on question id/slug`).not.toMatch(idSwitch);
    }
  });

  it('removed hardcoded question bank files do not exist', () => {
    const removed = [
      'verified-answers.ts',
      'question-factory.ts',
      'questions/year1.ts',
      'questions/year2.ts',
      'questions/year3.ts',
    ];
    for (const rel of removed) {
      expect(() => readFileSync(join(import.meta.dirname, rel))).toThrow();
    }
  });
});

describe('Anti-hardcoding — solver sensitivity (mutate params → answers change)', () => {
  it('Q1: doubling Vs doubles loop current', () => {
    const base = ALL_EE_SPECS[0]!.spec;
    if (base.kind !== 'kvl-series-loop') throw new Error('Q1 must be kvl-series-loop');
    const s1 = solve(base);
    const mutated: EEProblemSpec = {
      kind: 'kvl-series-loop',
      params: { ...base.params, Vs: base.params.Vs * 2 },
    };
    const s2 = solve(mutated);
    expect(s2.computed.I).toBeCloseTo((s1.computed.I ?? 0) * 2, 6);
  });

  it('Q31/Q32: Miller Av is derived from BJT params, not a separate hardcoded gain', () => {
    const q31 = ALL_EE_SPECS.find((e) => e.id === 31)!;
    const q32 = ALL_EE_SPECS.find((e) => e.id === 32)!;
    const s31 = solve(q31.spec);
    const s32 = solve(q32.spec);
    expect(s32.computed.Av).toBeCloseTo(s31.computed.Av!, 4);
    expect(s32.computed.Av).not.toBeCloseTo(-196, 0); // stale hardcoded value removed
  });

  it('Q32: changing BJT IC changes Miller bandwidth', () => {
    const entry = ALL_EE_SPECS.find((e) => e.id === 32)!;
    const base = solve(entry.spec);
    const spec = entry.spec;
    if (spec.kind !== 'miller-bandwidth') throw new Error('expected miller-bandwidth');
    const mutated = {
      kind: 'miller-bandwidth' as const,
      params: {
        ...spec.params,
        bjt: { ...spec.params.bjt, IC: spec.params.bjt.IC * 1.5 },
      },
    };
    const changed = solve(mutated);
    expect(changed.computed.f3dB).not.toBeCloseTo(base.computed.f3dB!, 6);
    expect(changed.computed.Av).not.toBeCloseTo(base.computed.Av!, 4);
  });

  it('Q48: fault solver derives Zbus from line data at runtime (not stored in spec)', () => {
    const q48 = ALL_EE_SPECS.find((e) => e.id === 48)!;
    if (q48.spec.kind !== 'symmetrical-fault') throw new Error('Q48 kind');
    expect('Zbus' in q48.spec.params).toBe(false);
    const Z = zbusFromLines(q48.spec.params.nBuses, q48.spec.params.lines);
    const sol = solve(q48.spec);
    const fb = q48.spec.params.faultBus - 1;
    const Zff = Z[fb]![fb]!;
    expect(sol.computed.If_mag).toBeCloseTo(q48.spec.params.Vpre / cAbs(Zff), 3);
  });
});

describe('Anti-hardcoding — diagram labels track solver output', () => {
  it('corrupting solver output changes rendered SVG numerics', () => {
    const entry = ALL_EE_SPECS[0]!;
    const sol = solve(entry.spec);
    const svgGood = renderDiagram(entry.spec, sol);

    const corrupted = {
      ...sol,
      computed: { ...sol.computed, V_R1: 7.777 },
    };
    const svgBad = renderDiagram(entry.spec, corrupted);
    expect(svgGood).not.toBe(svgBad);
    expect(svgBad).toContain('7.8V');
    expect(svgGood).toContain('8V');
  });

  it('Q51–Q100: second bank solves with distinct params from Q1–Q50', () => {
    const bank1 = ALL_EE_SPECS.filter((e) => e.id <= 50);
    const bank2 = ALL_EE_SPECS.filter((e) => e.id >= 51);
    expect(bank2).toHaveLength(50);
    for (let i = 0; i < 50; i++) {
      expect(bank2[i]!.spec.kind).toBe(bank1[i]!.spec.kind);
      expect(JSON.stringify(bank2[i]!.spec.params)).not.toBe(
        JSON.stringify(bank1[i]!.spec.params),
      );
      const sol = solve(bank2[i]!.spec);
      expect(Object.keys(sol.computed).length).toBeGreaterThan(0);
    }
  });

  it('generateQuestion verified field equals solve() output, not spec params', () => {
    const entry = ALL_EE_SPECS.find((e) => e.id === 35)!; // MOSFET CS
    const q = generateQuestion(entry);
    const sol = solve(entry.spec);
    for (const [k, v] of Object.entries(sol.computed)) {
      expect(q.verified[k]).toBeCloseTo(v, 6);
    }
  });
});
