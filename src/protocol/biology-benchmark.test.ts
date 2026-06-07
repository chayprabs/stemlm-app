import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/src/lib/mermaid', () => ({
  renderMermaid: vi.fn(
    async () =>
      '<svg viewBox="0 0 100 60"><rect width="40" height="20" style="fill:#eee;stroke:#333"/></svg>',
  ),
}));

import { buildInjectionPayload } from './builder';
import { classifySubject } from './classifier';
import { biologyBenchmarkSpecs } from './biology-benchmark/specs';
import { verifyBiologyCapsule } from './biology-benchmark/verify-capsule';

const FIXTURE_DIR = path.resolve(import.meta.dirname, 'biology-benchmark/fixtures');

async function fixtureExists(specId: string): Promise<boolean> {
  try {
    await access(path.join(FIXTURE_DIR, `${specId}.stemlm`));
    return true;
  } catch {
    return false;
  }
}

async function readFixture(specId: string): Promise<string | null> {
  if (!(await fixtureExists(specId))) return null;
  return readFile(path.join(FIXTURE_DIR, `${specId}.stemlm`), 'utf8');
}

describe('biology benchmark specs', () => {
  it('has 50 Year-1 biology prompts without hardcoded solutions', () => {
    expect(biologyBenchmarkSpecs).toHaveLength(50);
    const numbers = biologyBenchmarkSpecs.map((spec) => spec.number).sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });

  for (const spec of biologyBenchmarkSpecs) {
    describe(`Q${spec.number}: ${spec.topic}`, () => {
      it('classifies as Biology', () => {
        expect(classifySubject(spec.question)).toBe('Biology');
      });

      it('uses Biology playbook in injection payload', () => {
        const payload = buildInjectionPayload(spec.question);
        expect(payload.subject).toBe('Biology');
        expect(payload.fileContent).toMatch(/Biology/i);
        expect(payload.composerText).toContain(spec.question.slice(0, 40));
      });

      it('verifies cached AI fixture when present', async () => {
        const fixture = await readFixture(spec.id);
        if (!fixture) {
          console.warn(
            `[biology-benchmark] No fixture for ${spec.id}. Run: pnpm fixtures:biology --only=${spec.id}`,
          );
          return;
        }

        const report = await verifyBiologyCapsule(spec, fixture);
        if (!report.ok) {
          console.error(`Q${spec.number} errors:`, report.errors);
          console.error(`Q${spec.number} warnings:`, report.warnings);
        }
        expect(report.ok, report.errors.join('; ')).toBe(true);
        expect(report.stepCount).toBeGreaterThanOrEqual(3);
        expect(report.diagramCount).toBeGreaterThanOrEqual(2);
      });
    });
  }
});

describe('biology benchmark fixture coverage', () => {
  it('reports how many AI fixtures are cached', async () => {
    const present = await Promise.all(biologyBenchmarkSpecs.map((spec) => fixtureExists(spec.id)));
    const count = present.filter(Boolean).length;
    if (count === 0) {
      console.warn(
        '[biology-benchmark] No cached fixtures yet. Generate with: GEMINI_API_KEY=... pnpm fixtures:biology',
      );
    }
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
