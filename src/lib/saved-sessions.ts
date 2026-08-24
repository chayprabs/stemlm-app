/**
 * Persistence for explicitly-saved study sessions. Each save stores a compact
 * snapshot (question, steps, solution) for PDF export. Library rows download
 * a file or open a viewer tab — they do not print or jump to Gemini.
 */
import { browser } from 'wxt/browser';
import type { CapsuleMeta, Diagram, Session, Step } from '@/src/protocol/types';
import { isPlatformId, type PlatformId } from '@/src/platforms/types';
import {
  exportSessionPdf,
  renderSessionReportHtml,
  reportFilename,
  type PdfExportResult,
} from './pdf';
import { downloadTextFile } from './file-download';
import { resolveSessionQuestion } from './session-question';
import { StorageQuotaError, isStorageQuotaError } from './storage-errors';

export const SAVED_SESSIONS_KEY = 'stemlm_saved_sessions';
const MAX_SAVED = 100;
/** Conservative cap — chrome.storage.local is typically 5–10 MB total. */
export const MAX_SAVED_BYTES = 4 * 1024 * 1024;

export interface SaveSessionResult {
  prunedCount: number;
}

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
}

function sortByRecent(sessions: SavedSessionSnapshot[]): SavedSessionSnapshot[] {
  return [...sessions].sort((a, b) => b.savedAt - a.savedAt);
}

export function estimateSnapshotBytes(snapshots: SavedSessionSnapshot[]): number {
  return new TextEncoder().encode(JSON.stringify(snapshots)).length;
}

/** Drop oldest entries until the serialized list fits the byte budget. */
export function trimSavedSessionsToBudget(
  sessions: SavedSessionSnapshot[],
  maxBytes = MAX_SAVED_BYTES,
): { sessions: SavedSessionSnapshot[]; prunedCount: number } {
  let next = sortByRecent(sessions).slice(0, MAX_SAVED);
  let prunedCount = Math.max(0, sessions.length - next.length);
  while (next.length > 1 && estimateSnapshotBytes(next) > maxBytes) {
    next = next.slice(0, -1);
    prunedCount += 1;
  }
  return { sessions: next, prunedCount };
}

async function writeSavedSessions(sessions: SavedSessionSnapshot[]): Promise<SaveSessionResult> {
  let { sessions: next, prunedCount } = trimSavedSessionsToBudget(sessions);
  try {
    await browser.storage.local.set({ [SAVED_SESSIONS_KEY]: next });
    return { prunedCount };
  } catch (err) {
    if (!isStorageQuotaError(err)) throw err;
    const drop = Math.max(1, Math.floor(next.length * 0.25));
    next = next.slice(0, Math.max(0, next.length - drop));
    prunedCount += drop;
    try {
      await browser.storage.local.set({ [SAVED_SESSIONS_KEY]: next });
      return { prunedCount };
    } catch (retryErr) {
      if (isStorageQuotaError(retryErr)) throw new StorageQuotaError();
      throw retryErr;
    }
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
  };
}

/** Rebuild a minimal Session for PDF rendering. */
export function snapshotToSession(snapshot: SavedSessionSnapshot): Session {
  return {
    id: snapshot.id,
    createdAt: snapshot.savedAt,
    updatedAt: snapshot.savedAt,
    platform: snapshot.platform,
    question: snapshot.question,
    raw: '',
    capsule: {
      meta: snapshot.meta,
      steps: snapshot.steps ?? [],
      solution: snapshot.solution,
      solutionDiagrams: snapshot.solutionDiagrams,
    },
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
      savedAt: typeof o.savedAt === 'number' ? o.savedAt : typeof o.updatedAt === 'number' ? o.updatedAt : Date.now(),
      platform: isPlatformId(o.platform) ? o.platform : 'gemini',
      meta: o.meta,
      steps: Array.isArray(o.steps) ? o.steps.filter(isStep) : [],
      solution: o.solution,
      solutionDiagrams: Array.isArray(o.solutionDiagrams)
        ? o.solutionDiagrams.filter(isDiagram)
        : [],
    };
  }

  if (typeof o.id === 'string' && o.capsule && typeof o.capsule === 'object') {
    const legacy = raw as Session;
    if (!legacy.capsule?.meta || typeof legacy.capsule.solution !== 'string') return null;
    return sessionToSnapshot(legacy);
  }

  return null;
}

async function readSavedSessions(): Promise<SavedSessionSnapshot[]> {
  const list = (await browser.storage.local.get(SAVED_SESSIONS_KEY))[SAVED_SESSIONS_KEY] as
    | unknown[]
    | undefined;
  if (!Array.isArray(list)) return [];
  return sortByRecent(
    list.map(normalizeStoredSession).filter((s): s is SavedSessionSnapshot => s !== null),
  );
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

export async function saveSession(session: Session): Promise<SaveSessionResult> {
  return enqueueMutation(async () => {
    const list = await readSavedSessions();
    const snapshot = sessionToSnapshot(session);
    const idx = list.findIndex((s) => s.id === snapshot.id);
    const next = [...list];
    if (idx >= 0) next[idx] = snapshot;
    else next.unshift(snapshot);
    return writeSavedSessions(next);
  });
}

/**
 * If this session id is already saved, overwrite that snapshot with the latest
 * captured capsule. Returns false when the id is not in the library (does not
 * create a new save).
 */
export async function refreshSavedSession(session: Session): Promise<boolean> {
  return enqueueMutation(async () => {
    const list = await readSavedSessions();
    const idx = list.findIndex((s) => s.id === session.id);
    if (idx < 0) return false;
    const next = [...list];
    next[idx] = sessionToSnapshot(session);
    await writeSavedSessions(next);
    return true;
  });
}

export async function deleteSavedSession(id: string): Promise<void> {
  return enqueueMutation(async () => {
    const list = (await readSavedSessions()).filter((s) => s.id !== id);
    await browser.storage.local.set({ [SAVED_SESSIONS_KEY]: list });
  });
}

function savedPdfUrl(id: string, mode: 'view' | 'print' | 'download'): string {
  const runtime = browser.runtime as typeof browser.runtime & {
    getURL: (path: string) => string;
  };
  const url = new URL(runtime.getURL('/saved-pdf.html'));
  url.searchParams.set('id', id);
  url.searchParams.set('mode', mode);
  return url.href;
}

/**
 * Start a file download of the saved report in the current document.
 * Does not open Gemini or the print dialog.
 */
export async function downloadSavedSessionPdf(id: string): Promise<PdfExportResult> {
  const snapshot = await getSavedSession(id);
  if (!snapshot) return { ok: false, method: 'failed' };

  try {
    const session = snapshotToSession(snapshot);
    const html = await renderSessionReportHtml(session);
    downloadTextFile(html, `${reportFilename(session)}.html`);
    return { ok: true, method: 'download' };
  } catch {
    return { ok: false, method: 'failed' };
  }
}

/** Open the saved report in another tab without auto-print or auto-download. */
export async function openSavedSessionPdf(id: string): Promise<PdfExportResult> {
  const snapshot = await getSavedSession(id);
  if (!snapshot) return { ok: false, method: 'failed' };

  try {
    await browser.tabs.create({ url: savedPdfUrl(id, 'view'), active: true });
    return { ok: true, method: 'view' };
  } catch {
    return { ok: false, method: 'failed' };
  }
}

/** Print a saved snapshot in the current page (panel export path). */
export async function printSavedSessionPdf(id: string): Promise<PdfExportResult> {
  const snapshot = await getSavedSession(id);
  if (!snapshot) return { ok: false, method: 'failed' };
  return exportSessionPdf(snapshotToSession(snapshot));
}

export async function isSessionSaved(id: string): Promise<boolean> {
  return (await getSavedSessions()).some((s) => s.id === id);
}
