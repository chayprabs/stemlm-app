/**
 * Persistence for explicitly-saved study sessions. Each save stores only the
 * question + full solution (matching the PDF export) in storage.local — not
 * the step cards. Clicking a saved item in the popup downloads/prints the PDF.
 */
import { browser } from 'wxt/browser';
import type { CapsuleMeta, Diagram, Session } from '@/src/protocol/types';
import { exportSessionPdf, type PdfExportResult } from './pdf';
import { StorageQuotaError, isStorageQuotaError } from './storage-errors';

export const SAVED_SESSIONS_KEY = 'stemlm_saved_sessions';
const MAX_SAVED = 100;

/** Compact record kept in browser storage — question + solution only. */
export interface SavedSessionSnapshot {
  id: string;
  question: string;
  savedAt: number;
  platform: 'gemini';
  meta: CapsuleMeta;
  solution: string;
  solutionDiagrams: Diagram[];
}

function sortByRecent(sessions: SavedSessionSnapshot[]): SavedSessionSnapshot[] {
  return [...sessions].sort((a, b) => b.savedAt - a.savedAt);
}

export function sessionToSnapshot(session: Session): SavedSessionSnapshot {
  const question = (session.question || session.capsule.meta.topic || '').trim();
  return {
    id: session.id,
    question,
    savedAt: Date.now(),
    platform: 'gemini',
    meta: session.capsule.meta,
    solution: session.capsule.solution,
    solutionDiagrams: session.capsule.solutionDiagrams,
  };
}

/** Rebuild a minimal Session for PDF rendering (no steps). */
export function snapshotToSession(snapshot: SavedSessionSnapshot): Session {
  return {
    id: snapshot.id,
    createdAt: snapshot.savedAt,
    updatedAt: snapshot.savedAt,
    platform: snapshot.platform,
    question: snapshot.question,
    raw: '',
    reviewedStepIds: [],
    capsule: {
      meta: snapshot.meta,
      steps: [],
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
  return (d.type === 'svg' || d.type === 'mermaid') && typeof d.content === 'string';
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
      platform: 'gemini',
      meta: o.meta,
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

export async function saveSession(session: Session): Promise<void> {
  const list = await readSavedSessions();
  const snapshot = sessionToSnapshot(session);
  const idx = list.findIndex((s) => s.id === snapshot.id);
  const next = [...list];
  if (idx >= 0) next[idx] = snapshot;
  else next.unshift(snapshot);
  try {
    await browser.storage.local.set({
      [SAVED_SESSIONS_KEY]: sortByRecent(next).slice(0, MAX_SAVED),
    });
  } catch (err) {
    if (isStorageQuotaError(err)) throw new StorageQuotaError();
    throw err;
  }
}

export async function deleteSavedSession(id: string): Promise<void> {
  const list = (await readSavedSessions()).filter((s) => s.id !== id);
  await browser.storage.local.set({ [SAVED_SESSIONS_KEY]: list });
}

/**
 * Open the system print / Save-as-PDF dialog for a saved snapshot.
 * Uses a dedicated extension tab — the popup cannot host a reliable print iframe.
 */
export async function downloadSavedSessionPdf(id: string): Promise<PdfExportResult> {
  const snapshot = await getSavedSession(id);
  if (!snapshot) return { ok: false, method: 'failed' };

  try {
    const url = new URL(browser.runtime.getURL('/saved-pdf.html'));
    url.searchParams.set('id', id);
    await browser.tabs.create({ url: url.href, active: true });
    return { ok: true, method: 'print' };
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
