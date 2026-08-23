import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GEMINI_APP_URL } from './tab-bridge';
import { WHOAMI_TYPE } from './tab-workspace';

const sessionStore = new Map<string, unknown>();
let sendMessageImpl: (tabId: number, msg: unknown) => Promise<unknown> = async () => ({ ok: true });
const order: string[] = [];

const tabs = vi.hoisted(() => ({
  query: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  sendMessage: vi.fn(),
  reload: vi.fn(),
  get: vi.fn(),
  getCurrent: vi.fn(async () => undefined),
}));

const runtimeSend = vi.hoisted(() => vi.fn());

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      id: 'test',
      sendMessage: runtimeSend,
    },
    tabs: {
      query: tabs.query,
      create: tabs.create,
      update: tabs.update,
      sendMessage: tabs.sendMessage,
      reload: tabs.reload,
      get: tabs.get,
      getCurrent: tabs.getCurrent,
      onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
    },
    windows: { update: vi.fn(async () => undefined) },
    storage: {
      local: { get: vi.fn(async () => ({})), set: vi.fn(async () => undefined) },
      session: {
        get: vi.fn(async (key: string) => {
          const value = sessionStore.get(key);
          return value === undefined ? {} : { [key]: value };
        }),
        set: vi.fn(async (data: Record<string, unknown>) => {
          for (const [k, v] of Object.entries(data)) {
            sessionStore.set(k, v);
            if (k.startsWith('stemlm_pending_action_')) order.push(`pending:${String(v)}`);
          }
        }),
        remove: vi.fn(async (key: string) => {
          sessionStore.delete(key);
        }),
      },
    },
  },
}));

vi.mock('@/src/lib/analytics', () => ({
  trackEvent: vi.fn(async () => undefined),
}));

import {
  BACKGROUND_LAUNCH,
  enqueueBackgroundLaunch,
  isBackgroundLaunchMessage,
  performBackgroundLaunch,
} from './background-launch';
import {
  getContentTabId,
  handleWhoamiRequest,
  isWhoamiMessage,
} from './tab-workspace';
import { consumePendingPanelAction } from './panel-remote';
import { useStore } from '@/src/state/store';

describe('background launch + pending recovery', () => {
  beforeEach(() => {
    sessionStore.clear();
    order.length = 0;
    sendMessageImpl = async () => ({ ok: true });
    tabs.create.mockClear();
    tabs.update.mockClear();
    tabs.sendMessage.mockClear();
    tabs.reload.mockClear();
    runtimeSend.mockClear();
    tabs.create.mockImplementation(async (info: { url?: string; active?: boolean }) => {
      order.push(`create:${String(info.active)}`);
      return { id: 55, url: info.url };
    });
    tabs.update.mockImplementation(async (id: number, info?: { active?: boolean }) => {
      order.push(`update:${String(info?.active)}`);
      return { id, url: GEMINI_APP_URL };
    });
    tabs.sendMessage.mockImplementation(async (tabId: number, msg: unknown) =>
      sendMessageImpl(tabId, msg),
    );
    tabs.reload.mockResolvedValue(undefined);
    tabs.get.mockResolvedValue({ id: 55, url: GEMINI_APP_URL, status: 'complete' });
    tabs.getCurrent.mockResolvedValue(undefined);
    tabs.query.mockResolvedValue([]);
    runtimeSend.mockImplementation(async (msg: unknown) => {
      if (isWhoamiMessage(msg)) return handleWhoamiRequest({ tab: { id: 55 } });
      return undefined;
    });
    useStore.setState({
      panelOpen: false,
      savedLibraryOpen: false,
      buttonInjected: false,
      sessions: [],
      status: 'idle',
    });
  });

  it('recognizes background launch messages', () => {
    expect(isBackgroundLaunchMessage({ type: BACKGROUND_LAUNCH, kind: 'start-new' })).toBe(true);
    expect(
      isBackgroundLaunchMessage({
        type: BACKGROUND_LAUNCH,
        kind: 'open-last',
        url: 'https://gemini.google.com/app/x',
      }),
    ).toBe(true);
    expect(isBackgroundLaunchMessage({ type: BACKGROUND_LAUNCH, kind: 'open-last' })).toBe(false);
    expect(isBackgroundLaunchMessage({ type: 'stemlm:open-panel' })).toBe(false);
  });

  it('Start new creates an inactive tab, arms pending, then focuses', async () => {
    await performBackgroundLaunch({ type: BACKGROUND_LAUNCH, kind: 'start-new' });
    expect(tabs.create).toHaveBeenCalledWith({ url: GEMINI_APP_URL, active: false });
    expect(order[0]).toBe('create:false');
    expect(order).toContain('pending:stemlm:open-panel');
    expect(order.indexOf('pending:stemlm:open-panel')).toBeLessThan(order.indexOf('update:true'));
    expect(tabs.update).toHaveBeenCalledWith(55, { active: true });
    expect(tabs.sendMessage).toHaveBeenCalledWith(55, { type: 'stemlm:open-panel' });
  });

  it('getContentTabId uses sender.tab.id, not tabs.getCurrent', async () => {
    expect(isWhoamiMessage({ type: WHOAMI_TYPE })).toBe(true);
    expect(handleWhoamiRequest({ tab: { id: 55 } })).toEqual({ tabId: 55 });
    expect(handleWhoamiRequest({})).toEqual({});
    const id = await getContentTabId();
    expect(id).toBe(55);
    expect(runtimeSend).toHaveBeenCalledWith({ type: WHOAMI_TYPE });
    expect(tabs.getCurrent).not.toHaveBeenCalled();
  });

  it('first sendMessage no-receiver, then content script with a real tab id consumes pending and opens the panel', async () => {
    sendMessageImpl = async (_tabId, msg) => {
      const type = (msg as { type?: string }).type;
      if (type === 'stemlm:ping') return { ok: true };
      throw new Error('Could not establish connection. Receiving end does not exist.');
    };

    const launch = performBackgroundLaunch({ type: BACKGROUND_LAUNCH, kind: 'start-new' });
    await new Promise((r) => setTimeout(r, 40));

    expect(sessionStore.get('stemlm_pending_action_55')).toBe('stemlm:open-panel');
    expect(await tabs.getCurrent()).toBeUndefined();

    const tabId = await getContentTabId();
    expect(tabId).toBe(55);
    expect(tabId).not.toBeUndefined();

    const consumed = await consumePendingPanelAction(tabId!, 'gemini');
    expect(consumed).toEqual({ ok: true });
    expect(useStore.getState().panelOpen).toBe(true);
    expect(sessionStore.get('stemlm_pending_action_55')).toBeUndefined();

    const res = await launch;
    expect(res.ok).not.toBe(false);
  });

  it('Open last opens the stored URL inactive, arms load-conversation, then focuses', async () => {
    await performBackgroundLaunch({
      type: BACKGROUND_LAUNCH,
      kind: 'open-last',
      url: 'https://gemini.google.com/app/keep',
    });
    expect(tabs.create).toHaveBeenCalledWith({
      url: 'https://gemini.google.com/app/keep',
      active: false,
    });
    expect(order).toContain('pending:stemlm:load-conversation');
    expect(order.indexOf('pending:stemlm:load-conversation')).toBeLessThan(
      order.indexOf('update:true'),
    );
    expect(tabs.sendMessage).toHaveBeenCalledWith(55, { type: 'stemlm:load-conversation' });
  });

  it('enqueue falls back to a local launch when the SW does not ACK', async () => {
    runtimeSend.mockRejectedValueOnce(new Error('no sw'));
    await enqueueBackgroundLaunch({ type: BACKGROUND_LAUNCH, kind: 'start-new' });
    expect(tabs.create).toHaveBeenCalledWith({ url: GEMINI_APP_URL, active: false });
  });

  it('enqueue does not double-run when the SW ACKs queued', async () => {
    runtimeSend.mockResolvedValueOnce({ ok: true, queued: true });
    await enqueueBackgroundLaunch({ type: BACKGROUND_LAUNCH, kind: 'start-new' });
    expect(tabs.create).not.toHaveBeenCalled();
  });
});
