/**
 * Extension runtime must never import pre-authored solutions, numeric oracles,
 * exam question banks, or structural fixtures. Gemini generates answers at runtime.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'src');

const RUNTIME_DIRS = ['content', 'components', 'state', 'platforms', 'lib'] as const;

const RUNTIME_FORBIDDEN: { pattern: RegExp; label: string }[] = [
  { pattern: /from ['"]@\/src\/protocol\/__fixtures/, label: 'protocol __fixtures__ import' },
  { pattern: /from ['"]@\/src\/protocol\/__fixtures-long-steps/, label: 'long-step fixtures import' },
  { pattern: /from ['"]@\/src\/protocol\/__fixtures-visual-subjects/, label: 'visual-subject fixtures import' },
  { pattern: /from ['"].*math-numeric-checks/, label: 'math numeric oracle import' },
  { pattern: /from ['"].*numeric-verify-shared/, label: 'numeric verify oracle import' },
  { pattern: /from ['"].*-prompts/, label: 'exam prompt bank import' },
  { pattern: /from ['"].*question-bank/, label: 'hardcoded question bank import' },
  { pattern: /from ['"].*-benchmark/, label: 'benchmark bank import' },
  { pattern: /verifiedPatterns\s*:/, label: 'verifiedPatterns answer oracle' },
  { pattern: /buildChemistryCapsule|buildPhysicsCapsule|buildMathCapsule/, label: 'hardcoded capsule builder' },
  { pattern: /MATH_NUMERIC_SOLVERS|getMathNumericSolver/, label: 'numeric solver registry' },
];

function walkRuntime(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'node_modules') continue;
      walkRuntime(p, acc);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) {
      acc.push(p);
    }
  }
  return acc;
}

describe('extension runtime has no hardcoded solutions or exam banks', () => {
  const runtimeFiles = RUNTIME_DIRS.flatMap((d) => walkRuntime(join(ROOT, d)));

  it('scans production extension modules (excludes *.test.*)', () => {
    expect(runtimeFiles.length).toBeGreaterThan(20);
  });

  for (const { pattern, label } of RUNTIME_FORBIDDEN) {
    it(`runtime code has no ${label}`, () => {
      const hits: string[] = [];
      for (const file of runtimeFiles) {
        const text = readFileSync(file, 'utf8');
        if (pattern.test(text)) hits.push(file.replace(process.cwd() + '/', ''));
      }
      expect(hits, `Found ${label} in runtime:\n${hits.join('\n')}`).toEqual([]);
    });
  }

  it('content controller uses AI injection only (builder + parser)', () => {
    const text = readFileSync(join(ROOT, 'content/controller.ts'), 'utf8');
    expect(text).toContain('buildInjectionPayload');
    expect(text).toContain('parse');
    expect(text).not.toMatch(/math-numeric|question-bank|verifiedPatterns/);
  });
});
