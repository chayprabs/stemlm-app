#!/usr/bin/env node
/**
 * Measure what the guide gets out of a chat model, with the code the extension ships.
 *
 *   node scripts/guide-eval/run.mjs --trials <out-dir>
 *     For every question in questions.json, write <out-dir>/<id>/attachment.txt (the guide the
 *     builder would attach; for a long-chat case, the conversation so far), message.txt (the
 *     student's message as stemLM sends it) and inline.txt (the message when the host takes no
 *     upload). Give a model the attachment and the message, and save its reply as <id>.md.
 *
 *   node scripts/guide-eval/run.mjs <answers-dir> [guide.txt]
 *     Score every <id>.md in <answers-dir> with the parser, ingest and figure compiler. Lines of
 *     [guide.txt] found in an answer count as leaked. Writes <answers-dir>/report.json and prints
 *     one row per answer and the totals.
 *
 * Answers and reports are evaluation output: keep them outside the repository.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const args = process.argv.slice(2);
const trials = args[0] === '--trials' ? args[1] : undefined;
const [answers, guide] = trials ? [] : args;
if (!trials && !answers) {
  console.error('usage: node scripts/guide-eval/run.mjs --trials <out-dir> | <answers-dir> [guide.txt]');
  process.exit(2);
}
const report = answers ? resolve(answers, 'report.json') : '';
// A shell, because on Windows npx is a .cmd file and cannot be spawned directly.
execFileSync('npx vitest run --config scripts/guide-eval/eval.config.ts', {
  shell: true,
  cwd: root,
  stdio: ['ignore', 'pipe', 'inherit'],
  env: {
    ...process.env,
    GUIDE_EVAL_TRIALS: trials ? resolve(trials) : '',
    GUIDE_EVAL_ANSWERS: answers ? resolve(answers) : '',
    GUIDE_EVAL_REPORT: report,
    GUIDE_EVAL_GUIDE: guide ? resolve(guide) : '',
  },
});
if (trials) {
  console.log(`[guide-eval] trial inputs written to ${resolve(trials)}`);
  process.exit(0);
}

const scores = JSON.parse(readFileSync(report, 'utf8'));
const sum = (pick) => scores.reduce((total, score) => total + pick(score), 0);
for (const s of scores) {
  const figures = `${s.figures.asWritten}/${s.figures.afterRepair}/${s.figures.failed.length}`;
  console.log([
    s.id.padEnd(26), s.read.padEnd(7), `steps ${s.stepsWithBody}/${s.steps}`.padEnd(11), `figs ${figures}`.padEnd(11), s.figureFit.padEnd(12),
    `sol ${s.solution ? 'y' : 'n'}`, `verify ${s.verify}`.padEnd(11), `qc ${s.quickChecks}`, `tk ${s.takeaways}`,
    `leak ${s.leaked.length}`, `marks ${s.markers.length}`, `outside ${s.outside}`, s.code ?? '',
  ].join('  '));
  for (const failure of s.figures.failed) console.log(`    figure failed (type=${failure.type}): ${failure.reason}`);
  for (const line of [...s.leaked, ...s.markers]) console.log(`    leaked or visible: ${line.slice(0, 110)}`);
}
const capsules = scores.filter((s) => s.read === 'capsule').length;
console.log(`\n${scores.length} answers: ${capsules} read as stemLM answers, ${scores.filter((s) => s.read === 'plain').length} as plain answers, ${scores.filter((s) => s.read === 'none').length} unreadable`);
console.log(`steps with an explanation: ${sum((s) => s.stepsWithBody)}/${sum((s) => s.steps)}`);
console.log(`figures: ${sum((s) => s.figures.asWritten)} drawn as written, ${sum((s) => s.figures.afterRepair)} after repair, ${sum((s) => s.figures.failed.length)} failed; ${scores.filter((s) => s.figureFit === 'missing').length} answers lacked a figure the question called for`);
console.log(`with a solution: ${scores.filter((s) => s.solution).length}; quick checks: ${sum((s) => s.quickChecks)}; guide text leaked: ${scores.filter((s) => s.leaked.length).length}; markers visible: ${scores.filter((s) => s.markers.length).length}`);
