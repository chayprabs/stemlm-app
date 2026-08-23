/**
 * Parse representative new-protocol capsules with the SHIPPED parser.
 *   node --import tsx --import ./scripts/eval/raw-hook.mjs scripts/eval/parse-golden.mjs <file>
 */
import { register } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

register('./raw-hook.mjs', import.meta.url);
register('./alias-hook.mjs', import.meta.url);
globalThis.__GA_MEASUREMENT_ID__ = '';
globalThis.__GA_API_SECRET__ = '';

const { parse } = await import('@/src/protocol/parser.ts');
const { stitchResume } = await import('@/src/protocol/apply.ts');

const file = resolve(process.argv[2] ?? 'golden/samples.stemlm');
const src = readFileSync(file, 'utf8');
const blocks = src
  .split(/```stemlm/i)
  .slice(1)
  .map((b) => '```stemlm' + b.split('```')[0] + '\n```');

let parseOk = 0;
const rows = [];
for (const [i, raw] of blocks.entries()) {
  const result = parse(raw);
  const usable =
    result.status !== 'empty' &&
    Boolean(
      (result.capsule && result.capsule.steps.length > 0) ||
        (result.patch && result.patch.length > 0) ||
        (result.questions && result.questions.length > 1),
    );
  if (usable) parseOk += 1;
  rows.push({
    i,
    status: result.status,
    steps: result.capsule?.steps?.map((s) => s.id) ?? [],
    version: result.capsule?.meta.version,
    questions: result.questions?.length ?? 0,
    patch: result.patch?.length ?? 0,
    hasUncertainty: Boolean(result.capsule?.uncertainty),
    hasVerify: Boolean(result.capsule?.verification),
    usable,
  });
}

const part1 = [
  '```stemlm',
  '@meta',
  'version: 2',
  'subject: Math',
  'topic: Resume',
  '@endmeta',
  '@step id=s1',
  'title: Start',
  '@body',
  'First move.',
  '@endbody',
  '@endstep',
  '@resume token=tok1',
].join('\n');
const part2 = [
  '```stemlm',
  '@resume token=tok1',
  '@step id=s2',
  'title: Finish',
  '@body',
  'Second move.',
  '@endbody',
  '@endstep',
  '@solution',
  'done',
  '@endsolution',
  '@end',
  '```',
].join('\n');
const stitched = parse(stitchResume([part1, part2]));

const report = {
  file,
  n: blocks.length,
  parseOk,
  parseRate: blocks.length ? parseOk / blocks.length : 0,
  rows,
  resumeSteps: stitched.capsule?.steps?.map((s) => s.id),
  resumeOk: stitched.status === 'ok' && stitched.capsule?.steps?.length === 2,
};
console.log(JSON.stringify(report, null, 2));
if (report.parseRate < 0.95 || !report.resumeOk) process.exit(1);
