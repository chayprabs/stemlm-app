/**
 * Structural verification of the AI-output pipeline (parse → SVG sanitize/present →
 * sizing/label audit → scoreRaw → Report/PDF) over SYNTHETIC fixtures only.
 *
 * Replaces the old per-subject "pipeline" tests that were coupled to hardcoded
 * exam banks. Gemini produces real solutions/diagrams at runtime — these fixtures
 * exercise the format/render contract, never a stored answer.
 */
import { describe, it, expect } from 'vitest';
import { verifyCapsule } from './capsule-verify';
import { FENCED_MATH, FENCED_BIOLOGY, FENCED_CHEMISTRY } from './__fixtures__';
import {
  CS_MIN_COINS_DP,
  CHEMICAL_NACL_MIXER,
  PHYSICS_CONVEX_LENS,
} from './__fixtures-visual-subjects';
import type { Subject } from './types';

/**
 * Well-formed capsules that should pass the FULL verifier (parse → sanitize →
 * present → sizing/label audit → scoreRaw → Report/PDF). These fixtures are not
 * "diagram-dense" by topic, so the diagram-COVERAGE gate (a separate content
 * check exercised in diagram-quality.test.ts) does not apply here — the focus is
 * the end-to-end rendering/PDF contract across subjects.
 */
const CASES: { name: string; raw: string; subject: Subject; minDiagrams: number }[] = [
  { name: 'Math', raw: FENCED_MATH, subject: 'Math', minDiagrams: 2 },
  { name: 'Biology', raw: FENCED_BIOLOGY, subject: 'Biology', minDiagrams: 2 },
  { name: 'Chemistry', raw: FENCED_CHEMISTRY, subject: 'Chemistry', minDiagrams: 2 },
  { name: 'CS', raw: CS_MIN_COINS_DP, subject: 'CS', minDiagrams: 2 },
  { name: 'Chemical', raw: CHEMICAL_NACL_MIXER, subject: 'Chemical', minDiagrams: 2 },
  { name: 'Physics', raw: PHYSICS_CONVEX_LENS, subject: 'Physics', minDiagrams: 2 },
];

describe('verifyCapsule — structural pipeline (synthetic fixtures, no hardcoded answers)', () => {
  for (const { name, raw, subject, minDiagrams } of CASES) {
    it(`${name}: parses, sanitizes, sizes, and builds the PDF cleanly`, async () => {
      const result = await verifyCapsule(raw);
      expect(result.ok, result.errors.join('; ')).toBe(true);
      expect(result.subject).toBe(subject);
      expect(result.stepCount).toBeGreaterThanOrEqual(3);
      expect(result.diagramCount).toBeGreaterThanOrEqual(minDiagrams);
    });
  }

  it('reports a parse failure (never throws) for non-capsule text', async () => {
    const result = await verifyCapsule('Just a normal prose answer with no stemlm block.');
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
