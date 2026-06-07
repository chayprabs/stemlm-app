/**
 * Guard: the extension must not ship pre-authored solutions, diagram builders,
 * or answer oracles. Gemini generates capsules at runtime.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PROTOCOL = join(process.cwd(), 'src/protocol');

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'node_modules') continue;
      walk(p, acc);
    } else if (/\.(ts|tsx)$/.test(name)) {
      acc.push(p);
    }
  }
  return acc;
}

const TEST_FILE = /\.test\.(ts|tsx)$/;

const FORBIDDEN_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /verifiedPatterns\s*:/, label: 'verifiedPatterns answer oracle' },
  { pattern: /buildChemistryCapsule|buildPhysicsCapsule|buildMathCapsule/, label: 'hardcoded capsule builder' },
  { pattern: /chemistry-question-bank|physics-question-bank|math-question-bank|biology-question-bank/, label: 'hardcoded question bank import' },
  { pattern: /from ['"].*ee-benchmark/, label: 'ee-benchmark hardcoded bank' },
  { pattern: /from ['"].*physics-benchmark/, label: 'physics-benchmark hardcoded bank' },
  { pattern: /from ['"].*biology-benchmark/, label: 'biology-benchmark hardcoded bank' },
  { pattern: /from ['"].*math-benchmark/, label: 'math-benchmark hardcoded bank' },
  { pattern: /from ['"].*\/chem-svg/, label: 'chem-svg hardcoded diagrams' },
  { pattern: /from ['"].*\/physics-svg/, label: 'physics-svg hardcoded diagrams' },
  { pattern: /from ['"].*\/math-svg/, label: 'math-svg hardcoded diagrams' },
  { pattern: /from ['"].*\/biology-svg/, label: 'biology-svg hardcoded diagrams' },
];

const ALLOWED_VERIFIED = new Set([
  join(PROTOCOL, 'no-hardcoding.test.ts'),
]);

describe('no hardcoded solutions or diagram banks', () => {
  const files = walk(PROTOCOL);

  for (const { pattern, label } of FORBIDDEN_PATTERNS) {
    it(`has no ${label} under src/protocol`, () => {
      const hits: string[] = [];
      for (const file of files) {
        if (ALLOWED_VERIFIED.has(file)) continue;
        const text = readFileSync(file, 'utf8');
        if (pattern.test(text)) hits.push(file.replace(process.cwd() + '/', ''));
      }
      expect(hits, `Found ${label} in:\n${hits.join('\n')}`).toEqual([]);
    });
  }

  it('prompt banks contain questions only (no steps/solution fields)', () => {
    const promptDirs = ['chemistry-prompts', 'physics-prompts', 'math-prompts', 'biology-prompts', 'electrical-prompts'];
    for (const dir of promptDirs) {
      const promptsFile = join(PROTOCOL, dir, 'prompts.ts');
      const text = readFileSync(promptsFile, 'utf8');
      expect(text).not.toMatch(/"steps"\s*:/);
      expect(text).not.toMatch(/"solution"\s*:/);
      expect(text).not.toMatch(/verifiedPatterns/);
    }
  });

  it('no *-question-bank or *-benchmark directories remain', () => {
    const dirs = readdirSync(PROTOCOL).filter(
      (d) => d.includes('question-bank') || d.endsWith('-benchmark'),
    );
    expect(dirs).toEqual([]);
  });

  it('no *-svg diagram builder modules remain', () => {
    const svgBuilders = readdirSync(PROTOCOL).filter((f) => f.endsWith('-svg.ts'));
    expect(svgBuilders).toEqual([]);
  });

  it('built extension bundle does not ship question banks or capsule builders', () => {
    const outputRoot = join(process.cwd(), '.output');
    if (!existsSync(outputRoot)) return;
    const bundleFiles = walk(outputRoot).filter((f) => /\.(js|css|html)$/.test(f));
    if (bundleFiles.length === 0) return;
    const forbidden = [
      /biology-question-bank/,
      /chemistry-question-bank/,
      /physics-question-bank/,
      /math-question-bank/,
      /buildBiologyCapsule/,
      /buildChemistryCapsule/,
      /buildPhysicsCapsule/,
      /buildMathCapsule/,
    ];
    for (const file of bundleFiles) {
      const text = readFileSync(file, 'utf8');
      for (const pattern of forbidden) {
        expect(text, `${file} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it('math-numeric-checks oracles are test-only (never imported by production protocol modules)', () => {
    const hits: string[] = [];
    for (const file of files) {
      if (TEST_FILE.test(file)) continue;
      if (file.includes('math-numeric-checks')) continue;
      if (file.includes('numeric-verify-shared')) continue;
      const text = readFileSync(file, 'utf8');
      if (/from ['"].*math-numeric-checks|getMathNumericSolver|MATH_NUMERIC_SOLVERS/.test(text)) {
        hits.push(file.replace(process.cwd() + '/', ''));
      }
    }
    expect(hits, `Numeric oracles must stay in *.test.* only:\n${hits.join('\n')}`).toEqual([]);
  });
});
