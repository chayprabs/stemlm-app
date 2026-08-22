import { describe, it, expect, vi, beforeEach } from 'vitest';

const { setIcon, sendMessage } = vi.hoisted(() => ({
  setIcon: vi.fn(async () => undefined),
  sendMessage: vi.fn(async () => undefined),
}));

vi.mock('wxt/browser', () => ({
  browser: {
    action: { setIcon },
    runtime: { sendMessage },
  },
}));

import {
  applyToolbarIcon,
  applyToolbarIconInBackground,
  isToolbarIconMessage,
  SET_TOOLBAR_ICON,
  toolbarIconPaths,
} from './toolbar-icon';

describe('toolbar icons', () => {
  beforeEach(() => {
    setIcon.mockClear();
    sendMessage.mockClear();
    setIcon.mockResolvedValue(undefined);
  });

  it('maps OS light to dark glyphs and OS dark to light glyphs', () => {
    expect(toolbarIconPaths('light')['16']).toBe('icon/dark-16.png');
    expect(toolbarIconPaths('dark')['32']).toBe('icon/light-32.png');
    expect(Object.keys(toolbarIconPaths('light'))).toEqual(['16', '32', '48', '128']);
  });

  it('accepts only the toolbar-icon message', () => {
    expect(isToolbarIconMessage({ type: SET_TOOLBAR_ICON, theme: 'dark' })).toBe(true);
    expect(isToolbarIconMessage({ type: SET_TOOLBAR_ICON, theme: 'nope' })).toBe(false);
    expect(isToolbarIconMessage({ type: 'stemlm:open-panel' })).toBe(false);
  });

  it('setIcon from extension pages does not message the background', async () => {
    await applyToolbarIcon('dark');
    expect(setIcon).toHaveBeenCalledWith({ path: toolbarIconPaths('dark') });
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('falls back to a background message when setIcon is unavailable', async () => {
    setIcon.mockRejectedValueOnce(new Error('no action'));
    await applyToolbarIcon('light');
    expect(sendMessage).toHaveBeenCalledWith({ type: SET_TOOLBAR_ICON, theme: 'light' });
  });

  it('background apply never sendMessages', async () => {
    setIcon.mockRejectedValueOnce(new Error('fail'));
    await applyToolbarIconInBackground('dark');
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
