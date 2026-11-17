import { isPlatformId } from '@/src/platforms/types';
import { ARCHETYPES, SUBJECTS, type Session } from '@/src/protocol/types';

type RecordValue = Record<string, unknown>;
type Validator = (value: unknown) => boolean;

const record = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const string: Validator = (value) => typeof value === 'string';
const finite: Validator = (value) => typeof value === 'number' && Number.isFinite(value);
const oneOf = (values: readonly string[]): Validator =>
  (value) => typeof value === 'string' && values.includes(value);
const optional = (value: unknown, validate: Validator): boolean =>
  value === undefined || validate(value);

function array(value: unknown, validate: Validator): boolean {
  if (!Array.isArray(value)) return false;
  for (const item of value) if (!validate(item)) return false;
  return true;
}

function strings(value: RecordValue, keys: string[]): boolean {
  return keys.every((key) => string(value[key]));
}

function optionalStrings(value: RecordValue, keys: string[]): boolean {
  return keys.every((key) => optional(value[key], string));
}

function diagram(value: unknown): boolean {
  return record(value) && strings(value, ['type', 'content']) &&
    optionalStrings(value, ['caption', 'id']);
}

function step(value: unknown): boolean {
  return record(value) && strings(value, ['id', 'title', 'body']) && finite(value.index) &&
    optionalStrings(value, ['formula', 'formulaId', 'takeaway', 'followup']) &&
    optional(value.diagram, diagram) && optional(value.quickCheck, (check) =>
      record(check) && strings(check, ['question', 'answer']));
}

function meta(value: unknown): boolean {
  return record(value) && finite(value.version) && oneOf(SUBJECTS)(value.subject) &&
    string(value.topic) && optionalStrings(value, ['question', 'qid', 'locale']) &&
    optional(value.archetype, oneOf(ARCHETYPES)) &&
    optional(value.level, oneOf(['intro', 'undergrad', 'advanced', 'research'])) &&
    optional(value.mode, oneOf(['full', 'patch', 'resolve', 'new']));
}

function capsule(value: unknown): boolean {
  return record(value) && meta(value.meta) && array(value.steps, step) &&
    string(value.solution) && array(value.solutionDiagrams, diagram) &&
    optional(value.uncertainty, (uncertainty) => record(uncertainty) &&
      array(uncertainty.assumptions, string) && array(uncertainty.lowConfidenceSteps, string) &&
      array(uncertainty.studentChecks, string)) &&
    optional(value.verification, (verification) => record(verification) &&
      array(verification.methods, oneOf(['dimensional', 'units', 'limit', 'oom', 'backsub', 'conservation', 'alt'])) &&
      oneOf(['pass', 'fail'])(verification.status) && string(verification.notes) &&
      optional(verification.correction, string));
}

/**
 * `raw` is only checked to be text and is never parsed here: stored copies usually carry it
 * empty, and for an ingest session it is Markdown, not a capsule. `origin` says which.
 */
function session(value: unknown): boolean {
  return record(value) && strings(value, ['id', 'question', 'raw']) &&
    optional(value.origin, oneOf(['capsule', 'ingest'])) && optional(value.chat, string) &&
    finite(value.createdAt) && finite(value.updatedAt) && isPlatformId(value.platform) &&
    capsule(value.capsule) && optional(value.followups, (followups) => array(followups, (followup) =>
      record(followup) && strings(followup, ['id', 'anchorStepId']) &&
      optional(followup.question, string) && finite(followup.createdAt) && capsule(followup.capsule)));
}

/** Validate without rewriting source data or silently dropping damaged records. */
export function assertRestorableSessions(value: unknown): asserts value is Session[] {
  if (!array(value, session)) throw new Error('Cannot restore malformed sessions.');
}

/** Admit records independently, preserving source objects for recovery. */
export function restorableSessions(value: unknown): { sessions: Session[]; rejected: number } {
  if (!Array.isArray(value)) return { sessions: [], rejected: 1 };
  const sessions: Session[] = [];
  let rejected = 0;
  for (const item of value) {
    if (session(item)) sessions.push(item as Session);
    else rejected++;
  }
  return { sessions, rejected };
}
