/**
 * Guide evaluation: score raw chat answers with the shipped parser, ingest and figure compiler.
 * Driven by scripts/guide-eval/run.mjs.
 *
 * Scoring: GUIDE_EVAL_ANSWERS = folder of <question id>.md files, one raw chat reply each
 *          GUIDE_EVAL_GUIDE   = optional guide text the model was given (to detect copied lines)
 *          GUIDE_EVAL_REPORT  = path of the JSON report to write
 * Trials:  GUIDE_EVAL_TRIALS  = folder to write each question's attachment and message into
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { it } from 'vitest';
import { buildComposerAppendix, buildComposerPointer, buildInjectionPayload, buildInjectionPrompt } from '@/src/protocol/builder';
import { parse } from '@/src/protocol/parser';
import { stepBodyWasSalvaged } from '@/src/protocol/step-quality';
import type { Capsule, Diagram } from '@/src/protocol/types';
import { structureAnswer } from '@/src/ingest';
import { compileDiagram, compileDiagramStrict } from '@/src/lib/resolve-diagram';
import { canonicalizeDiagramType } from '@/src/lib/figure/catalog';

interface Question { id: string; wants: string; question: string; history?: Array<[string, string]>; guideAbove?: boolean }

export interface AnswerScore {
  id: string;
  /** `capsule`: the panel opens it as a stemLM answer. `plain`: structured from its own text. `none`: neither. */
  read: 'capsule' | 'plain' | 'none';
  /** Why it was not read as a capsule. */
  code?: string;
  steps: number;
  /** Steps whose explanation the model wrote (not a body filled in from the formula). */
  stepsWithBody: number;
  figures: { asWritten: number; afterRepair: number; failed: Array<{ type: string; reason: string }> };
  /** How the figures fit what the question called for. */
  figureFit: 'expected' | 'other family' | 'missing' | 'unwanted' | 'none needed';
  solution: boolean;
  verify: 'pass' | 'fail' | 'none';
  quickChecks: number;
  takeaways: number;
  /** Lines of the guide repeated in the answer, or stemLM's own message text inside `question:`. */
  leaked: string[];
  /** Marker text the student would see in a title, body, takeaway, quick check or solution. */
  markers: string[];
  /** Characters of prose outside the capsule, which the panel does not show. */
  outside: number;
}

const MARKER = /(?:^|\s)@(?:end)?(?:meta|step|formula|body|diagram|takeaway|quickcheck|followup|solution|verify|uncertainty|patch|q)\b|(?:^|\s)@end\b|```\s*stemlm/i;

function shownText(capsule: Capsule): string[] {
  return [
    capsule.meta.topic,
    capsule.solution,
    ...capsule.steps.flatMap((step) => [
      step.title, step.body, step.takeaway ?? '', step.followup ?? '',
      step.quickCheck?.question ?? '', step.quickCheck?.answer ?? '',
    ]),
  ];
}

/** Prose lines of the guide: long enough that an answer cannot contain one by chance. */
function guideSentences(guide: string): string[] {
  return [...new Set(guide.split('\n').map((line) => line.trim()))]
    .filter((line) => line.length >= 40 && line.split(/\s+/).length >= 7 && !line.startsWith('@'));
}

function outsideProse(raw: string): number {
  const open = /^```+\s*stemlm\b[^\n]*$/im.exec(raw);
  const start = open ? open.index : raw.indexOf('@meta');
  if (start < 0) return 0;
  const lines = raw.slice(start).split('\n');
  const end = lines.findIndex((line) => /^\s*@end\s*(?:```+)?\s*$/.test(line));
  const before = raw.slice(0, start);
  const after = end < 0 ? '' : lines.slice(end + 1).join('\n').replace(/^\s*```+\s*$/m, '');
  return (before + after).replace(/\s+/g, '').length;
}

async function scoreFigures(diagrams: Diagram[]): Promise<AnswerScore['figures']> {
  const figures: AnswerScore['figures'] = { asWritten: 0, afterRepair: 0, failed: [] };
  for (const diagram of diagrams) {
    if ((await compileDiagramStrict(diagram)).ok) {
      figures.asWritten += 1;
      continue;
    }
    const drawn = await compileDiagram(diagram);
    if (drawn.ok) figures.afterRepair += 1;
    else figures.failed.push({ type: diagram.type, reason: drawn.diagnostic.reason });
  }
  return figures;
}

function fit(wants: string, diagrams: Diagram[]): AnswerScore['figureFit'] {
  if (wants === 'none') return diagrams.length ? 'unwanted' : 'none needed';
  if (!diagrams.length) return 'missing';
  return diagrams.some((diagram) => canonicalizeDiagramType(diagram.type) === wants) ? 'expected' : 'other family';
}

async function scoreAnswer(id: string, raw: string, wants: string, sentences: string[]): Promise<AnswerScore> {
  const result = parse(raw);
  const captured = Boolean(result.status !== 'empty' && result.capsule?.steps.length && !result.warningCodes.includes('missing_end'));
  const plain = captured ? null : structureAnswer(raw);
  const capsule = captured ? result.capsule! : plain?.capsule;
  const diagrams = capsule
    ? [...capsule.steps.flatMap((step) => (step.diagram ? [step.diagram] : [])), ...capsule.solutionDiagrams]
    : [];
  const leaked = sentences.filter((line) => raw.includes(line));
  if (/--- stemLM|stemLM (?:study )?guide/i.test(capsule?.meta.question ?? '')) leaked.push('stemLM message text in question:');
  return {
    id,
    read: captured ? 'capsule' : plain ? 'plain' : 'none',
    ...(captured ? {} : { code: result.errorCode ?? (result.warningCodes.includes('missing_end') ? 'missing_end' : 'no_steps') }),
    steps: capsule?.steps.length ?? 0,
    stepsWithBody: capsule?.steps.filter((step) => step.body.trim() && !stepBodyWasSalvaged(step)).length ?? 0,
    figures: await scoreFigures(diagrams),
    figureFit: fit(wants, diagrams),
    solution: Boolean(capsule?.solution.trim()),
    verify: capsule?.verification?.status ?? 'none',
    quickChecks: capsule?.steps.filter((step) => step.quickCheck).length ?? 0,
    takeaways: capsule?.steps.filter((step) => step.takeaway).length ?? 0,
    leaked,
    markers: capsule ? shownText(capsule).filter((text) => MARKER.test(text)).map((text) => text.slice(0, 80)) : [],
    outside: captured ? outsideProse(raw) : 0,
  };
}

/**
 * What a chat model is handed for each question, built by the shipped code: `attachment.txt` (the
 * guide, or for a long-chat case the conversation so far) and `message.txt` (the student's message).
 */
function writeTrials(outDir: string, questions: Question[]): void {
  for (const question of questions) {
    const dir = resolve(outDir, question.id);
    mkdirSync(dir, { recursive: true });
    if (question.history) {
      // A long chat: the message carries only the reminder. The guide is out of reach, or with
      // `guideAbove` it is the file the first message attached, eleven turns back.
      const first = question.history.find(([role]) => role === 'student')?.[1].split('\n')[0] ?? '';
      const guide = question.guideAbove ? `\n--- contents of stemLM Guide.txt ---\n${buildInjectionPayload(first).fileContent}\n--- end of stemLM Guide.txt ---` : '';
      const turns = question.history.map(([role, text]) => (role === 'note'
        ? `[${text}]`
        : `${role === 'student' ? 'Student' : 'Assistant'}:\n${text.replace('{{FIRST_STUB}}', buildComposerAppendix({ hasQuestion: true }))}${text.includes('{{FIRST_STUB}}') ? guide : ''}`));
      writeFileSync(resolve(dir, 'attachment.txt'), turns.join('\n\n'));
      writeFileSync(resolve(dir, 'message.txt'), `${question.question}\n\n${buildComposerPointer({ hasQuestion: true })}`);
    } else {
      const payload = buildInjectionPayload(question.question);
      writeFileSync(resolve(dir, 'attachment.txt'), payload.fileContent);
      writeFileSync(resolve(dir, 'message.txt'), payload.composerText);
      writeFileSync(resolve(dir, 'inline.txt'), buildInjectionPrompt(question.question).prompt);
    }
  }
}

it('scores the answers, or writes the trial inputs', async () => {
  const questions = JSON.parse(readFileSync(resolve(__dirname, 'questions.json'), 'utf8')) as Question[];
  if (process.env.GUIDE_EVAL_TRIALS) return writeTrials(process.env.GUIDE_EVAL_TRIALS, questions);
  const answersDir = process.env.GUIDE_EVAL_ANSWERS;
  const reportPath = process.env.GUIDE_EVAL_REPORT;
  if (!answersDir || !reportPath) throw new Error('GUIDE_EVAL_ANSWERS and GUIDE_EVAL_REPORT are required');
  const sentences = process.env.GUIDE_EVAL_GUIDE ? guideSentences(readFileSync(process.env.GUIDE_EVAL_GUIDE, 'utf8')) : [];
  const scores: AnswerScore[] = [];
  for (const file of readdirSync(answersDir).filter((name) => name.endsWith('.md')).sort()) {
    const id = basename(file, '.md');
    // A trial may carry a suffix after the question id (`q01-chart.inline.md`).
    const wants = questions.find((question) => id.startsWith(question.id))?.wants ?? 'none';
    scores.push(await scoreAnswer(id, readFileSync(resolve(answersDir, file), 'utf8'), wants, sentences));
  }
  writeFileSync(reportPath, JSON.stringify(scores, null, 2));
});
