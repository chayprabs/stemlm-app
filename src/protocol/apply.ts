/**
 * Resume stitch, ID-patch apply, and multi-question helpers.
 * Pure functions — the controller calls these; they do not touch the DOM.
 */
import type { Capsule, ParseWarningCode, PatchOp, Step } from './types';
import { CAPSULE_END_TOKEN, CAPSULE_FENCE_TAG } from './protocol';

const RESUME_RE = /@resume\b[^\n]*/i;
const TOKEN_RE = /token\s*=\s*([A-Za-z0-9_-]+)/i;

export function findResumeToken(text: string): string | null {
  if (!text) return null;
  const line = text.split('\n').find((l) => /^\s*@resume\b/i.test(l));
  if (!line) return null;
  const m = TOKEN_RE.exec(line);
  return m?.[1] ?? 'resume';
}

function stripFence(text: string): string {
  let s = text.replace(/\r\n/g, '\n').trim();
  const open = new RegExp('^```+\\s*' + CAPSULE_FENCE_TAG + '\\b[^\\n]*\\n?', 'i');
  s = s.replace(open, '');
  if (s.trimEnd().endsWith('```')) {
    const cut = s.lastIndexOf('```');
    if (cut !== -1) s = s.slice(0, cut);
  }
  return s.trim();
}

function dropResumeLines(text: string): string {
  return text
    .split('\n')
    .filter((l) => !RESUME_RE.test(l.trim()) || !/^\s*@resume\b/i.test(l))
    .join('\n');
}

function dropMeta(text: string): string {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.trim() === '@meta');
  if (start === -1) return text;
  let end = lines.findIndex((l, i) => i > start && (l.trim() === '@endmeta' || l.trim() === '@metaend'));
  if (end === -1) return text;
  return [...lines.slice(0, start), ...lines.slice(end + 1)].join('\n');
}

function dropTrailingEnd(text: string): string {
  const lines = text.split('\n');
  while (lines.length && lines[lines.length - 1]!.trim() === '') lines.pop();
  if (lines.length && lines[lines.length - 1]!.trim() === CAPSULE_END_TOKEN) {
    lines.pop();
  }
  return lines.join('\n');
}

/**
 * Concatenate a truncated capsule and its continuation into one body the
 * parser can read. Drops @resume lines, extra fences, a repeated @meta on
 * the continuation, and extra @end on the first part.
 */
export function stitchResume(parts: string[]): string {
  const cleaned = parts.map((p) => dropResumeLines(stripFence(p))).filter((p) => p.trim());
  if (cleaned.length === 0) return '';
  if (cleaned.length === 1) return cleaned[0]!;

  const head = dropTrailingEnd(cleaned[0]!);
  const rest = cleaned.slice(1).map((p, i) => {
    const noMeta = dropMeta(p);
    return i === cleaned.length - 2 ? noMeta : dropTrailingEnd(noMeta);
  });
  const joined = [head, ...rest].join('\n').trim();
  const hasEnd = joined.split('\n').some((l) => l.trim() === CAPSULE_END_TOKEN);
  return hasEnd ? joined : `${joined}\n${CAPSULE_END_TOKEN}`;
}

function reindex(steps: Step[]): Step[] {
  return steps.map((s, i) => ({ ...s, index: i + 1 }));
}

export interface ApplyPatchResult {
  capsule: Capsule;
  warnings: string[];
  warningCodes: ParseWarningCode[];
}

/** Apply ID-targeted patch ops onto an existing capsule. Unknown ids warn `patch_unknown_id`. */
export function applyStepPatch(capsule: Capsule, ops: PatchOp[]): ApplyPatchResult {
  let steps = [...capsule.steps];
  let solution = capsule.solution;
  let verification = capsule.verification;
  let uncertainty = capsule.uncertainty;
  const warnings: string[] = [];
  const warningCodes: ParseWarningCode[] = [];

  const unknown = (id: string, kind: string) => {
    warnings.push(`Patch ${kind} referenced unknown id "${id}".`);
    warningCodes.push('patch_unknown_id');
  };

  for (const op of ops) {
    if (op.solution != null) solution = op.solution;
    if (op.verification) verification = op.verification;
    if (op.uncertainty) uncertainty = op.uncertainty;

    if (op.op === 'replace' && op.id && op.step) {
      const i = steps.findIndex((s) => s.id === op.id);
      if (i === -1) {
        unknown(op.id, 'replace');
        continue;
      }
      steps[i] = { ...op.step, id: op.id, index: steps[i]!.index };
    } else if (op.op === 'insert' && op.step) {
      if (op.after) {
        const after = steps.findIndex((s) => s.id === op.after);
        if (after === -1) unknown(op.after, 'insert');
        const idx = after === -1 ? steps.length : after + 1;
        const id = op.step.id || `step-${idx + 1}`;
        steps.splice(idx, 0, { ...op.step, id });
      } else {
        const idx = steps.length;
        const id = op.step.id || `step-${idx + 1}`;
        steps.splice(idx, 0, { ...op.step, id });
      }
    } else if (op.op === 'delete' && op.id) {
      const before = steps.length;
      steps = steps.filter((s) => s.id !== op.id);
      if (steps.length === before) unknown(op.id, 'delete');
    }
  }
  return {
    capsule: {
      ...capsule,
      steps: reindex(steps),
      solution,
      ...(verification ? { verification } : {}),
      ...(uncertainty ? { uncertainty } : {}),
    },
    warnings,
    warningCodes,
  };
}

/** Pair truncated + continuation capsules that share an @resume token. */
export function groupResumeParts(parts: string[]): string[] {
  const out: string[] = [];
  let pending: { token: string; raw: string } | null = null;
  const complete = (text: string) =>
    text.split('\n').some((l) => l.trim() === CAPSULE_END_TOKEN);

  for (const candidate of parts) {
    const token = findResumeToken(candidate);
    if (pending && token && token === pending.token) {
      out.push(stitchResume([pending.raw, candidate]));
      pending = null;
      continue;
    }
    if (token && !complete(candidate)) {
      if (pending) out.push(pending.raw);
      pending = { token, raw: candidate };
      continue;
    }
    if (pending) {
      out.push(pending.raw);
      pending = null;
    }
    out.push(candidate);
  }
  if (pending) out.push(pending.raw);
  return out;
}

export function questionsOf(capsule: Capsule | undefined, extras?: Capsule[]): Capsule[] {
  if (extras && extras.length > 0) return extras;
  return capsule ? [capsule] : [];
}
