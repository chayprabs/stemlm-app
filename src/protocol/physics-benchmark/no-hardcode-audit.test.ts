/**
 * Strict audit: physics production code must have ZERO hardcoded solutions,
 * diagrams, or legacy question-bank artifacts. Fails if forbidden paths or
 * patterns reappear.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHYSICS_SPECS } from './specs/index';

const HERE = dirname(fileURLToPath(import.meta.url));
const BENCHMARK_DIR = HERE;
const PROTOCOL_DIR = join(HERE, '..');
const WORKSPACE_ROOT = join(HERE, '..', '..', '..');

const FORBIDDEN_PATHS = [
  'src/protocol/physics-question-bank',
  'src/protocol/physics-svg.ts',
  'src/protocol/physics-verify.tsx',
  'src/protocol/physics-questions.test.ts',
] as const;

const PRODUCTION_SCAN_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: 'stemlm code fence', regex: /```stemlm/i },
  { label: '@step marker', regex: /@step\b/ },
  { label: '@diagram marker', regex: /@diagram\b/ },
  { label: '@formula marker', regex: /@formula\b/ },
  { label: '@solution marker', regex: /@solution\b/ },
  { label: 'inline SVG', regex: /<svg\b/i },
  { label: 'buildPhysicsCapsule', regex: /\bbuildPhysicsCapsule\b/ },
  { label: 'wrapPhysicsSvg', regex: /\bwrapPhysicsSvg\b/ },
  { label: 'physicsGraph', regex: /\bphysicsGraph\b/ },
  { label: 'verifiedPatterns', regex: /\bverifiedPatterns\b/ },
  { label: 'exported solveQ answer generator', regex: /export\s+(?:async\s+)?function\s+solveQ\d+/ },
];

const BUILDER_FORBIDDEN_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: 'physics-question-bank import', regex: /physics-question-bank/ },
  { label: 'buildPhysicsCapsule', regex: /\bbuildPhysicsCapsule\b/ },
  { label: 'wrapPhysicsSvg', regex: /\bwrapPhysicsSvg\b/ },
  { label: 'physicsGraph', regex: /\bphysicsGraph\b/ },
  { label: 'hardcoded physics stemlm capsule', regex: /```stemlm[\s\S]*@step/ },
];

const STEMLM_FENCE_IN_QUESTION = /```\s*stemlm/i;

function collectProductionFiles(dir: string, root = dir): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const rel = relative(root, fullPath);

    if (rel === 'fixtures' || rel.startsWith('fixtures/')) {
      continue;
    }

    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...collectProductionFiles(fullPath, root));
      continue;
    }

    if (!/\.(ts|tsx|js|mjs)$/i.test(entry)) continue;
    if (/\.test\.(ts|tsx)$/i.test(entry)) continue;

    files.push(fullPath);
  }

  return files.sort();
}

function scanForForbiddenPatterns(
  filePath: string,
  patterns: Array<{ label: string; regex: RegExp }>,
): string[] {
  const content = readFileSync(filePath, 'utf8');
  const rel = relative(WORKSPACE_ROOT, filePath);
  const hits: string[] = [];

  for (const { label, regex } of patterns) {
    if (regex.test(content)) {
      hits.push(`${rel}: forbidden ${label}`);
    }
  }

  return hits;
}

describe('physics no-hardcode audit', () => {
  it('does not contain legacy hardcoded physics paths', () => {
    for (const relPath of FORBIDDEN_PATHS) {
      const abs = join(WORKSPACE_ROOT, relPath);
      expect(existsSync(abs), `forbidden path must not exist: ${relPath}`).toBe(false);
    }
  });

  it('production files under physics-benchmark/ have no hardcoded capsule content', () => {
    const productionFiles = collectProductionFiles(BENCHMARK_DIR);
    expect(productionFiles.length).toBeGreaterThan(0);

    const violations: string[] = [];
    for (const filePath of productionFiles) {
      violations.push(...scanForForbiddenPatterns(filePath, PRODUCTION_SCAN_PATTERNS));
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });

  it('builder.ts does not wire physics question-bank or hardcoded answer blocks', () => {
    const builderPath = join(PROTOCOL_DIR, 'builder.ts');
    const content = readFileSync(builderPath, 'utf8');

    expect(content).not.toMatch(/from\s+['"].*physics-question-bank/);
    expect(content).not.toMatch(/import\s*\([^)]*physics-question-bank/);

    const violations = scanForForbiddenPatterns(builderPath, BUILDER_FORBIDDEN_PATTERNS);
    expect(violations, violations.join('\n')).toEqual([]);
  });

  it('PHYSICS_SPECS questions are plain text only (no stemlm fence markers)', () => {
    expect(PHYSICS_SPECS.length).toBeGreaterThan(0);

    for (const spec of PHYSICS_SPECS) {
      expect(
        STEMLM_FENCE_IN_QUESTION.test(spec.question),
        `${spec.id} question must be plain text without \`\`\`stemlm fences`,
      ).toBe(false);
      expect(spec.question.trim().length).toBeGreaterThan(0);
    }
  });

  it('fixtures/ contains only .stemlm cache files (never .ts hardcoded answers)', () => {
    const fixturesDir = join(BENCHMARK_DIR, 'fixtures');
    if (!existsSync(fixturesDir)) return;

    const entries = readdirSync(fixturesDir);
    const violations: string[] = [];

    for (const entry of entries) {
      const fullPath = join(fixturesDir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        violations.push(`fixtures/${entry}: nested fixture directories are not allowed`);
        continue;
      }

      if (/\.ts$/i.test(entry)) {
        violations.push(`fixtures/${entry}: fixture files must be .stemlm, never .ts`);
      }
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });
});
