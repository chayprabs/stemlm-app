/**
 * Per-tab workspace backup in storage.session.
 *
 * Keeps sessions + navigation state so a Gemini tab can reopen the study panel
 * after a content-script reconnect or automatic tab reload from the popup.
 */
import { browser } from 'wxt/browser';
import type { Session } from '@/src/protocol/types';
import type { StoreState } from '@/src/state/store';
import { sessionsForMirror } from '@/src/lib/session-sync';

const WORKSPACE_KEY = 'stemlm_tab_workspace';
const PENDING_KEY = 'stemlm_pending_action';

export interface TabWorkspaceBackup {
  tabId: number;
  sessions: Session[];
  activeSessionId?: string;
  activeStepIndex: number;
  savedAt: number;
}

export interface PendingPanelAction {
  tabId: number;
  type: 'stemlm:open-panel' | 'stemlm:load-conversation';
}

export async function getContentTabId(): Promise<number | undefined> {
  try {
    const tab = await browser.tabs.getCurrent();
    return tab?.id;
  } catch {
    return undefined;
  }
}

export function workspaceFromStore(tabId: number, state: Pick<StoreState, 'sessions' | 'activeSessionId' | 'activeStepIndex'>): TabWorkspaceBackup {
  return {
    tabId,
    sessions: sessionsForMirror(state.sessions),
    activeSessionId: state.activeSessionId,
    activeStepIndex: state.activeStepIndex,
    savedAt: Date.now(),
  };
}

export async function saveTabWorkspace(backup: TabWorkspaceBackup): Promise<void> {
  try {
    await browser.storage.session.set({ [WORKSPACE_KEY]: backup });
  } catch {
    /* session storage may be unavailable */
  }
}

export async function loadTabWorkspace(tabId: number): Promise<TabWorkspaceBackup | null> {
  try {
    const data = (await browser.storage.session.get(WORKSPACE_KEY))[WORKSPACE_KEY] as
      | TabWorkspaceBackup
      | undefined;
    if (!data || data.tabId !== tabId || !Array.isArray(data.sessions)) return null;
    return data;
  } catch {
    return null;
  }
}

export async function setPendingPanelAction(action: PendingPanelAction): Promise<void> {
  try {
    await browser.storage.session.set({ [PENDING_KEY]: action });
  } catch {
    /* ignore */
  }
}

export async function takePendingPanelAction(tabId: number): Promise<PendingPanelAction['type'] | null> {
  try {
    const data = (await browser.storage.session.get(PENDING_KEY))[PENDING_KEY] as
      | PendingPanelAction
      | undefined;
    if (!data || data.tabId !== tabId) return null;
    await browser.storage.session.remove(PENDING_KEY);
    return data.type;
  } catch {
    return null;
  }
}
