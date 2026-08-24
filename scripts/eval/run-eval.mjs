/**
 * stemLM evaluation harness — EXTERNAL inputs only.
 *
 * Reads a question set from an external markdown/text file (never committed),
 * runs the REAL classifier + prompt builder, and records subject routing and
 * injected-prompt sizes. Optionally verifies a local file of captured Gemini
 * capsules with the REAL structural verifier (parse → SVG sanitize/size/label →
 * scoreRaw → PDF build).
 *
 * It does NOT ship questions, answers, oracles, or generated capsules into the
 * extension. Output is written to a git-ignored directory (default artifacts/eval).
 *
 * Usage:
 *   pnpm eval --file <questions.md> [--answers <capsules.md|.json>]
 *             [--sample N] [--subject Physics] [--out artifacts/eval]
 *
 *   (or set STEMLM_EVAL_FILE / STEMLM_EVAL_ANSWERS instead of --file/--answers)
 *
 * With no question file it prints usage + the manual-QA checklist and exits 0.
 *
 * Requires the loader hooks for Vite-style `?raw` imports and `@/` aliases.
 * `pnpm eval` runs this file with Node (no tsx).
 */
import { register } from 'node:module';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';

// 1) `@/` → repo root `.ts` and Vite `?raw` imports used by the protocol modules.
register('./alias-hook.mjs', import.meta.url);
register('./raw-hook.mjs', import.meta.url);
// 2) Shim the analytics build-time globals (no telemetry in the harness).
globalThis.__GA_MEASUREMENT_ID__ = '';
globalThis.__GA_API_SECRET__ = '';

const ROOT = resolvePath(process.cwd());

// ── arg parsing ───────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { sample: 0, out: 'artifacts/eval', variant: 'both' };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--file') out.file = argv[++i];
    else if (a === '--answers') out.answers = argv[++i];
    else if (a === '--sample') out.sample = Number(argv[++i]) || 0;
    else if (a === '--subject') out.subject = argv[++i];
    else if (a === '--out') out.out = argv[++i];
    else if (a === '--variant') out.variant = argv[++i];
  }
  out.file = out.file ?? process.env.STEMLM_EVAL_FILE;
  out.answers = out.answers ?? process.env.STEMLM_EVAL_ANSWERS;
  return out;
}

const MANUAL_QA = `
stemLM evaluation harness — no question file provided.

This tool reads questions from a file you keep OUTSIDE the repo (the 250-question
set must never be committed). Then it reports subject routing and prompt sizes,
and can structurally verify captured Gemini answers.

  pnpm eval --file /opt/cursor/artifacts/eval/questions.md
  pnpm eval --file questions.md --sample 5            # 5 per subject
  pnpm eval --file questions.md --subject Physics
  pnpm eval --file questions.md --answers captured.md # verify captured capsules

Question file format (any of these is detected):
  - numbered:   "1. <question>"  / "Q1: <question>"
  - headings:   "### <question>"
  - blocks:     questions separated by blank lines

Answers file format:
  - markdown/text containing one or more \`\`\`stemlm … \`\`\` fenced capsules, or
  - a JSON array of { "question"?: string, "raw": "<capsule text>" }

Manual QA (needs a Gemini account — not automatable here):
  1. pnpm build → load .output/chrome-mv3 as an unpacked extension.
  2. Open gemini.google.com, paste a question, click the stemLM button.
  3. Confirm stemlm-protocol.txt attaches and the short stub appears.
  4. Confirm the panel opens when the answer starts and parses into step cards.
  5. Inspect: step bodies show worked substitutions; diagrams are complete,
     labeled, and fit the card; no label collisions; final verification step.
  6. Export the PDF and confirm diagrams stay within print bounds.
  7. Score the output against docs/eval-rubric.md.
`;

// ── question parsing (heuristic; no questions embedded here) ────────────────────
function parseQuestions(text) {
  const lines = text.split(/\r?\n/);
  const numbered = [];
  let current = null;
  const numRe = /^\s*(?:Q\s*)?(\d{1,3})\s*[.)\]:-]\s+(.*)$/i;
  const headRe = /^\s*#{1,6}\s+(.*)$/;
  for (const line of lines) {
    const mNum = numRe.exec(line);
    const mHead = headRe.exec(line);
    if (mNum) {
      if (current) numbered.push(current);
      current = mNum[2].trim();
    } else if (mHead) {
      if (current) numbered.push(current);
      current = mHead[1].trim();
    } else if (current != null) {
      current += line.trim() ? `\n${line.trim()}` : '';
    }
  }
  if (current) numbered.push(current);

  let items = numbered.map((q) => q.trim()).filter((q) => q.length >= 12);
  if (items.length === 0) {
    // Fall back to blank-line-separated blocks.
    items = text
      .split(/\n\s*\n/)
      .map((b) => b.replace(/\s+/g, ' ').trim())
      .filter((b) => b.length >= 12);
  }
  return items;
}

function samplePerSubject(rows, n) {
  if (!n) return rows;
  const bySubject = new Map();
  for (const r of rows) {
    const list = bySubject.get(r.subject) ?? [];
    if (list.length < n) list.push(r);
    bySubject.set(r.subject, list);
  }
  return [...bySubject.values()].flat();
}

function stats(nums) {
  if (nums.length === 0) return { min: 0, median: 0, max: 0, mean: 0 };
  const s = [...nums].sort((a, b) => a - b);
  const median = s[Math.floor(s.length / 2)];
  const mean = Math.round(s.reduce((a, b) => a + b, 0) / s.length);
  return { min: s[0], median, max: s[s.length - 1], mean };
}

function extractCapsules(text) {
  const out = [];
  const re = /```+\s*stemlm[\s\S]*?```/gi;
  let m;
  while ((m = re.exec(text))) out.push(m[0]);
  return out;
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.file) {
    console.log(MANUAL_QA);
    return;
  }
  const filePath = resolvePath(ROOT, args.file);
  if (!existsSync(filePath)) {
    console.error(`Question file not found: ${filePath}`);
    process.exitCode = 1;
    return;
  }

  const builder = await import('@/src/protocol/builder.ts');
  const { classifySubject } = await import('@/src/protocol/classifier.ts');

  const questions = parseQuestions(readFileSync(filePath, 'utf8'));
  if (questions.length === 0) {
    console.error('No questions parsed from the file. Check the format (see --help).');
    process.exitCode = 1;
    return;
  }

  const variants =
    args.variant === 'balanced' || args.variant === 'ultra' ? [args.variant] : ['balanced', 'ultra'];

  let rows = questions.map((question) => {
    const subject = classifySubject(question);
    const sizes = {};
    for (const variant of variants) {
      const payload = builder.buildInjectionPayload(question, { subject: 'Auto', variant });
      sizes[variant] = {
        composerBytes: Buffer.byteLength(payload.composerText, 'utf8'),
        fileBytes: Buffer.byteLength(payload.fileContent, 'utf8'),
      };
    }
    return { question, subject, sizes };
  });

  if (args.subject) rows = rows.filter((r) => r.subject === args.subject);
  rows = samplePerSubject(rows, args.sample);

  // Routing distribution.
  const routing = {};
  for (const r of rows) routing[r.subject] = (routing[r.subject] ?? 0) + 1;

  // Prompt-size stats per variant.
  const sizeStats = {};
  for (const variant of variants) {
    sizeStats[variant] = {
      composer: stats(rows.map((r) => r.sizes[variant].composerBytes)),
      file: stats(rows.map((r) => r.sizes[variant].fileBytes)),
    };
  }

  // Optional: structural verification of captured capsules.
  let rubric = null;
  if (args.answers) {
    rubric = await runRubric(resolvePath(ROOT, args.answers));
  }

  // Write reports to the git-ignored output dir.
  const outDir = resolvePath(ROOT, args.out);
  mkdirSync(outDir, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    sourceFile: args.file,
    totalParsed: questions.length,
    evaluated: rows.length,
    variants,
    routing,
    sizeStats,
    rubric,
    rows: rows.map((r) => ({ subject: r.subject, sizes: r.sizes, question: r.question.slice(0, 120) })),
  };
  writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  writeFileSync(join(outDir, 'report.md'), renderMarkdown(report));

  // Console summary.
  console.log(`\nstemLM eval — ${rows.length}/${questions.length} questions (source: ${args.file})\n`);
  console.log('Subject routing:');
  for (const [subject, count] of Object.entries(routing).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${subject.padEnd(12)} ${count}`);
  }
  for (const variant of variants) {
    const s = sizeStats[variant];
    console.log(
      `\nPrompt size [${variant}]  composer(min/med/max): ${s.composer.min}/${s.composer.median}/${s.composer.max} B` +
        `  file: ${s.file.min}/${s.file.median}/${s.file.max} B`,
    );
  }
  if (rubric) {
    console.log(
      `\nStructural rubric: ${rubric.passed}/${rubric.total} capsules OK` +
        (rubric.failures.length ? ` (failures logged in report.md)` : ''),
    );
  }
  console.log(`\nFull report: ${join(args.out, 'report.json')} and report.md\n`);
}

async function runRubric(answersPath) {
  if (!existsSync(answersPath)) {
    console.error(`Answers file not found: ${answersPath}`);
    return null;
  }
  // Register a DOM for the verifier (sanitize/present/label/PDF use DOMParser).
  try {
    const { Window } = await import('happy-dom');
    const win = new Window();
    // DOMPurify (used by the sanitizer) binds to `window` at import time.
    globalThis.window = win;
    for (const key of ['DOMParser', 'XMLSerializer', 'document', 'CSS', 'Node', 'NodeFilter', 'HTMLElement', 'Element']) {
      if (win[key] != null && globalThis[key] == null) globalThis[key] = win[key];
    }
  } catch (e) {
    console.error('happy-dom not available — cannot run structural rubric.', e.message);
    return null;
  }

  const raw = readFileSync(answersPath, 'utf8');
  let capsules = [];
  if (answersPath.endsWith('.json')) {
    const data = JSON.parse(raw);
    capsules = (Array.isArray(data) ? data : []).map((d) => d.raw).filter(Boolean);
  } else {
    capsules = extractCapsules(raw);
  }
  if (capsules.length === 0) return { total: 0, passed: 0, results: [], failures: [] };

  const { verifyCapsule } = await import('@/src/protocol/capsule-verify.tsx');
  const results = [];
  for (const cap of capsules) {
    try {
      const r = await verifyCapsule(cap);
      results.push({
        ok: r.ok,
        subject: r.subject,
        stepCount: r.stepCount,
        diagramCount: r.diagramCount,
        errors: r.errors,
      });
    } catch (e) {
      results.push({ ok: false, subject: 'General', stepCount: 0, diagramCount: 0, errors: [String(e)] });
    }
  }
  const passed = results.filter((r) => r.ok).length;
  return {
    total: results.length,
    passed,
    results,
    failures: results.filter((r) => !r.ok),
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push(`# stemLM evaluation report`);
  lines.push('');
  lines.push(`- Generated: ${report.generatedAt}`);
  lines.push(`- Source: \`${report.sourceFile}\` (external; not committed)`);
  lines.push(`- Parsed: ${report.totalParsed} · Evaluated: ${report.evaluated}`);
  lines.push('');
  lines.push(`## Subject routing`);
  lines.push('');
  lines.push('| Subject | Count |');
  lines.push('| --- | ---: |');
  for (const [subject, count] of Object.entries(report.routing).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${subject} | ${count} |`);
  }
  lines.push('');
  lines.push(`## Injected prompt size (bytes)`);
  lines.push('');
  lines.push('| Variant | composer min/med/max | file min/med/max |');
  lines.push('| --- | --- | --- |');
  for (const [variant, s] of Object.entries(report.sizeStats)) {
    lines.push(
      `| ${variant} | ${s.composer.min}/${s.composer.median}/${s.composer.max} | ${s.file.min}/${s.file.median}/${s.file.max} |`,
    );
  }
  if (report.rubric) {
    lines.push('');
    lines.push(`## Structural rubric (captured capsules)`);
    lines.push('');
    lines.push(`Passed ${report.rubric.passed} / ${report.rubric.total}.`);
    if (report.rubric.failures.length) {
      lines.push('');
      lines.push('### Failures');
      report.rubric.failures.forEach((f, i) => {
        lines.push(`- #${i + 1} [${f.subject}] steps=${f.stepCount} diagrams=${f.diagramCount}: ${f.errors.join('; ')}`);
      });
    }
  }
  lines.push('');
  return lines.join('\n');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
