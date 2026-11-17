/**
 * Per-tab workspace backup in storage.session.
 *
 * Keeps sessions + navigation state so a Gemini tab can reopen the study panel
 * after a content-script reconnect or automatic tab reload from the popup.
 * Each tab id gets its own slot so multiple Gemini tabs do not clobber each other.
 */
import { browser } from 'wxt/browser';
import type { Session } from '@/src/protocol/types';
import type { StoreState } from '@/src/state/store';
import { sessionsForMirror } from '@/src/lib/session-sync';

const WORKSPACE_MAP_KEY = 'stemlm_tab_workspaces';
/** Legacy single-slot key from older builds — migrated on read. */
const LEGACY_WORKSPACE_KEY = 'stemlm_tab_workspace';
/** New writes are per-tab so independent content scripts cannot lose updates by replacing a map. */
const TAB_WORKSPACE_PREFIX = 'stemlm_tab_workspace_';

export interface TabWorkspaceBackup {
  tabId: number;
  sessions: Session[];
  activeSessionId?: string;
  activeStepIndex: number;
  /** The panel was open: it opens again on the restored answer after a reload. */
  panelOpen?: boolean;
  savedAt: number;
}

export interface PendingPanelAction {
  tabId: number;
  type:
    | 'stemlm:open-panel'
    | 'stemlm:load-conversation'
    | 'stemlm:ask-here';
}

type TabWorkspaceMap = Record<string, TabWorkspaceBackup>;

function pendingActionKey(tabId: number): string {
  return `stemlm_pending_action_${tabId}`;
}

function pendingResultKey(tabId: number): string {
  return `stemlm_pending_result_${tabId}`;
}

function tabWorkspaceKey(tabId: number): string {
  return `${TAB_WORKSPACE_PREFIX}${tabId}`;
}

export interface PanelActionResult {
  ok: boolean;
  loaded?: number;
}

export const WHOAMI_TYPE = 'stemlm:whoami' as const;

export function isWhoamiMessage(msg: unknown): msg is { type: typeof WHOAMI_TYPE } {
  return !!msg && typeof msg === 'object' && (msg as { type?: unknown }).type === WHOAMI_TYPE;
}

/** Background reply: content scripts have no chrome.tabs, so tab id comes from sender.tab. */
export function handleWhoamiRequest(sender: { tab?: { id?: number } }): { tabId?: number } {
  const tabId = sender.tab?.id;
  return typeof tabId === 'number' ? { tabId } : {};
}

export async function getContentTabId(): Promise<number | undefined> {
  try {
    const res = (await browser.runtime.sendMessage({ type: WHOAMI_TYPE })) as
      | { tabId?: unknown }
      | undefined;
    if (typeof res?.tabId === 'number') return res.tabId;
  } catch {
    /* background asleep / tests without a whoami handler */
  }
  return undefined;
}

export function workspaceFromStore(
  tabId: number,
  state: Pick<StoreState, 'sessions' | 'activeSessionId' | 'activeStepIndex'> & { panelOpen?: boolean },
): TabWorkspaceBackup {
  return {
    tabId,
    sessions: sessionsForMirror(state.sessions),
    activeSessionId: state.activeSessionId,
    activeStepIndex: state.activeStepIndex,
    panelOpen: Boolean(state.panelOpen),
    savedAt: Date.now(),
  };
}

async function readWorkspaceMap(): Promise<TabWorkspaceMap> {
  try {
    const data = (await browser.storage.session.get(WORKSPACE_MAP_KEY))[WORKSPACE_MAP_KEY] as
      | TabWorkspaceMap
      | undefined;
    return data && typeof data === 'object' ? { ...data } : {};
  } catch {
    return {};
  }
}

async function migrateLegacyWorkspace(map: TabWorkspaceMap): Promise<TabWorkspaceMap> {
  if (Object.keys(map).length > 0) return map;
  try {
    const legacy = (await browser.storage.session.get(LEGACY_WORKSPACE_KEY))[LEGACY_WORKSPACE_KEY] as
      | TabWorkspaceBackup
      | undefined;
    if (legacy && typeof legacy.tabId === 'number' && Array.isArray(legacy.sessions)) {
      map[String(legacy.tabId)] = legacy;
      await browser.storage.session.remove(LEGACY_WORKSPACE_KEY);
    }
  } catch {
    /* ignore */
  }
  return map;
}

export async function saveTabWorkspace(backup: TabWorkspaceBackup): Promise<boolean> {
  return serializeStorageOperation(async () => {
    try {
      // A single aggregate map makes two tabs race on read/modify/write. A
      // per-tab record gives each writer an independent storage key while the
      // legacy aggregate remains readable for old installations. Do not let a
      // delayed older content-script snapshot roll back a newer cursor.
      const key = tabWorkspaceKey(backup.tabId);
      const current = (await browser.storage.session.get(key))[key] as TabWorkspaceBackup | undefined;
      if (current && typeof current.savedAt === 'number' && current.savedAt > backup.savedAt) return true;
      await browser.storage.session.set({ [key]: backup });
      return true;
    } catch {
      return false;
    }
  });
}

/** Closed tabs no longer need session-scoped recovery data. */
export async function removeTabWorkspace(tabId: number): Promise<void> {
  return serializeStorageOperation(async () => {
    try {
      for (const key of [tabWorkspaceKey(tabId), pendingActionKey(tabId), pendingResultKey(tabId)]) {
        await browser.storage.session.remove(key);
      }
      const map = await readWorkspaceMap();
      if (Object.hasOwn(map, String(tabId))) {
        delete map[String(tabId)];
        await browser.storage.session.set({ [WORKSPACE_MAP_KEY]: map });
      }
      const legacy = (await browser.storage.session.get(LEGACY_WORKSPACE_KEY))[LEGACY_WORKSPACE_KEY] as TabWorkspaceBackup | undefined;
      if (legacy?.tabId === tabId) await browser.storage.session.remove(LEGACY_WORKSPACE_KEY);
    } catch {
      /* Closing a tab must remain safe when session storage is unavailable. */
    }
  });
}

export async function loadTabWorkspace(tabId: number): Promise<TabWorkspaceBackup | null> {
  try {
    const own = (await browser.storage.session.get(tabWorkspaceKey(tabId)))[tabWorkspaceKey(tabId)] as
      | TabWorkspaceBackup
      | undefined;
    if (own && typeof own.tabId === 'number' && Array.isArray(own.sessions)) return own;

    // Fall back to the aggregate and migrate this tab lazily. This keeps
    // workspaces from versions that predate per-tab keys available after update.
    const map = await migrateLegacyWorkspace(await readWorkspaceMap());
    const data = map[String(tabId)];
    if (!data || !Array.isArray(data.sessions)) return null;
    await browser.storage.session.set({ [tabWorkspaceKey(tabId)]: data });
    return data;
  } catch {
    return null;
  }
}

// Chrome's storage API has no compare-and-delete primitive. A content script
// has one consumer for its tab, but duplicate boot/recovery paths can still
// overlap in that context. Serialize get/remove pairs so an action is claimed
// once instead of being observed twice before either remove completes.
let pendingStorageOperation: Promise<void> = Promise.resolve();

function serializeStorageOperation<T>(operation: () => Promise<T>): Promise<T> {
  const run = pendingStorageOperation.then(operation);
  pendingStorageOperation = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function setPendingPanelAction(action: PendingPanelAction, onlyIfAbsent = false): Promise<void> {
  return serializeStorageOperation(async () => {
    try {
      if (onlyIfAbsent && (await browser.storage.session.get(pendingActionKey(action.tabId)))[pendingActionKey(action.tabId)]) return;
      await browser.storage.session.set({ [pendingActionKey(action.tabId)]: action.type });
    } catch {
      /* ignore */
    }
  });
}

export async function takePendingPanelAction(tabId: number, remote = false): Promise<PendingPanelAction['type'] | null> {
  if (remote) {
    try {
      const result = await browser.runtime.sendMessage({ type: 'stemlm:claim-panel-action' }) as
        { action?: PendingPanelAction['type'] | null } | undefined;
      return result?.action ?? null;
    } catch {
      return null;
    }
  }
  return serializeStorageOperation(async () => {
    try {
      const key = pendingActionKey(tabId);
      const data = (await browser.storage.session.get(key))[key] as PendingPanelAction['type'] | undefined;
      if (!data) return null;
      await browser.storage.session.remove(key);
      return data;
    } catch {
      return null;
    }
  });
}

export async function setPanelActionResult(tabId: number, result: PanelActionResult): Promise<void> {
  return serializeStorageOperation(async () => {
    try {
      await browser.storage.session.set({ [pendingResultKey(tabId)]: result });
    } catch {
      /* ignore */
    }
  });
}

export async function takePanelActionResult(tabId: number): Promise<PanelActionResult | null> {
  return serializeStorageOperation(async () => {
    try {
      const key = pendingResultKey(tabId);
      const data = (await browser.storage.session.get(key))[key] as PanelActionResult | undefined;
      if (!data || typeof data.ok !== 'boolean') return null;
      await browser.storage.session.remove(key);
      return data;
    } catch {
      return null;
    }
  });
}
