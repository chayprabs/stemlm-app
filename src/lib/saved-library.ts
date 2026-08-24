/**
 * Pure helpers over saved-question snapshots: ranked fuzzy search, subject
 * and time filters, and question-first list labels. The popup, overlay, and
 * tests share this module.
 */
import Fuse from 'fuse.js';
import { SUBJECTS, type Subject } from '@/src/protocol/types';
import { resolveQuestionText } from './session-question';

/** Minimal snapshot shape needed to label and filter the toolbar library. */
export interface SavedFilterable {
  id: string;
  question: string;
  savedAt?: number;
  meta: {
    subject: string;
    topic: string;
    question?: string;
  };
}

export const ALL_SAVED_SUBJECTS = 'all';
export const ALL_SAVED_TIME = 'all';
export const SAVED_SEARCH_PLACEHOLDER = 'Search a question to find it';
export const OPEN_STUDY_PANEL_LABEL = 'Open study panel';
export const SAVED_QUESTIONS_LABEL = 'Saved questions';
export const LOAD_FROM_CHAT_LABEL = 'Load conversation from this chat';

/** Library dialog is ≥ 40% larger than the previous 36rem × 40rem overlay. */
export const LIBRARY_DIALOG_WIDTH_REM = 52;
export const LIBRARY_DIALOG_HEIGHT_REM = 56;
/** Dedicated popup window so the library is not trapped in the action popup. */
export const LIBRARY_WINDOW_WIDTH_PX = 860;
export const LIBRARY_WINDOW_HEIGHT_PX = 940;
/** Compact toolbar action popup (well below the old 492px launch grid). */
export const POPUP_WIDTH_PX = 312;

export type SavedTimeFilter = 'all' | '24h' | '7d' | 'month' | '6m';

export const SAVED_TIME_FILTERS: readonly { id: Exclude<SavedTimeFilter, 'all'>; label: string }[] = [
  { id: '24h', label: 'Last 24 hours' },
  { id: '7d', label: 'Last 7 days' },
  { id: 'month', label: 'Last month' },
  { id: '6m', label: 'Last 6 months' },
];

export const SAVED_TIME_ANY_LABEL = 'Any time';

const TIME_WINDOW_MS: Record<Exclude<SavedTimeFilter, 'all'>, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  '6m': 182 * 24 * 60 * 60 * 1000,
};

export function savedTimeFilterLabel(filter: SavedTimeFilter): string {
  if (filter === 'all') return SAVED_TIME_ANY_LABEL;
  return SAVED_TIME_FILTERS.find((item) => item.id === filter)?.label ?? SAVED_TIME_ANY_LABEL;
}

export function savedTimeCutoff(filter: SavedTimeFilter, now: number): number | null {
  if (filter === 'all') return null;
  return now - TIME_WINDOW_MS[filter];
}

export interface SavedSessionQuery {
  /** Fuzzy match against question, topic, and subject. Empty = no text filter. */
  query?: string;
  /** Subject name, or empty / `all` for every subject. */
  subject?: string;
  /** Relative savedAt window. Empty / `all` = any time. */
  time?: SavedTimeFilter;
  /** Injectable clock for tests. */
  now?: number;
}

function isAllSubjects(subject: string | undefined): boolean {
  const value = (subject ?? '').trim();
  return value.length === 0 || value.toLowerCase() === ALL_SAVED_SUBJECTS;
}

function isAllTime(time: SavedTimeFilter | undefined): boolean {
  return !time || time === ALL_SAVED_TIME;
}

/** Question as written (for 2-line rows). Not the compact panel heading. */
export function savedSessionQuestion(item: SavedFilterable): string {
  return resolveQuestionText(item.question, item.meta);
}

/** Compact question heading already used in the panel — never topic-only when a question exists. */
export function savedSessionHeading(item: SavedFilterable): string {
  return savedSessionQuestion(item);
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

function matchesTime<T extends SavedFilterable>(item: T, cutoff: number | null): boolean {
  if (cutoff == null) return true;
  const savedAt = item.savedAt;
  if (typeof savedAt !== 'number') return true;
  return savedAt >= cutoff;
}

function fuseIndex<T extends SavedFilterable>(items: T[]): Fuse<T> {
  return new Fuse(items, {
    keys: [
      { name: 'question', weight: 0.5 },
      { name: 'meta.question', weight: 0.25 },
      { name: 'meta.topic', weight: 0.18 },
      { name: 'meta.subject', weight: 0.07 },
    ],
    threshold: 0.48,
    distance: 1000,
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength: 2,
    shouldSort: true,
    findAllMatches: true,
    ignoreFieldNorm: true,
  });
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length >= 2);
}

/** Damerau–Levenshtein, capped. Enough for short STEM tokens and typos. */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const n = a.length;
  const m = b.length;
  if (n === 0) return m;
  if (m === 0) return n;
  const dp: number[][] = Array.from({ length: n + 1 }, (_, i) => {
    const row = new Array<number>(m + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= m; j += 1) dp[0]![j] = j;
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i]![j] = Math.min(dp[i]![j]!, dp[i - 2]![j - 2]! + 1);
      }
    }
  }
  return dp[n]![m]!;
}

function tokenSimilarity(queryToken: string, hayToken: string): number {
  if (queryToken === hayToken) return 1;
  if (hayToken.includes(queryToken) || (queryToken.includes(hayToken) && hayToken.length >= 3)) {
    return 0.92;
  }
  const dist = editDistance(queryToken, hayToken);
  const maxLen = Math.max(queryToken.length, hayToken.length);
  if (dist === 1 && maxLen >= 4) return 0.84;
  if (dist === 2 && maxLen >= 6) return 0.7;
  return 0;
}

function searchableText(item: SavedFilterable): string {
  return `${item.question} ${item.meta.question ?? ''} ${item.meta.topic} ${item.meta.subject}`;
}

function tokenScore(item: SavedFilterable, query: string): number {
  const qTokens = tokenize(query).filter((token) => token.length >= 3);
  if (qTokens.length === 0) return 0;
  const hay = tokenize(searchableText(item));
  let hits = 0;
  let weight = 0;
  for (const token of qTokens) {
    let best = 0;
    for (const h of hay) best = Math.max(best, tokenSimilarity(token, h));
    if (best > 0) {
      hits += 1;
      weight += best;
    }
  }
  if (hits === 0) return 0;
  return weight / qTokens.length;
}

function rankedSearch<T extends SavedFilterable>(items: T[], query: string): T[] {
  const fuseHits = fuseIndex(items).search(query);
  const fuseScore = new Map<string, number>();
  for (const hit of fuseHits) {
    fuseScore.set(hit.item.id, 1 - (hit.score ?? 1));
  }

  const scored = items
    .map((item) => {
      const tokens = tokenScore(item, query);
      const fuse = fuseScore.get(item.id) ?? 0;
      return { item, score: Math.max(tokens, fuse) + 0.15 * Math.min(tokens, fuse) };
    })
    .filter((row) => row.score > 0.35)
    .sort((a, b) => b.score - a.score);

  return scored.map((row) => row.item);
}

function sortByRecent<T extends SavedFilterable>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
}

/**
 * Subject + time filters, then ranked fuzzy search over question / topic /
 * subject. Empty query keeps recency order.
 */
export function filterSavedSessions<T extends SavedFilterable>(
  items: readonly T[],
  opts: SavedSessionQuery = {},
): T[] {
  const query = (opts.query ?? '').trim();
  const allSubjects = isAllSubjects(opts.subject);
  const subject = (opts.subject ?? '').trim();
  const cutoff = savedTimeCutoff(opts.time ?? ALL_SAVED_TIME, opts.now ?? Date.now());

  const narrowed = items.filter((item) => {
    if (!allSubjects && savedSessionSubject(item) !== subject) return false;
    return matchesTime(item, cutoff);
  });

  if (!query) return sortByRecent(narrowed);

  return rankedSearch(narrowed, query);
}
