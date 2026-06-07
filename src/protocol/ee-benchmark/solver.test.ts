/**
 * Solver integrity tests — answers derived from params, never from question IDs.
 */
import { describe, it, expect } from 'vitest';
import { ALL_EE_SPECS } from './specs';
import { solve } from './solvers';
import { renderDiagram } from './render-diagram';
import { auditSvgDiagram, countSvgPrimitives, countSvgLabels } from './svg-utils';

describe('EE solvers — all 50 kinds', () => {
  it('solves every spec without throwing', () => {
    for (const entry of ALL_EE_SPECS) {
      const sol = solve(entry.spec);
      expect(sol.kind).toBe(entry.spec.kind);
      expect(Object.keys(sol.computed).length).toBeGreaterThan(0);
    }
  });

  it('generates diagrams with sufficient primitives from computed values', () => {
    for (const entry of ALL_EE_SPECS) {
      const sol = solve(entry.spec);
      const svg = renderDiagram(entry.spec, sol);
      expect(countSvgPrimitives(svg)).toBeGreaterThanOrEqual(3);
      expect(countSvgLabels(svg)).toBeGreaterThanOrEqual(2);
      const audit = auditSvgDiagram(svg, entry.title);
      expect(audit.errors, `Q${entry.id}: ${audit.errors.join('; ')}`).toHaveLength(0);
    }
  });

  it('Q3 mesh currents satisfy KVL equations', () => {
    const sol = solve(ALL_EE_SPECS[2]!.spec);
    const I1 = sol.computed.I1!;
    const I2 = sol.computed.I2!;
    const I3 = sol.computed.I3!;
    expect(6 * I1 - 4 * I2).toBeCloseTo(20, 6);
    expect(4 * I1 - 18 * I2 + 6 * I3).toBeCloseTo(0, 6);
    expect(-6 * I2 + 9 * I3).toBeCloseTo(-10, 6);
  });

  it('Q2 nodal voltages satisfy KCL at nodes 2 and 3', () => {
    const sol = solve(ALL_EE_SPECS[1]!.spec);
    const V1 = 30;
    const V2 = sol.computed.V2!;
    const V3 = sol.computed.V3!;
    expect((V1 - V2) / 5).toBeCloseTo(V2 / 20 + (V2 - V3) / 10, 4);
    expect((V2 - V3) / 10 + 2).toBeCloseTo(V3 / 15, 4);
  });
});
