/**
 * Persistence for explicitly-saved study sessions. Each save stores a compact
 * snapshot (question, steps, solution) for PDF export. Library rows download a
 * PDF file or open a viewer window — they do not jump to Gemini.
 */
import { browser } from 'wxt/browser';
import type { CapsuleMeta, Diagram, Session, SessionOrigin, Step } from '@/src/protocol/types';
import { isPlatformId, type PlatformId } from '@/src/platforms/types';
import { resolveSessionQuestion } from './session-question';
import { StorageQuotaError, isStorageQuotaError } from './storage-errors';

export const SAVED_SESSIONS_KEY = 'stemlm_saved_sessions';
/** Legacy per-id keys are migrated into the background-owned aggregate. */
export const SAVED_SESSION_RECORD_PREFIX = 'stemlm_saved_session_record_';
const SAVED_SESSIONS_VERSION_KEY = 'stemlm_saved_sessions_version';
/**
 * Library limits. The extension holds `unlimitedStorage`, so these bound the
 * cost of rewriting the library on each save rather than a browser quota. A
 * save past either limit is refused ("Library full"); nothing is evicted.
 */
export const MAX_SAVED = 2000;
const MAX_LIBRARY_BYTES = 64 * 1024 * 1024;
/** Largest single saved answer. */
export const MAX_SAVED_BYTES = 4 * 1024 * 1024;
const LIBRARY_FULL_MESSAGE =
  'Library full. Delete saved questions you no longer need to make room for new ones.';

type DurableSavedEntry =
  | { kind: 'snapshot'; snapshot: SavedSessionSnapshot }
  | { kind: 'tombstone'; id: string; savedAt: number };

/** Compact record kept in browser storage — question, steps, and solution for PDF export. */
export interface SavedSessionSnapshot {
  id: string;
  question: string;
  savedAt: number;
  platform: PlatformId;
  meta: CapsuleMeta;
  steps: Step[];
  solution: string;
  solutionDiagrams: Diagram[];
  /**
   * Set only for an answer structured from a plain chat reply, so the library and its PDFs keep
   * saying it was not checked. Absent on stemLM answers and on everything saved before ingest.
   */
  origin?: SessionOrigin;
}

function sortByRecent(sessions: SavedSessionSnapshot[]): SavedSessionSnapshot[] {
  return [...sessions].sort((a, b) => b.savedAt - a.savedAt);
}

export function estimateSnapshotBytes(snapshots: SavedSessionSnapshot[]): number {
  return new TextEncoder().encode(JSON.stringify(snapshots)).length;
}

async function writeSavedSessions(sessions: SavedSessionSnapshot[], legacyKeys: string[]): Promise<void> {
  try {
    await browser.storage.local.set({
      [SAVED_SESSIONS_KEY]: sortByRecent(sessions),
      [SAVED_SESSIONS_VERSION_KEY]: 2,
    });
  } catch (err) {
    // Never recover space by deleting older saves: report it and keep them all.
    if (isStorageQuotaError(err)) throw new StorageQuotaError();
    throw err;
  }
  // The aggregate and its version marker are committed together. Once that
  // succeeds, old records cannot resurrect even if cleanup is interrupted.
  const committedKeys = new Set(sessions.map((snapshot) => `${SAVED_SESSION_RECORD_PREFIX}${encodeURIComponent(snapshot.id)}`));
  const migratedKeys = legacyKeys.filter((key) => committedKeys.has(key));
  if (migratedKeys.length > 0) {
    try { await browser.storage.local.remove(migratedKeys); } catch { /* Retry cleanup on the next mutation. */ }
  }
}

export function sessionToSnapshot(session: Session): SavedSessionSnapshot {
  return {
    id: session.id,
    question: resolveSessionQuestion(session),
    savedAt: Date.now(),
    platform: session.platform,
    meta: session.capsule.meta,
    steps: session.capsule.steps,
    solution: session.capsule.solution,
    solutionDiagrams: session.capsule.solutionDiagrams,
    ...(session.origin === 'ingest' ? { origin: 'ingest' as const } : {}),
  };
}

/**
 * Rebuild a minimal Session for PDF rendering. Every field is coerced: a
 * snapshot written by an older build, or truncated by a storage prune, must
 * still export rather than crash the renderer.
 */
export function snapshotToSession(snapshot: SavedSessionSnapshot): Session {
  return {
    id: snapshot.id,
    createdAt: snapshot.savedAt,
    updatedAt: snapshot.savedAt,
    platform: snapshot.platform,
    question: typeof snapshot.question === 'string' ? snapshot.question : '',
    raw: '',
    capsule: {
      meta: snapshot.meta,
      steps: Array.isArray(snapshot.steps) ? snapshot.steps : [],
      solution: typeof snapshot.solution === 'string' ? snapshot.solution : '',
      solutionDiagrams: Array.isArray(snapshot.solutionDiagrams) ? snapshot.solutionDiagrams : [],
    },
    ...(snapshot.origin === 'ingest' ? { origin: 'ingest' as const } : {}),
  };
}

function isCapsuleMeta(value: unknown): value is CapsuleMeta {
  if (!value || typeof value !== 'object') return false;
  const m = value as CapsuleMeta;
  return typeof m.version === 'number' && typeof m.subject === 'string' && typeof m.topic === 'string';
}

function isDiagram(value: unknown): value is Diagram {
  if (!value || typeof value !== 'object') return false;
  const d = value as Diagram;
  return typeof d.type === 'string' && d.type.length > 0 && typeof d.content === 'string';
}

function isStep(value: unknown): value is Step {
  if (!value || typeof value !== 'object') return false;
  const s = value as Step;
  return (
    typeof s.id === 'string' &&
    typeof s.index === 'number' &&
    typeof s.title === 'string' &&
    typeof s.body === 'string'
  );
}

/** A stored time is one only if a date can hold it: NaN or 1e300 in a damaged record would break sorting and every date drawn from it. */
function isTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(new Date(value).getTime());
}

/** Accept new snapshots and legacy full Session objects from older builds. */
export function normalizeStoredSession(raw: unknown): SavedSessionSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  if (
    typeof o.id === 'string' &&
    typeof o.question === 'string' &&
    isCapsuleMeta(o.meta) &&
    typeof o.solution === 'string'
  ) {
    return {
      id: o.id,
      question: o.question,
      savedAt: isTime(o.savedAt) ? o.savedAt : isTime(o.updatedAt) ? o.updatedAt : Date.now(),
      platform: isPlatformId(o.platform) ? o.platform : 'gemini',
      meta: o.meta,
      steps: Array.isArray(o.steps) ? o.steps.filter(isStep) : [],
      solution: o.solution,
      solutionDiagrams: Array.isArray(o.solutionDiagrams)
        ? o.solutionDiagrams.filter(isDiagram)
        : [],
      ...(o.origin === 'ingest' ? { origin: 'ingest' as const } : {}),
    };
  }

  if (typeof o.id === 'string' && o.capsule && typeof o.capsule === 'object') {
    const legacy = raw as Session;
    if (!legacy.capsule?.meta || typeof legacy.capsule.solution !== 'string') return null;
    return sessionToSnapshot(legacy);
  }

  return null;
}

async function readSavedState(): Promise<{ sessions: SavedSessionSnapshot[]; legacyKeys: string[] }> {
  const all = (await browser.storage.local.get(null)) as Record<string, unknown>;
  const legacyKeys = Object.keys(all).filter((key) => key.startsWith(SAVED_SESSION_RECORD_PREFIX));
  const byId = new Map<string, SavedSessionSnapshot>();
  const deletedAt = new Map<string, number>();
  const consider = (snapshot: SavedSessionSnapshot): void => {
    const previous = byId.get(snapshot.id);
    if (!previous || snapshot.savedAt >= previous.savedAt) byId.set(snapshot.id, snapshot);
  };

  const aggregate = all[SAVED_SESSIONS_KEY];
  if (Array.isArray(aggregate)) {
    for (const raw of aggregate) {
      const snapshot = normalizeStoredSession(raw);
      if (snapshot) consider(snapshot);
    }
  }

  for (const [key, raw] of Object.entries(all[SAVED_SESSIONS_VERSION_KEY] === 2 ? {} : all)) {
    if (!key.startsWith(SAVED_SESSION_RECORD_PREFIX) || !raw || typeof raw !== 'object') continue;
    const entry = raw as Partial<DurableSavedEntry>;
    if (entry.kind === 'snapshot') {
      const snapshot = normalizeStoredSession(entry.snapshot);
      if (snapshot) consider(snapshot);
    } else if (
      entry.kind === 'tombstone' &&
      typeof entry.id === 'string' &&
      typeof entry.savedAt === 'number' &&
      Number.isFinite(entry.savedAt)
    ) {
      const previous = deletedAt.get(entry.id) ?? -Infinity;
      if (entry.savedAt > previous) deletedAt.set(entry.id, entry.savedAt);
    }
  }

  const merged = [...byId.values()].filter((snapshot) => {
    const deleted = deletedAt.get(snapshot.id);
    return deleted === undefined || snapshot.savedAt > deleted;
  });
  return { sessions: merged, legacyKeys };
}

/** The library, newest first. Throws when storage cannot be read, so the library page can say so instead of looking empty. */
export async function readSavedSessions(): Promise<SavedSessionSnapshot[]> {
  return sortByRecent((await readSavedState()).sessions);
}

export async function getSavedSessions(): Promise<SavedSessionSnapshot[]> {
  try {
    return await readSavedSessions();
  } catch {
    return [];
  }
}

export async function getSavedSession(id: string): Promise<SavedSessionSnapshot | undefined> {
  return (await getSavedSessions()).find((s) => s.id === id);
}

/**
 * Serialize save / refresh / delete so each read-modify-write finishes before
 * the next starts. A refresh that already read a list cannot interleave with
 * delete and resurrect a snapshot.
 */
let mutationQueue: Promise<void> = Promise.resolve();

function enqueueMutation<T>(op: () => Promise<T>): Promise<T> {
  const run = mutationQueue.then(op, op);
  mutationQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export type SavedSessionMutationMessage =
  | { type: 'stemlm:saved-session-mutation'; action: 'save' | 'refresh'; session: Session }
  | { type: 'stemlm:saved-session-mutation'; action: 'delete'; id: string }
  /** Undo of a delete: the snapshot goes back exactly as it was, saved date included. */
  | { type: 'stemlm:saved-session-mutation'; action: 'restore'; snapshot: SavedSessionSnapshot };

export type SavedSessionMutationResponse =
  | { ok: true; result: boolean | null }
  | { ok: false; quota: boolean; message: string };

export function isSavedSessionMutationMessage(value: unknown): value is SavedSessionMutationMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  if (message.type !== 'stemlm:saved-session-mutation') return false;
  if (message.action === 'delete') return typeof message.id === 'string' && message.id.length > 0;
  if (message.action === 'restore') return normalizeStoredSession(message.snapshot) !== null;
  if (message.action !== 'save' && message.action !== 'refresh') return false;
  if (!message.session || typeof message.session !== 'object') return false;
  const session = message.session as Session;
  return typeof session.id === 'string' && session.id.length > 0 &&
    typeof session.question === 'string' && isPlatformId(session.platform) &&
    !!session.capsule && isCapsuleMeta(session.capsule.meta) &&
    Array.isArray(session.capsule.steps) && session.capsule.steps.every(isStep) &&
    typeof session.capsule.solution === 'string' &&
    Array.isArray(session.capsule.solutionDiagrams) && session.capsule.solutionDiagrams.every(isDiagram);
}

/** Only the background calls this writer; every extension page shares its queue. */
export async function handleSavedSessionMutation(message: SavedSessionMutationMessage): Promise<SavedSessionMutationResponse> {
  if (!isSavedSessionMutationMessage(message)) {
    return { ok: false, quota: false, message: 'Invalid saved-session request.' };
  }
  try {
    const result = await enqueueMutation(async () => {
      const { sessions: list, legacyKeys } = await readSavedState();
      if (message.action === 'delete') {
        await writeSavedSessions(list.filter((snapshot) => snapshot.id !== message.id), legacyKeys);
        return null;
      }
      if (message.action === 'restore') {
        const restored = normalizeStoredSession(message.snapshot);
        // Saved again since it was deleted: that copy is the newer one and stays.
        if (!restored || list.some((snapshot) => snapshot.id === restored.id)) return null;
        const next = [...list, restored];
        if (next.length > MAX_SAVED || estimateSnapshotBytes(next) > MAX_LIBRARY_BYTES) {
          throw new StorageQuotaError(LIBRARY_FULL_MESSAGE);
        }
        await writeSavedSessions(next, legacyKeys);
        return null;
      }
      const session = message.session;
      const idx = list.findIndex((snapshot) => snapshot.id === session.id);
      if (message.action === 'refresh' && idx < 0) return false;
      const snapshot = sessionToSnapshot(session);
      if (estimateSnapshotBytes([snapshot]) > MAX_SAVED_BYTES) throw new StorageQuotaError();
      const next = list.filter((saved) => saved.id !== session.id);
      // Ensure this explicit write remains newest even after a system-clock rollback.
      snapshot.savedAt = Math.max(snapshot.savedAt, ...next.map((saved) => saved.savedAt + 1));
      next.unshift(snapshot);
      if (next.length > MAX_SAVED || estimateSnapshotBytes(next) > MAX_LIBRARY_BYTES) {
        throw new StorageQuotaError(LIBRARY_FULL_MESSAGE);
      }
      await writeSavedSessions(next, legacyKeys);
      return message.action === 'refresh' ? true : null;
    });
    return { ok: true, result };
  } catch (error) {
    return {
      ok: false,
      quota: error instanceof StorageQuotaError || isStorageQuotaError(error),
      message: error instanceof Error ? error.message : 'Could not update saved questions.',
    };
  }
}
