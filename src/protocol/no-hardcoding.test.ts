/**
 * Guard: the extension must not ship pre-authored solutions, diagram builders,
 * answer oracles, per-question solvers, or exam question banks. Gemini generates
 * every capsule at runtime from the user's question + the general protocol +
 * one subject playbook.
 *
 * This is one of only two files allowed to mention the forbidden identifiers
 * (the other is extension-runtime-no-hardcoding.test.ts).
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

const FORBIDDEN_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /verifiedPatterns\s*:/, label: 'verifiedPatterns answer oracle' },
  {
    pattern: /buildChemistryCapsule|buildPhysicsCapsule|buildMathCapsule|buildBiologyCapsule/,
    label: 'hardcoded capsule builder',
  },
  {
    pattern: /question-bank|exam-bank/,
    label: 'hardcoded question bank import',
  },
  {
    pattern: /verified-answers|question-factory|questions\/year[123]/,
    label: 'legacy hardcoded EE answer bank',
  },
  {
    pattern: /from ['"].*-benchmark/,
    label: 'hardcoded benchmark bank import',
  },
  {
    pattern: /from ['"].*\/(?:ee-benchmark|math-numeric-checks|numeric-verify-shared)/,
    label: 'numeric oracle / EE solver benchmark import',
  },
  {
    pattern: /from ['"].*-prompts(?:\/|['"])/,
    label: 'exam prompt-bank import',
  },
  {
    pattern: /MATH_NUMERIC_SOLVERS|getMathNumericSolver|EE_SPECS|ALL_EE_QUESTIONS/,
    label: 'numeric solver / EE spec registry',
  },
  {
    pattern: /\b(?:PHYSICS|CHEMISTRY|MATH|BIOLOGY|ELECTRICAL)_PROMPTS\b/,
    label: 'exam prompt-bank export',
  },
  { pattern: /from ['"].*\/chem-svg/, label: 'chem-svg hardcoded diagrams' },
  { pattern: /from ['"].*\/physics-svg/, label: 'physics-svg hardcoded diagrams' },
  { pattern: /from ['"].*\/math-svg/, label: 'math-svg hardcoded diagrams' },
  { pattern: /from ['"].*\/biology-svg/, label: 'biology-svg hardcoded diagrams' },
];

/** Only this guard file may contain the forbidden identifiers (as patterns). */
const ALLOWED_SELF = new Set([join(PROTOCOL, 'no-hardcoding.test.ts')]);

/** Directories that previously held banks/oracles/benchmarks — must stay gone. */
const FORBIDDEN_DIRS = [
  'ee-benchmark',
  'math-numeric-checks',
  'biology-prompts',
  'chemistry-prompts',
  'electrical-prompts',
  'math-prompts',
  'physics-prompts',
];

describe('no hardcoded solutions, oracles, solvers, or exam banks', () => {
  const files = walk(PROTOCOL);

  for (const { pattern, label } of FORBIDDEN_PATTERNS) {
    it(`has no ${label} under src/protocol`, () => {
      const hits: string[] = [];
      for (const file of files) {
        if (ALLOWED_SELF.has(file)) continue;
        const text = readFileSync(file, 'utf8');
        if (pattern.test(text)) hits.push(file.replace(process.cwd() + '/', ''));
      }
      expect(hits, `Found ${label} in:\n${hits.join('\n')}`).toEqual([]);
    });
  }

  it('no exam-bank / numeric-oracle / solver-benchmark directories remain', () => {
    const present = FORBIDDEN_DIRS.filter((d) => existsSync(join(PROTOCOL, d)));
    expect(present, `These hardcoded directories must not exist: ${present.join(', ')}`).toEqual([]);
  });

  it('no *-question-bank or *-benchmark directories remain', () => {
    const dirs = readdirSync(PROTOCOL).filter(
      (d) => d.includes('question-bank') || d.endsWith('-benchmark') || d.endsWith('-prompts'),
    );
    expect(dirs).toEqual([]);
  });

  it('no *-svg diagram-builder modules remain', () => {
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
      /MATH_NUMERIC_SOLVERS/,
      /EE_SPECS/,
    ];
    for (const file of bundleFiles) {
      const text = readFileSync(file, 'utf8');
      for (const pattern of forbidden) {
        expect(text, `${file} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});
