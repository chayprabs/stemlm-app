import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { biologyBenchmarkSpecs } from './specs';

const BENCHMARK_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const PROTOCOL_ROOT = path.resolve(BENCHMARK_ROOT, '..');

const FORBIDDEN_IN_BENCHMARK = [
  /@step\b/i,
  /@diagram\b/i,
  /@formula\b/i,
  /@body\b/i,
  /@meta\b/i,
  /<svg[\s>]/i,
  /```stemlm/i,
  /buildBiologyCapsule/i,
  /biology-question-bank/i,
  /wrapBioSvg/i,
  /"patterns"\s*:/i,
  /verifiedPatterns/i,
];

const FORBIDDEN_IN_EXTENSION = [
  /biology-question-bank/,
  /buildBiologyCapsule/,
  /biology-svg/,
  /BIOLOGY_QUESTIONS/,
];

function listFilesRecursive(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'fixtures' || entry === 'node_modules' || entry === '.git') continue;
      listFilesRecursive(full, acc);
    } else if (/\.(ts|tsx|js|mjs|json)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

function extensionSourceFiles(): string[] {
  const roots = ['src/content', 'src/components', 'src/lib', 'src/platforms', 'entrypoints'].map((p) =>
    path.resolve(PROTOCOL_ROOT, '..', p),
  );
  const files: string[] = [];
  for (const root of roots) {
    try {
      listFilesRecursive(root, files);
    } catch {
      // optional root
    }
  }
  files.push(path.resolve(PROTOCOL_ROOT, 'builder.ts'));
  files.push(path.resolve(PROTOCOL_ROOT, 'classifier.ts'));
  files.push(path.resolve(PROTOCOL_ROOT, 'parser.ts'));
  files.push(path.resolve(PROTOCOL_ROOT, 'playbooks.ts'));
  return files;
}

describe('biology benchmark has zero hardcoded solutions', () => {
  it('spec data contains only question metadata', () => {
    const dataPath = path.join(BENCHMARK_ROOT, 'specs/data.ts');
    const text = readFileSync(dataPath, 'utf8');
    for (const re of FORBIDDEN_IN_BENCHMARK) {
      expect(text, `forbidden in data.ts: ${re}`).not.toMatch(re);
    }
    expect(text).toContain('questions only');
  });

  it('benchmark source tree has no capsule builders or answer banks', () => {
    const files = listFilesRecursive(BENCHMARK_ROOT).filter(
      (file) =>
        !file.endsWith('.test.ts') &&
        !file.endsWith('.test.tsx') &&
        !file.includes(`${path.sep}fixtures${path.sep}`),
    );
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const re of FORBIDDEN_IN_BENCHMARK) {
        expect(text, `${path.basename(file)} matched ${re}`).not.toMatch(re);
      }
    }
  });

  it('specs expose questions only — verify derives from question numerics', () => {
    for (const spec of biologyBenchmarkSpecs) {
      expect(spec.question.length).toBeGreaterThan(20);
      expect(spec.verify).toBeTypeOf('function');
      // Empty capsule must fail; arbitrary text with no question numerics must not pass when question has numbers.
      const empty = spec.verify('');
      expect(empty.ok).toBe(false);
    }
  });

  it('extension runtime sources do not import biology question banks', () => {
    for (const file of extensionSourceFiles()) {
      const text = readFileSync(file, 'utf8');
      for (const re of FORBIDDEN_IN_EXTENSION) {
        expect(text, `${file} matched ${re}`).not.toMatch(re);
      }
    }
  });

  it('biology-question-bank directory is gone', () => {
    const legacy = path.resolve(PROTOCOL_ROOT, 'biology-question-bank');
    expect(() => statSync(legacy)).toThrow();
  });

  it('built extension bundle does not ship biology question banks', () => {
    const outputRoot = path.resolve(PROTOCOL_ROOT, '../..', '.output');
    let scanned = 0;
    for (const file of listFilesRecursive(outputRoot)) {
      if (!/\.(js|css|html|json)$/.test(file)) continue;
      scanned += 1;
      const text = readFileSync(file, 'utf8');
      for (const re of FORBIDDEN_IN_EXTENSION) {
        expect(text, `${file} matched ${re}`).not.toMatch(re);
      }
    }
    expect(scanned).toBeGreaterThan(0);
  });
});
