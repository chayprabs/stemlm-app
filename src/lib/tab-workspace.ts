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

export interface TabWorkspaceBackup {
  tabId: number;
  sessions: Session[];
  activeSessionId?: string;
  activeStepIndex: number;
  savedAt: number;
}

export interface PendingPanelAction {
  tabId: number;
  type:
    | 'stemlm:open-panel'
    | 'stemlm:load-conversation'
    | 'stemlm:ask-here'
    | 'stemlm:open-saved-library'
    | 'stemlm:open-settings';
}

type TabWorkspaceMap = Record<string, TabWorkspaceBackup>;

function pendingActionKey(tabId: number): string {
  return `stemlm_pending_action_${tabId}`;
}

function pendingResultKey(tabId: number): string {
  return `stemlm_pending_result_${tabId}`;
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
  state: Pick<StoreState, 'sessions' | 'activeSessionId' | 'activeStepIndex'>,
): TabWorkspaceBackup {
  return {
    tabId,
    sessions: sessionsForMirror(state.sessions),
    activeSessionId: state.activeSessionId,
    activeStepIndex: state.activeStepIndex,
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

export async function saveTabWorkspace(backup: TabWorkspaceBackup): Promise<void> {
  try {
    const map = await migrateLegacyWorkspace(await readWorkspaceMap());
    map[String(backup.tabId)] = backup;
    await browser.storage.session.set({ [WORKSPACE_MAP_KEY]: map });
  } catch {
    /* session storage may be unavailable */
  }
}

export async function loadTabWorkspace(tabId: number): Promise<TabWorkspaceBackup | null> {
  try {
    const map = await migrateLegacyWorkspace(await readWorkspaceMap());
    const data = map[String(tabId)];
    if (!data || !Array.isArray(data.sessions)) return null;
    return data;
  } catch {
    return null;
  }
}

export async function setPendingPanelAction(action: PendingPanelAction): Promise<void> {
  try {
    await browser.storage.session.set({ [pendingActionKey(action.tabId)]: action.type });
  } catch {
    /* ignore */
  }
}

export async function takePendingPanelAction(tabId: number): Promise<PendingPanelAction['type'] | null> {
  try {
    const key = pendingActionKey(tabId);
    const data = (await browser.storage.session.get(key))[key] as PendingPanelAction['type'] | undefined;
    if (!data) return null;
    await browser.storage.session.remove(key);
    return data;
  } catch {
    return null;
  }
}

export async function setPanelActionResult(tabId: number, result: PanelActionResult): Promise<void> {
  try {
    await browser.storage.session.set({ [pendingResultKey(tabId)]: result });
  } catch {
    /* ignore */
  }
}

export async function takePanelActionResult(tabId: number): Promise<PanelActionResult | null> {
  try {
    const key = pendingResultKey(tabId);
    const data = (await browser.storage.session.get(key))[key] as PanelActionResult | undefined;
    if (!data || typeof data.ok !== 'boolean') return null;
    await browser.storage.session.remove(key);
    return data;
  } catch {
    return null;
  }
}
