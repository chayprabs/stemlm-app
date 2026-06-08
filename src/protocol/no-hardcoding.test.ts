/**
 * Guard: the extension must not ship pre-authored solutions, generated prompt
 * banks, benchmark solvers, diagram builders, or answer oracles. Gemini
 * generates capsules at runtime from the user's actual question plus the
 * general protocol/playbook.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const PROTOCOL = join(process.cwd(), 'src/protocol');
const SCRIPTS = join(process.cwd(), 'scripts');

function walk(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
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
  { pattern: /build[A-Za-z]*(?:Capsule|Answer|Solution)/, label: 'hardcoded capsule/answer builder' },
  { pattern: /(?:chemistry|physics|math|biology|electrical)-prompts/, label: 'subject prompt bank' },
  { pattern: /(?:chemistry|physics|math|biology|electrical)-question-bank/, label: 'hardcoded question bank import' },
  { pattern: /verified-answers|question-factory|questions\/year[123]/, label: 'legacy hardcoded answer bank' },
  { pattern: /from ['"].*-(?:benchmark|prompts)/, label: 'benchmark/prompt bank import' },
  { pattern: /math-numeric-checks|numeric-verify-shared|MATH_NUMERIC_SOLVERS|getMathNumericSolver/, label: 'numeric answer oracle' },
  { pattern: /ALL_EE_QUESTIONS|EEProblemSpec|EE_SPECS_|EEBenchmarkEntry/, label: 'EE benchmark/spec registry' },
  { pattern: /from ['"].*\/chem-svg/, label: 'chem-svg hardcoded diagrams' },
  { pattern: /from ['"].*\/physics-svg/, label: 'physics-svg hardcoded diagrams' },
  { pattern: /from ['"].*\/math-svg/, label: 'math-svg hardcoded diagrams' },
  { pattern: /from ['"].*\/biology-svg/, label: 'biology-svg hardcoded diagrams' },
];

const ALLOWED_VERIFIED = new Set([
  join(PROTOCOL, 'no-hardcoding.test.ts'),
]);

describe('no hardcoded solutions or diagram banks', () => {
  const files = [...walk(PROTOCOL), ...walk(SCRIPTS)];

  for (const { pattern, label } of FORBIDDEN_PATTERNS) {
    it(`has no ${label} under protocol/scripts`, () => {
      const hits: string[] = [];
      for (const file of files) {
        if (ALLOWED_VERIFIED.has(file)) continue;
        if (TEST_FILE.test(file)) continue;
        const text = readFileSync(file, 'utf8');
        if (pattern.test(text)) hits.push(file.replace(ROOT + '/', ''));
      }
      expect(hits, `Found ${label} in:\n${hits.join('\n')}`).toEqual([]);
    });
  }

  it('no prompt banks, question banks, benchmarks, or numeric oracle directories remain', () => {
    const dirs = readdirSync(PROTOCOL).filter(
      (d) =>
        d.endsWith('-prompts') ||
        d.includes('question-bank') ||
        d.endsWith('-benchmark') ||
        d === 'math-numeric-checks',
    );
    expect(dirs).toEqual([]);
  });

  it('known hardcoded artifact paths do not exist', () => {
    const removed = [
      'src/protocol/biology-prompts',
      'src/protocol/chemistry-prompts',
      'src/protocol/physics-prompts',
      'src/protocol/math-prompts',
      'src/protocol/electrical-prompts',
      'src/protocol/ee-benchmark',
      'src/protocol/math-numeric-checks',
      'src/protocol/numeric-verify-shared.ts',
      'docs/ee-solver-design.md',
      'scripts/gen-electrical-prompts-ext.mjs',
    ];
    for (const rel of removed) {
      expect(existsSync(join(ROOT, rel)), `${rel} must not exist`).toBe(false);
    }
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
});
