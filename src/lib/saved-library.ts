/**
 * Pure helpers over saved-question snapshots: search, subject filter, and
 * question-first list labels. No browser APIs — the popup list and tests
 * share this module.
 */
import { SUBJECTS, type Subject } from '@/src/protocol/types';
import { formatQuestionHeading, resolveQuestionText } from './session-question';

/** Minimal snapshot shape needed to label and filter the toolbar library. */
export interface SavedFilterable {
  id: string;
  question: string;
  meta: {
    subject: string;
    topic: string;
    question?: string;
  };
}

export const ALL_SAVED_SUBJECTS = 'all';

/** Compact popup strip — latest N only. Search lives in the full overlay. */
export const COMPACT_SAVED_LIMIT = 3;
export const OPEN_ALL_SAVED_LABEL = 'Open all saved questions';

/** Most recently saved first, capped. Callers pass snapshots that include `savedAt`. */
export function latestSavedSessions<T extends { savedAt: number }>(
  items: readonly T[],
  limit = COMPACT_SAVED_LIMIT,
): T[] {
  const cap = Math.max(0, limit);
  return [...items].sort((a, b) => b.savedAt - a.savedAt).slice(0, cap);
}

export interface SavedSessionQuery {
  /** Case-insensitive match against question and topic. Empty = no text filter. */
  query?: string;
  /** Subject name, or empty / `all` for every subject. */
  subject?: string;
}

function isAllSubjects(subject: string | undefined): boolean {
  const value = (subject ?? '').trim();
  return value.length === 0 || value.toLowerCase() === ALL_SAVED_SUBJECTS;
}

/** Compact question heading already used in the panel — never topic-only when a question exists. */
export function savedSessionHeading(item: SavedFilterable): string {
  return formatQuestionHeading(resolveQuestionText(item.question, item.meta));
}

export function savedSessionSubject(item: SavedFilterable): string {
  return (item.meta.subject || '').trim() || 'General';
}

/** Subjects present in the library, known-subject order first. */
export function savedSessionSubjects(items: readonly SavedFilterable[]): string[] {
  const present = new Set(
    items.map((item) => savedSessionSubject(item)).filter((subject) => subject.length > 0),
  );
  const known = SUBJECTS.filter((subject) => present.has(subject));
  const extra = [...present]
    .filter((subject) => !SUBJECTS.includes(subject as Subject))
    .sort((a, b) => a.localeCompare(b));
  return [...known, ...extra];
}

/**
 * Text search over question + topic, plus an optional subject filter.
 * Unmatched items are omitted (not ranked).
 */
export function filterSavedSessions<T extends SavedFilterable>(
  items: readonly T[],
  opts: SavedSessionQuery = {},
): T[] {
  const query = (opts.query ?? '').trim().toLowerCase();
  const allSubjects = isAllSubjects(opts.subject);
  const subject = (opts.subject ?? '').trim();

  return items.filter((item) => {
    if (!allSubjects && savedSessionSubject(item) !== subject) return false;
    if (!query) return true;
    const question = `${item.question} ${item.meta.question ?? ''}`.toLowerCase();
    const topic = item.meta.topic.toLowerCase();
    const heading = savedSessionHeading(item).toLowerCase();
    return question.includes(query) || topic.includes(query) || heading.includes(query);
  });
}
