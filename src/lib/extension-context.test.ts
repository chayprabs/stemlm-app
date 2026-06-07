import { describe, it, expect, vi } from 'vitest';

const { getUrlMock } = vi.hoisted(() => ({
  getUrlMock: vi.fn((path: string) => `chrome-extension://test/${path}`),
}));

let runtimeId = 'test-extension-id';

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      get id() {
        return runtimeId;
      },
      getURL: getUrlMock,
    },
  },
}));

import {
  extensionAssetUrl,
  isExtensionContextInvalidatedError,
  isExtensionContextValid,
} from './extension-context';

describe('isExtensionContextInvalidatedError', () => {
  it('detects the Chrome extension reload error', () => {
    expect(isExtensionContextInvalidatedError(new Error('Extension context invalidated.'))).toBe(true);
    expect(isExtensionContextInvalidatedError(new Error('other'))).toBe(false);
  });
});

describe('extensionAssetUrl', () => {
  it('returns getURL when the runtime is live', () => {
    getUrlMock.mockReturnValueOnce('chrome-extension://abc/icon/32.png');
    expect(extensionAssetUrl('icon/32.png')).toBe('chrome-extension://abc/icon/32.png');
  });

  it('falls back to the path when getURL throws', () => {
    getUrlMock.mockImplementationOnce(() => {
      throw new Error('Extension context invalidated.');
    });
    expect(extensionAssetUrl('icon/32.png')).toBe('icon/32.png');
  });

  it('reports invalid context when runtime.id is missing', () => {
    const prev = runtimeId;
    runtimeId = '';
    expect(isExtensionContextValid()).toBe(false);
    expect(extensionAssetUrl('icon/16.png')).toBe('icon/16.png');
    runtimeId = prev;
  });
});
